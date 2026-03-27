variable "api_domain_name" {
  description = "Public DNS name for the API Gateway custom domain."
  type        = string
}

variable "certificate_arn" {
  description = "ACM certificate ARN used by the API Gateway custom domain."
  type        = string
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone ID for the API custom domain."
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN used to encrypt API Gateway access logs."
  type        = string
}

variable "nlb_name" {
  description = "Name of the internal NLB fronting the EKS API service."
  type        = string
}

variable "project_name" {
  description = "Project name used for edge resource naming."
  type        = string
}

variable "stage_name" {
  description = "Name of the API Gateway stage."
  type        = string
  default     = "prod"
}

variable "access_log_retention_days" {
  description = "Retention period for API Gateway access logs."
  type        = number
  default     = 30
}

variable "tags" {
  description = "Common tags applied to edge resources."
  type        = map(string)
  default     = {}
}

variable "waf_acl_arn" {
  description = "WAF ACL ARN associated with the API Gateway stage."
  type        = string
}
