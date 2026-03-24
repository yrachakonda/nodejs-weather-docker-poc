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
