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

output "api_web_acl_arn" {
  description = "WAFv2 ACL ARN associated with the shared ingress ALB, including the API path."
  value       = module.waf.web_acl_arn
}

output "application_hostname" {
  description = "DNS hostname published for the weather application."
  value       = var.domain_name
}

output "api_hostname" {
  description = "DNS hostname published for the API path on the shared ingress."
  value       = var.domain_name
}

output "api_invoke_url" {
  description = "Public API base URL exposed through the shared ingress ALB."
  value       = "https://${var.domain_name}/api/v1"
}

output "api_gateway_invoke_url" {
  description = "Deprecated alias for api_invoke_url after moving API traffic to the shared ingress ALB."
  value       = "https://${var.domain_name}/api/v1"
}

output "api_gateway_rest_api_id" {
  description = "Deprecated. API Gateway is no longer provisioned for the public API edge."
  value       = null
}

output "api_gateway_vpc_link_id" {
  description = "Deprecated. API Gateway VPC Link is no longer provisioned."
  value       = null
}

output "api_gateway_integration_type" {
  description = "Deprecated. API Gateway integration is no longer provisioned."
  value       = null
}

output "api_gateway_integration_connection_type" {
  description = "Deprecated. API Gateway integration is no longer provisioned."
  value       = null
}

output "api_gateway_stage_arn" {
  description = "Deprecated. API Gateway stage is no longer provisioned."
  value       = null
}

output "api_gateway_access_log_group_name" {
  description = "Deprecated. API Gateway access logging is no longer provisioned."
  value       = null
}

output "api_gateway_xray_tracing_enabled" {
  description = "Deprecated. API Gateway X-Ray tracing is no longer provisioned."
  value       = null
}

output "api_gateway_waf_association_resource_arn" {
  description = "Deprecated. API Gateway WAF association is no longer provisioned."
  value       = null
}

output "api_service_load_balancer_scheme" {
  description = "Scheme applied to the shared ingress ALB that serves the API path."
  value       = kubernetes_ingress_v1.weather_sim_public.metadata[0].annotations["alb.ingress.kubernetes.io/scheme"]
}

output "api_service_load_balancer_target_type" {
  description = "Target type annotation applied to the API service for ingress backends."
  value       = local.api_service_annotations["alb.ingress.kubernetes.io/target-type"]
}

output "api_service_healthcheck_port" {
  description = "Health check port annotation applied to the API service."
  value       = local.api_service_annotations["alb.ingress.kubernetes.io/healthcheck-port"]
}

output "api_service_healthcheck_path" {
  description = "Health check path annotation applied to the API service."
  value       = local.api_service_annotations["alb.ingress.kubernetes.io/healthcheck-path"]
}

output "api_nlb_hostname" {
  description = "Deprecated. The API service is no longer fronted by a dedicated NLB."
  value       = null
}

output "api_nlb_arn" {
  description = "Deprecated. The API service is no longer fronted by a dedicated NLB."
  value       = null
}

output "observability_namespace" {
  description = "Namespace hosting Kafka, Fluent Bit, and the Elastic stack."
  value       = var.observability_namespace
}

output "kafka_bootstrap_servers" {
  description = "Internal bootstrap service address for the observability Kafka cluster."
  value       = module.observability.kafka_bootstrap_servers
}

output "kafka_logs_topic" {
  description = "Kafka topic receiving weather-sim application logs."
  value       = module.observability.kafka_topic_name
}

output "kafka_ui_service" {
  description = "Cluster-internal Kafka UI service name."
  value       = module.observability.kafka_ui_service_name
}

output "kibana_service" {
  description = "Cluster-internal Kibana service name."
  value       = module.observability.kibana_service_name
}

output "elasticsearch_service" {
  description = "Cluster-internal Elasticsearch HTTP service name."
  value       = module.observability.elasticsearch_service_name
}

output "logs_index_pattern" {
  description = "Kibana index pattern for the application logs."
  value       = module.observability.elasticsearch_index_pattern
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group receiving application logs from Fluent Bit."
  value       = module.observability.cloudwatch_log_group_name
}
