output "cluster_certificate_authority_data" {
  description = "Base64 encoded cluster certificate authority data."
  value       = aws_eks_cluster.this.certificate_authority[0].data
}

output "cluster_endpoint" {
  description = "EKS cluster API endpoint."
  value       = aws_eks_cluster.this.endpoint
}

output "cluster_name" {
  description = "EKS cluster name."
  value       = aws_eks_cluster.this.name
}

output "oidc_provider_arn" {
  description = "OIDC provider ARN for IRSA roles."
  value       = aws_iam_openid_connect_provider.this.arn
}

output "oidc_provider_url" {
  description = "OIDC provider URL for IRSA roles."
  value       = aws_iam_openid_connect_provider.this.url
}

output "eks_secrets_kms_key_arn" {
  description = "KMS key ARN used for EKS secret encryption."
  value       = aws_kms_key.eks_secrets.arn
}
