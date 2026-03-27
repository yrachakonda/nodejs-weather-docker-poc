output "api_base_url" {
  description = "Public API base URL exposed through the custom API Gateway domain."
  value       = "https://${var.api_domain_name}/api/v1"
}

output "api_gateway_invoke_url" {
  description = "Invoke URL for the API Gateway stage."
  value       = "https://${var.api_domain_name}/api/v1"
}

output "api_gateway_rest_api_id" {
  description = "Identifier of the public API Gateway REST API."
  value       = aws_api_gateway_rest_api.this.id
}

output "api_gateway_vpc_link_id" {
  description = "Identifier of the API Gateway VPC link."
  value       = aws_api_gateway_vpc_link.this.id
}

output "api_gateway_integration_type" {
  description = "Integration type used by the API Gateway route."
  value       = aws_api_gateway_integration.proxy.type
}

output "api_gateway_integration_connection_type" {
  description = "Connection type used by the API Gateway integration."
  value       = aws_api_gateway_integration.proxy.connection_type
}

output "api_gateway_stage_arn" {
  description = "ARN of the API Gateway stage associated with the WAF ACL."
  value       = aws_api_gateway_stage.this.arn
}

output "api_gateway_access_log_group_name" {
  description = "CloudWatch log group name receiving API Gateway access logs."
  value       = aws_cloudwatch_log_group.api_gateway_access.name
}

output "api_gateway_xray_tracing_enabled" {
  description = "Whether X-Ray tracing is enabled for the API Gateway stage."
  value       = aws_api_gateway_stage.this.xray_tracing_enabled
}

output "api_gateway_waf_association_resource_arn" {
  description = "Resource ARN targeted by the WAF association."
  value       = aws_wafv2_web_acl_association.this.resource_arn
}

output "api_nlb_arn" {
  description = "ARN of the internal NLB fronting the API service."
  value       = data.aws_lb.api_nlb.arn
}

output "api_nlb_hostname" {
  description = "DNS name of the internal NLB fronting the API service."
  value       = data.aws_lb.api_nlb.dns_name
}
