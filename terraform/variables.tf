variable "aws_region" {
  description = "AWS region used for all regional resources."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project identifier used in resource naming."
  type        = string
  default     = "weather-sim"
}

variable "environment" {
  description = "Environment name appended to shared resource names."
  type        = string
  default     = "poc"
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone ID used for DNS validation and the application record."
  type        = string
}

variable "domain_name" {
  description = "Primary DNS name for the application ingress."
  type        = string
}

variable "api_domain_name" {
  description = "Optional DNS name for the public API Gateway custom domain. Defaults to api.<domain_name>."
  type        = string
  default     = null
}

variable "subject_alternative_names" {
  description = "Optional ACM subject alternative names."
  type        = list(string)
  default     = []
}

variable "vpc_cidr" {
  description = "CIDR block assigned to the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "desired_node_count" {
  description = "Desired number of nodes for the managed EKS node group."
  type        = number
  default     = 2
}

variable "kubernetes_namespace" {
  description = "Namespace where the weather application will be deployed."
  type        = string
  default     = "weather-sim"
}

variable "observability_namespace" {
  description = "Namespace where Kafka, Fluent Bit, and the Elastic stack are deployed."
  type        = string
  default     = "observability"
}

variable "aws_load_balancer_controller_chart_version" {
  description = "Helm chart version for the AWS Load Balancer Controller."
  type        = string
  default     = "1.11.0"
}

variable "strimzi_chart_version" {
  description = "Pinned Helm chart version for the Strimzi operator."
  type        = string
  default     = "0.51.0"
}

variable "kafbat_ui_chart_version" {
  description = "Pinned Helm chart version for Kafbat UI."
  type        = string
  default     = "1.6.0"
}

variable "fluent_bit_chart_version" {
  description = "Pinned Helm chart version for Fluent Bit."
  type        = string
  default     = "0.56.0"
}

variable "eck_operator_chart_version" {
  description = "Pinned Helm chart version for the ECK operator."
  type        = string
  default     = "3.3.1"
}

variable "eck_stack_chart_version" {
  description = "Pinned Helm chart version for the ECK stack chart."
  type        = string
  default     = "0.18.1"
}

variable "elastic_stack_version" {
  description = "Pinned Elastic Stack version for ECK-managed Elasticsearch, Kibana, and Logstash."
  type        = string
  default     = "9.3.0"
}

variable "kafka_version" {
  description = "Pinned Kafka version for the Strimzi cluster."
  type        = string
  default     = "4.2.0"
}

variable "kafka_topic_name" {
  description = "Kafka topic used for weather-sim logs."
  type        = string
  default     = "weather-sim.logs"
}

variable "kafka_storage_size" {
  description = "Persistent volume size for the Kafka broker."
  type        = string
  default     = "20Gi"
}

variable "elasticsearch_storage_size" {
  description = "Persistent volume size for the Elasticsearch node."
  type        = string
  default     = "20Gi"
}

variable "kafka_retention_hours" {
  description = "Kafka retention for the weather-sim logs topic in hours."
  type        = number
  default     = 72
}

variable "cloudwatch_log_retention_days" {
  description = "CloudWatch retention in days for Fluent Bit application logs."
  type        = number
  default     = 30
}
