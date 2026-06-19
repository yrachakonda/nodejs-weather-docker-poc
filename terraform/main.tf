terraform {
  required_version = ">= 1.14.8"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.40.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 3.1.1"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 3.0.1"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.2.1"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  cluster_name = "${var.project_name}-${var.environment}"
  api_service_annotations = {
    "alb.ingress.kubernetes.io/healthcheck-path" = "/api/v1/system/ready"
    "alb.ingress.kubernetes.io/healthcheck-port" = "8080"
    "alb.ingress.kubernetes.io/success-codes"    = "200"
    "alb.ingress.kubernetes.io/target-type"      = "ip"
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

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    command     = "aws"
  }
}

provider "helm" {
  kubernetes = {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    
    exec = {
      api_version = "client.authentication.k8s.io/v1beta1"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
      command     = "aws"
    }
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

resource "kubernetes_namespace_v1" "app" {
  metadata {
    name = var.kubernetes_namespace
  }
}

resource "kubernetes_namespace_v1" "observability" {
  metadata {
    name = var.observability_namespace
  }
}

resource "kubernetes_service_account_v1" "aws_load_balancer_controller" {
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
    kubernetes_service_account_v1.aws_load_balancer_controller
  ]

  set = [
    {
      name  = "clusterName"
      value = module.eks.cluster_name
    },
    {
      name  = "region"
      value = var.aws_region
    },
    {
      name  = "vpcId"
      value = module.networking.vpc_id
    },
    {
      name  = "serviceAccount.create"
      value = "false"
    },
    {
      name  = "serviceAccount.name"
      value = "aws-load-balancer-controller"
    }
  ]
}

module "observability" {
  source = "./modules/observability"

  app_namespace                 = kubernetes_namespace_v1.app.metadata[0].name
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
  observability_namespace       = kubernetes_namespace_v1.observability.metadata[0].name
  project_name                  = var.project_name
  strimzi_chart_version         = var.strimzi_chart_version
  tags                          = local.common_tags

  depends_on = [
    kubernetes_namespace_v1.observability,
    helm_release.aws_load_balancer_controller
  ]
}

module "acm" {
  source = "./modules/acm"

  domain_name               = var.domain_name
  hosted_zone_id            = var.hosted_zone_id
  subject_alternative_names = var.subject_alternative_names
  tags                      = local.common_tags
}

module "waf" {
  source = "./modules/waf"

  project_name = local.cluster_name
  tags         = local.common_tags
}

resource "helm_release" "weather_sim" {
  name             = "weather-sim"
  namespace        = kubernetes_namespace_v1.app.metadata[0].name
  chart            = "${path.module}/../app/deployment/weather-sim/charts"
  create_namespace = false
  wait             = false

  depends_on = [
    helm_release.aws_load_balancer_controller,
    module.acm
  ]

  values = [
    yamlencode({
      namespace = kubernetes_namespace_v1.app.metadata[0].name
      image = {
        api = "${module.ecr.api_repository_url}:latest"
        web = "${module.ecr.web_repository_url}:latest"
      }
      secrets = {
        sessionSecretName = replace(module.secrets.session_secret_name, "/", "-")
        apiKeySecretName  = replace(module.secrets.api_keys_secret_name, "/", "-")
      }
      ingress = {
        enabled = false
      }
      service = {
        apiType        = "ClusterIP"
        apiAnnotations = local.api_service_annotations
      }
    })
  ]
}

resource "kubernetes_ingress_v1" "weather_sim_public" {
  wait_for_load_balancer = true

  metadata {
    name      = "weather-sim"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
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
          path      = "/api"
          path_type = "Prefix"

          backend {
            service {
              name = "weather-sim-api"

              port {
                number = 8080
              }
            }
          }
        }

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

module "dns" {
  source = "./modules/dns"

  alb_dns_name   = data.kubernetes_ingress_v1.weather_sim.status[0].load_balancer[0].ingress[0].hostname
  domain_name    = var.domain_name
  hosted_zone_id = var.hosted_zone_id
}
