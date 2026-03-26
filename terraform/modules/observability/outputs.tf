output "kafka_bootstrap_servers" {
  description = "Internal bootstrap service address for the Strimzi Kafka cluster."
  value       = local.kafka_bootstrap_servers
}

output "kafka_topic_name" {
  description = "Kafka topic used for weather-sim logs."
  value       = var.kafka_topic_name
}

output "kafka_ui_service_name" {
  description = "Cluster-internal Kafka UI service name."
  value       = "${helm_release.kafbat_ui.name}.${var.observability_namespace}.svc.cluster.local"
}

output "kibana_service_name" {
  description = "Cluster-internal Kibana service name."
  value       = "${local.kibana_name}-kb-http.${var.observability_namespace}.svc.cluster.local"
}

output "elasticsearch_service_name" {
  description = "Cluster-internal Elasticsearch HTTP service name."
  value       = "${local.elasticsearch_name}-es-http.${var.observability_namespace}.svc.cluster.local"
}

output "logstash_name" {
  description = "Name of the ECK-managed Logstash resource."
  value       = local.logstash_name
}

output "elasticsearch_index_pattern" {
  description = "Kibana index pattern for the weather-sim logs."
  value       = "${var.project_name}-logs-*"
}

output "cloudwatch_log_group_name" {
  description = "CloudWatch log group receiving Fluent Bit application logs."
  value       = aws_cloudwatch_log_group.fluent_bit.name
}
