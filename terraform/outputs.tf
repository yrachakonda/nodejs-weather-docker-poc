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
  description = "WAFv2 ACL ARN associated with the API Gateway stage."
  value       = module.api_waf.web_acl_arn
}

output "application_hostname" {
  description = "DNS hostname published for the weather application."
  value       = var.domain_name
}

output "api_hostname" {
  description = "DNS hostname published for the API Gateway custom domain."
  value       = local.api_domain_name
}

output "api_invoke_url" {
  description = "Public API base URL exposed through API Gateway."
  value       = module.api_edge.api_base_url
}

output "api_gateway_invoke_url" {
  description = "API Gateway stage invoke URL."
  value       = module.api_edge.api_gateway_invoke_url
}

output "api_gateway_rest_api_id" {
  description = "REST API identifier for the public API edge."
  value       = module.api_edge.api_gateway_rest_api_id
}

output "api_gateway_vpc_link_id" {
  description = "Identifier of the API Gateway VPC link."
  value       = module.api_edge.api_gateway_vpc_link_id
}

output "api_gateway_integration_type" {
  description = "Integration type used by the API Gateway route."
  value       = module.api_edge.api_gateway_integration_type
}

output "api_gateway_integration_connection_type" {
  description = "Connection type used by the API Gateway integration."
  value       = module.api_edge.api_gateway_integration_connection_type
}

output "api_gateway_stage_arn" {
  description = "ARN of the API Gateway stage protected by WAF."
  value       = module.api_edge.api_gateway_stage_arn
}

output "api_gateway_access_log_group_name" {
  description = "CloudWatch log group name receiving API Gateway access logs."
  value       = module.api_edge.api_gateway_access_log_group_name
}

output "api_gateway_xray_tracing_enabled" {
  description = "Whether X-Ray tracing is enabled for the API Gateway stage."
  value       = module.api_edge.api_gateway_xray_tracing_enabled
}

output "api_gateway_waf_association_resource_arn" {
  description = "Resource ARN targeted by the API Gateway WAF association."
  value       = module.api_edge.api_gateway_waf_association_resource_arn
}

output "api_service_load_balancer_scheme" {
  description = "Load balancer scheme annotation applied to the API service."
  value       = local.api_service_annotations["service.beta.kubernetes.io/aws-load-balancer-scheme"]
}

output "api_service_load_balancer_target_type" {
  description = "NLB target type annotation applied to the API service."
  value       = local.api_service_annotations["service.beta.kubernetes.io/aws-load-balancer-nlb-target-type"]
}

output "api_service_healthcheck_port" {
  description = "Health check port annotation applied to the API service."
  value       = local.api_service_annotations["service.beta.kubernetes.io/aws-load-balancer-healthcheck-port"]
}

output "api_service_healthcheck_path" {
  description = "Health check path annotation applied to the API service."
  value       = local.api_service_annotations["service.beta.kubernetes.io/aws-load-balancer-healthcheck-path"]
}

output "api_nlb_hostname" {
  description = "Hostname of the internal NLB fronting the API service."
  value       = module.api_edge.api_nlb_hostname
}

output "api_nlb_arn" {
  description = "ARN of the internal NLB fronting the API service."
  value       = module.api_edge.api_nlb_arn
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
