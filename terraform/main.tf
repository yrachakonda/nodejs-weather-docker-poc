terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.13"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.32"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  cluster_name    = "${var.project_name}-${var.environment}"
  api_domain_name = coalesce(var.api_domain_name, "api.${var.domain_name}")
  api_nlb_name    = "${var.project_name}-${var.environment}-api-nlb"
  api_service_annotations = {
    "service.beta.kubernetes.io/aws-load-balancer-healthcheck-path"     = "/api/v1/system/health"
    "service.beta.kubernetes.io/aws-load-balancer-healthcheck-port"     = "8080"
    "service.beta.kubernetes.io/aws-load-balancer-healthcheck-protocol" = "HTTP"
    "service.beta.kubernetes.io/aws-load-balancer-name"                 = local.api_nlb_name
    "service.beta.kubernetes.io/aws-load-balancer-nlb-target-type"      = "ip"
    "service.beta.kubernetes.io/aws-load-balancer-scheme"               = "internal"
    "service.beta.kubernetes.io/aws-load-balancer-subnets"              = join(",", module.networking.private_subnet_ids)
    "service.beta.kubernetes.io/aws-load-balancer-type"                 = "external"
  }
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

module "networking" {
  source = "./modules/networking"

  cluster_name = local.cluster_name
  kms_key_arn  = module.logging.kms_key_arn
  name         = local.cluster_name
  tags         = local.common_tags
  vpc_cidr     = var.vpc_cidr
}

module "ecr" {
  source = "./modules/ecr"

  project_name = local.cluster_name
}

module "logging" {
  source = "./modules/logging"

  project_name = local.cluster_name
}

module "secrets" {
  source = "./modules/secrets"

  project_name = local.cluster_name
}

module "eks" {
  source = "./modules/eks"

  cluster_name       = local.cluster_name
  desired_node_count = var.desired_node_count
  kms_key_arn        = module.logging.kms_key_arn
  private_subnet_ids = module.networking.private_subnet_ids
  project_name       = var.project_name
  public_subnet_ids  = module.networking.public_subnet_ids
  tags               = local.common_tags
  vpc_cidr           = var.vpc_cidr
  vpc_id             = module.networking.vpc_id
}

data "aws_eks_cluster_auth" "this" {
  name = module.eks.cluster_name
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  token                  = data.aws_eks_cluster_auth.this.token
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    token                  = data.aws_eks_cluster_auth.this.token
  }
}

resource "aws_iam_policy" "aws_load_balancer_controller" {
  name        = "${local.cluster_name}-aws-load-balancer-controller"
  description = "Permissions for the AWS Load Balancer Controller"
  policy      = file("${path.module}/policies/aws-load-balancer-controller.json")

  tags = local.common_tags
}

data "aws_iam_policy_document" "aws_load_balancer_controller_assume_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    condition {
      test     = "StringEquals"
      variable = "${replace(module.eks.oidc_provider_url, "https://", "")}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "${replace(module.eks.oidc_provider_url, "https://", "")}:sub"
      values   = ["system:serviceaccount:kube-system:aws-load-balancer-controller"]
    }

    principals {
      identifiers = [module.eks.oidc_provider_arn]
      type        = "Federated"
    }
  }
}

resource "aws_iam_role" "aws_load_balancer_controller" {
  name               = "${local.cluster_name}-aws-load-balancer-controller"
  assume_role_policy = data.aws_iam_policy_document.aws_load_balancer_controller_assume_role.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "aws_load_balancer_controller" {
  policy_arn = aws_iam_policy.aws_load_balancer_controller.arn
  role       = aws_iam_role.aws_load_balancer_controller.name
}

resource "kubernetes_namespace" "app" {
  metadata {
    name = var.kubernetes_namespace
  }
}

resource "kubernetes_namespace" "observability" {
  metadata {
    name = var.observability_namespace
  }
}

resource "kubernetes_service_account" "aws_load_balancer_controller" {
  metadata {
    name      = "aws-load-balancer-controller"
    namespace = "kube-system"
    annotations = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.aws_load_balancer_controller.arn
    }
    labels = {
      "app.kubernetes.io/name" = "aws-load-balancer-controller"
    }
  }
}

resource "helm_release" "aws_load_balancer_controller" {
  name       = "aws-load-balancer-controller"
  namespace  = "kube-system"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  version    = var.aws_load_balancer_controller_chart_version

  depends_on = [
    kubernetes_service_account.aws_load_balancer_controller
  ]

  set {
    name  = "clusterName"
    value = module.eks.cluster_name
  }

  set {
    name  = "region"
    value = var.aws_region
  }

  set {
    name  = "vpcId"
    value = module.networking.vpc_id
  }

  set {
    name  = "serviceAccount.create"
    value = "false"
  }

  set {
    name  = "serviceAccount.name"
    value = "aws-load-balancer-controller"
  }
}

module "observability" {
  source = "./modules/observability"

