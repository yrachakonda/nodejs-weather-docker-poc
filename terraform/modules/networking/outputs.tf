output "private_subnet_ids" {
  description = "Private subnet IDs."
  value       = [for subnet in values(aws_subnet.private) : subnet.id]
}

output "public_subnet_ids" {
  description = "Public subnet IDs."
  value       = [for subnet in values(aws_subnet.public) : subnet.id]
}

output "vpc_id" {
  description = "VPC ID."
  value       = aws_vpc.this.id
}

output "vpc_flow_log_id" {
  description = "VPC flow log ID."
  value       = aws_flow_log.this.id
}

output "vpc_flow_log_group_name" {
  description = "CloudWatch log group name for VPC flow logs."
  value       = aws_cloudwatch_log_group.vpc_flow_logs.name
}
