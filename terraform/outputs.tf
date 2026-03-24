output "api_ecr_repo" {
  description = "ECR repository URL for the API image."
  value       = module.ecr.api_repository_url
}

output "web_ecr_repo" {
  description = "ECR repository URL for the Web image."
  value       = module.ecr.web_repository_url
}

output "cluster_name" {
  description = "Name of the EKS cluster."
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "API server endpoint for the EKS cluster."
  value       = module.eks.cluster_endpoint
}

output "vpc_id" {
  description = "VPC ID hosting the cluster and load balancer."
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs used by the internet-facing ALB."
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs used by the EKS managed node group."
  value       = module.networking.private_subnet_ids
}

output "certificate_arn" {
  description = "ACM certificate ARN bound to the ingress ALB."
  value       = module.acm.certificate_arn
}

output "web_acl_arn" {
  description = "WAFv2 ACL ARN associated with the ingress ALB."
  value       = module.waf.web_acl_arn
}

output "application_hostname" {
  description = "DNS hostname published for the weather application."
  value       = var.domain_name
}
