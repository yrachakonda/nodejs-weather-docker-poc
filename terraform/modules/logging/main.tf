variable "project_name" {
  description = "Project name used in the log group path."
  type        = string
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/${var.project_name}/poc/app"
  retention_in_days = 14
}

output "log_group_name" {
  description = "CloudWatch log group name for the application."
  value       = aws_cloudwatch_log_group.app.name
}
