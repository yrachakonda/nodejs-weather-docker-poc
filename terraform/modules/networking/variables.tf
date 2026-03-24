variable "cluster_name" {
  description = "EKS cluster name used for subnet discovery tags."
  type        = string
}

variable "name" {
  description = "Base name used for networking resources."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
}

variable "tags" {
  description = "Common tags applied to networking resources."
  type        = map(string)
  default     = {}
}