  app_namespace                 = kubernetes_namespace.app.metadata[0].name
  aws_region                    = var.aws_region
  cluster_name                  = local.cluster_name
  cloudwatch_log_retention_days = var.cloudwatch_log_retention_days
  eck_operator_chart_version    = var.eck_operator_chart_version
  eck_stack_chart_version       = var.eck_stack_chart_version
  elastic_stack_version         = var.elastic_stack_version
  elasticsearch_storage_size    = var.elasticsearch_storage_size
  eks_oidc_provider_arn         = module.eks.oidc_provider_arn
  eks_oidc_provider_url         = module.eks.oidc_provider_url
  fluent_bit_chart_version      = var.fluent_bit_chart_version
  kafka_retention_hours         = var.kafka_retention_hours
  kafka_storage_size            = var.kafka_storage_size
  kafka_topic_name              = var.kafka_topic_name
  kafka_version                 = var.kafka_version
  kms_key_arn                   = module.logging.kms_key_arn
  kafbat_ui_chart_version       = var.kafbat_ui_chart_version
  observability_namespace       = kubernetes_namespace.observability.metadata[0].name
  project_name                  = var.project_name
  strimzi_chart_version         = var.strimzi_chart_version
  tags                          = local.common_tags

  depends_on = [
    kubernetes_namespace.observability
  ]
}

module "acm" {
  source = "./modules/acm"

  domain_name               = var.domain_name
  hosted_zone_id            = var.hosted_zone_id
  subject_alternative_names = distinct(concat(var.subject_alternative_names, [local.api_domain_name]))
  tags                      = local.common_tags
}

module "waf" {
  source = "./modules/waf"

  project_name = local.cluster_name
  tags         = local.common_tags
}

module "api_waf" {
  source = "./modules/waf"

  project_name = "${local.cluster_name}-api"
  tags         = local.common_tags
}

resource "helm_release" "weather_sim" {
  name             = "weather-sim"
  namespace        = kubernetes_namespace.app.metadata[0].name
  chart            = "${path.module}/../app/deployment/charts/weather-sim"
  create_namespace = false
  wait             = true

  depends_on = [
    helm_release.aws_load_balancer_controller,
    module.acm
  ]

  values = [
    yamlencode({
      namespace = kubernetes_namespace.app.metadata[0].name
      image = {
        api = "${module.ecr.api_repository_url}:latest"
        web = "${module.ecr.web_repository_url}:latest"
      }
      secrets = {
        sessionSecretName = module.secrets.session_secret_name
        apiKeySecretName  = module.secrets.api_keys_secret_name
      }
      ingress = {
        enabled = false
      }
      service = {
        apiAnnotations = local.api_service_annotations
      }
    })
  ]
}

resource "kubernetes_ingress_v1" "weather_sim_public" {
  metadata {
    name      = "weather-sim"
    namespace = kubernetes_namespace.app.metadata[0].name
    annotations = {
      "alb.ingress.kubernetes.io/certificate-arn"  = module.acm.certificate_arn
      "alb.ingress.kubernetes.io/healthcheck-path" = "/"
      "alb.ingress.kubernetes.io/listen-ports"     = "[{\"HTTP\":80},{\"HTTPS\":443}]"
      "alb.ingress.kubernetes.io/scheme"           = "internet-facing"
      "alb.ingress.kubernetes.io/ssl-redirect"     = "443"
      "alb.ingress.kubernetes.io/subnets"          = join(",", module.networking.public_subnet_ids)
      "alb.ingress.kubernetes.io/target-type"      = "ip"
      "alb.ingress.kubernetes.io/wafv2-acl-arn"    = module.waf.web_acl_arn
      "kubernetes.io/ingress.class"                = "alb"
    }
  }

  spec {
    ingress_class_name = "alb"

    rule {
      host = var.domain_name

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = "weather-sim-web"

              port {
                number = 80
              }
            }
          }
        }
      }
    }

    tls {
      hosts       = [var.domain_name]
      secret_name = ""
    }
  }

  depends_on = [
    helm_release.weather_sim,
    module.acm
  ]
}

data "kubernetes_ingress_v1" "weather_sim" {
  metadata {
    name      = kubernetes_ingress_v1.weather_sim_public.metadata[0].name
    namespace = kubernetes_ingress_v1.weather_sim_public.metadata[0].namespace
  }

  depends_on = [
    kubernetes_ingress_v1.weather_sim_public
  ]
}

module "api_edge" {
  source = "./modules/api_edge"

  access_log_retention_days = var.cloudwatch_log_retention_days
  api_domain_name           = local.api_domain_name
  certificate_arn           = module.acm.certificate_arn
  hosted_zone_id            = var.hosted_zone_id
  kms_key_arn               = module.logging.kms_key_arn
  nlb_name                  = local.api_nlb_name
  project_name              = local.cluster_name
  tags                      = local.common_tags
  waf_acl_arn               = module.api_waf.web_acl_arn

  depends_on = [
    helm_release.weather_sim,
    module.acm
  ]
}

module "dns" {
  source = "./modules/dns"

  alb_dns_name   = data.kubernetes_ingress_v1.weather_sim.status[0].load_balancer[0].ingress[0].hostname
  domain_name    = var.domain_name
  hosted_zone_id = var.hosted_zone_id
}
