locals {
  kafka_cluster_name              = "${var.project_name}-kafka"
  kafka_bootstrap_servers         = "${local.kafka_cluster_name}-kafka-bootstrap.${var.observability_namespace}.svc.cluster.local:9092"
  elasticsearch_name              = "${var.project_name}-elasticsearch"
  elasticsearch_cluster_key       = replace(upper(var.project_name), "-", "_")
  kibana_name                     = "${var.project_name}-kibana"
  logstash_name                   = "${var.project_name}-logstash"
  cloudwatch_log_group_name       = "/${var.cluster_name}/observability/application"
  cloudwatch_log_stream_name      = "${var.cluster_name}-application"
  fluent_bit_service_account_name = "fluent-bit"
}

data "aws_iam_policy_document" "fluent_bit_assume_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    condition {
      test     = "StringEquals"
      variable = "${replace(var.eks_oidc_provider_url, "https://", "")}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "${replace(var.eks_oidc_provider_url, "https://", "")}:sub"
      values   = ["system:serviceaccount:${var.observability_namespace}:${local.fluent_bit_service_account_name}"]
    }

    principals {
      identifiers = [var.eks_oidc_provider_arn]
      type        = "Federated"
    }
  }
}

data "aws_iam_policy_document" "fluent_bit_cloudwatch" {
  statement {
    actions = ["logs:DescribeLogStreams"]

    resources = [aws_cloudwatch_log_group.fluent_bit.arn]
  }

  statement {
    actions = [
      "logs:PutLogEvents"
    ]

    resources = [aws_cloudwatch_log_stream.fluent_bit.arn]
  }
}

resource "aws_cloudwatch_log_group" "fluent_bit" {
  name              = local.cloudwatch_log_group_name
  kms_key_id        = var.kms_key_arn
  retention_in_days = var.cloudwatch_log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_stream" "fluent_bit" {
  name           = local.cloudwatch_log_stream_name
  log_group_name = aws_cloudwatch_log_group.fluent_bit.name
}

resource "aws_iam_role" "fluent_bit" {
  name               = "${var.cluster_name}-fluent-bit"
  assume_role_policy = data.aws_iam_policy_document.fluent_bit_assume_role.json

  tags = var.tags
}

resource "aws_iam_role_policy" "fluent_bit_cloudwatch" {
  name   = "${var.cluster_name}-fluent-bit-cloudwatch"
  role   = aws_iam_role.fluent_bit.id
  policy = data.aws_iam_policy_document.fluent_bit_cloudwatch.json
}

resource "kubernetes_service_account" "fluent_bit" {
  metadata {
    name      = local.fluent_bit_service_account_name
    namespace = var.observability_namespace
    annotations = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.fluent_bit.arn
    }
    labels = {
      "app.kubernetes.io/name" = "fluent-bit"
    }
  }
}

resource "helm_release" "strimzi" {
  name             = "strimzi"
  namespace        = var.observability_namespace
  repository       = "https://strimzi.io/charts/"
  chart            = "strimzi-kafka-operator"
  version          = var.strimzi_chart_version
  create_namespace = false
  wait             = true
  timeout          = 900

  values = [
    templatefile("${path.module}/../../helm-values/observability/strimzi-values.yaml.tmpl", {
      observability_namespace = var.observability_namespace
    })
  ]
}

resource "kubernetes_manifest" "kafka_node_pool" {
  manifest = yamldecode(templatefile("${path.module}/../../manifests/observability/kafka-node-pool.yaml.tmpl", {
    kafka_cluster_name      = local.kafka_cluster_name
    observability_namespace = var.observability_namespace
    kafka_storage_size      = var.kafka_storage_size
  }))

  depends_on = [
    helm_release.strimzi
  ]
}

resource "kubernetes_manifest" "kafka_cluster" {
  manifest = yamldecode(templatefile("${path.module}/../../manifests/observability/kafka-cluster.yaml.tmpl", {
    kafka_cluster_name      = local.kafka_cluster_name
    observability_namespace = var.observability_namespace
    kafka_version           = var.kafka_version
    kafka_retention_hours   = var.kafka_retention_hours
  }))

  depends_on = [
    helm_release.strimzi,
    kubernetes_manifest.kafka_node_pool
  ]
}

