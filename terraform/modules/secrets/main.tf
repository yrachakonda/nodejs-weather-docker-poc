variable "project_name" {
  description = "Project name used in secret names."
  type        = string
}

resource "aws_secretsmanager_secret" "session" {
  name = "${var.project_name}/session"
}

resource "aws_secretsmanager_secret" "api_keys" {
  name = "${var.project_name}/api-keys"
}

output "api_keys_secret_name" {
  description = "Secrets Manager secret name for API keys."
  value       = aws_secretsmanager_secret.api_keys.name
}

output "session_secret_arn" {
  description = "Secrets Manager session secret ARN."
  value       = aws_secretsmanager_secret.session.arn
}

output "session_secret_name" {
  description = "Secrets Manager session secret name."
  value       = aws_secretsmanager_secret.session.name
}
