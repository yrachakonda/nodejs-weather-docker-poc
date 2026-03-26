variable "project_name" {
  description = "Project name used for observability workload naming."
  type        = string
}

variable "cluster_name" {
  description = "EKS cluster name used in log metadata."
  type        = string
}

variable "aws_region" {
  description = "AWS region where observability infrastructure is deployed."
  type        = string
}

variable "app_namespace" {
  description = "Namespace containing the weather-sim application workloads."
  type        = string
}

variable "observability_namespace" {
  description = "Namespace containing the observability stack."
  type        = string
}

variable "eks_oidc_provider_arn" {
  description = "OIDC provider ARN used for Fluent Bit IRSA."
  type        = string
}

variable "eks_oidc_provider_url" {
  description = "OIDC provider URL used for Fluent Bit IRSA."
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN used to encrypt the CloudWatch log group."
  type        = string
}

variable "strimzi_chart_version" {
  description = "Pinned Helm chart version for the Strimzi operator."
  type        = string
}

variable "kafbat_ui_chart_version" {
  description = "Pinned Helm chart version for Kafbat UI."
  type        = string
}

variable "fluent_bit_chart_version" {
  description = "Pinned Helm chart version for Fluent Bit."
  type        = string
}

variable "eck_operator_chart_version" {
  description = "Pinned Helm chart version for the ECK operator."
  type        = string
}

variable "eck_stack_chart_version" {
  description = "Pinned Helm chart version for the ECK stack chart."
  type        = string
}

variable "elastic_stack_version" {
  description = "Pinned Elastic Stack version used by ECK-managed resources."
  type        = string
}

variable "kafka_version" {
  description = "Pinned Kafka version for the Strimzi Kafka cluster."
  type        = string
}

variable "kafka_topic_name" {
  description = "Kafka topic that receives weather-sim logs."
  type        = string
}

variable "kafka_storage_size" {
  description = "Persistent volume size for the Kafka broker."
  type        = string
}

variable "elasticsearch_storage_size" {
  description = "Persistent volume size for Elasticsearch."
  type        = string
}

variable "kafka_retention_hours" {
  description = "Retention in hours for the logs Kafka topic."
  type        = number
}

variable "cloudwatch_log_retention_days" {
  description = "Retention in days for the Fluent Bit CloudWatch log group."
  type        = number
}

variable "tags" {
  description = "Tags applied to AWS observability resources."
  type        = map(string)
}