resource "kubernetes_manifest" "kafka_topic" {
  manifest = yamldecode(templatefile("${path.module}/../../manifests/observability/kafka-topic.yaml.tmpl", {
    kafka_cluster_name      = local.kafka_cluster_name
    kafka_topic_name        = var.kafka_topic_name
    observability_namespace = var.observability_namespace
    kafka_retention_hours   = var.kafka_retention_hours
  }))

  depends_on = [
    kubernetes_manifest.kafka_cluster
  ]
}

resource "helm_release" "kafbat_ui" {
  name             = "kafbat-ui"
  namespace        = var.observability_namespace
  repository       = "https://ui.charts.kafbat.io/"
  chart            = "kafka-ui"
  version          = var.kafbat_ui_chart_version
  create_namespace = false
  wait             = true
  timeout          = 600

  values = [
    templatefile("${path.module}/../../helm-values/observability/kafbat-ui-values.yaml.tmpl", {
      kafka_bootstrap_servers = local.kafka_bootstrap_servers
    })
  ]

  depends_on = [
    kubernetes_manifest.kafka_cluster
  ]
}

resource "helm_release" "eck_operator" {
  name             = "eck-operator"
  namespace        = var.observability_namespace
  repository       = "https://helm.elastic.co"
  chart            = "eck-operator"
  version          = var.eck_operator_chart_version
  create_namespace = false
  wait             = true
  timeout          = 900

  values = [
    templatefile("${path.module}/../../helm-values/observability/eck-operator-values.yaml.tmpl", {
      observability_namespace = var.observability_namespace
    })
  ]
}

resource "helm_release" "eck_stack" {
  name             = "eck-stack"
  namespace        = var.observability_namespace
  repository       = "https://helm.elastic.co"
  chart            = "eck-stack"
  version          = var.eck_stack_chart_version
  create_namespace = false
  wait             = true
  timeout          = 900

  values = [
    templatefile("${path.module}/../../helm-values/observability/eck-stack-values.yaml.tmpl", {
      app_namespace              = var.app_namespace
      elastic_stack_version      = var.elastic_stack_version
      elasticsearch_name         = local.elasticsearch_name
      elasticsearch_storage_size = var.elasticsearch_storage_size
      kafka_bootstrap_servers    = local.kafka_bootstrap_servers
      kafka_topic_name           = var.kafka_topic_name
      kibana_name                = local.kibana_name
      logstash_name              = local.logstash_name
      logstash_es_env_prefix     = local.elasticsearch_cluster_key
      project_name               = var.project_name
    })
  ]

  depends_on = [
    helm_release.eck_operator
  ]
}

resource "helm_release" "fluent_bit" {
  name             = "fluent-bit"
  namespace        = var.observability_namespace
  repository       = "https://fluent.github.io/helm-charts"
  chart            = "fluent-bit"
  version          = var.fluent_bit_chart_version
  create_namespace = false
  wait             = true
  timeout          = 600

  values = [
    templatefile("${path.module}/../../helm-values/observability/fluent-bit-values.yaml.tmpl", {
      aws_region                 = var.aws_region
      app_namespace              = var.app_namespace
      cluster_name               = var.cluster_name
      cloudwatch_log_group_name  = local.cloudwatch_log_group_name
      cloudwatch_log_stream_name = aws_cloudwatch_log_stream.fluent_bit.name
      kafka_bootstrap_servers    = local.kafka_bootstrap_servers
      kafka_topic_name           = var.kafka_topic_name
    })
  ]

  set {
    name  = "serviceAccount.create"
    value = "false"
  }

  set {
    name  = "serviceAccount.name"
    value = local.fluent_bit_service_account_name
  }

  depends_on = [
    aws_cloudwatch_log_group.fluent_bit,
    aws_cloudwatch_log_stream.fluent_bit,
    aws_iam_role_policy.fluent_bit_cloudwatch,
    kubernetes_manifest.kafka_cluster,
    kubernetes_service_account.fluent_bit
  ]
}
