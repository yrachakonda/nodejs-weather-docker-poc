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

variable "aws_load_balancer_controller_chart_version" {
  description = "Helm chart version for the AWS Load Balancer Controller."
  type        = string
  default     = "1.11.0"
}
