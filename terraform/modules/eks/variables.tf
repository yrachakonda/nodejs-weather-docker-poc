variable "cluster_name" {
  description = "EKS cluster name."
  type        = string
}

variable "desired_node_count" {
  description = "Desired node count for the managed node group."
  type        = number
}

variable "private_subnet_ids" {
  description = "Private subnets used by the managed node group."
  type        = list(string)
}

variable "project_name" {
  description = "Project name used for tags and log groups."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnets associated with the EKS control plane."
  type        = list(string)
}

variable "tags" {
  description = "Common tags applied to EKS resources."
  type        = map(string)
  default     = {}
}

variable "vpc_id" {
  description = "VPC ID where the EKS cluster is deployed."
  type        = string
}
