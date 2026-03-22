variable "project_name" { type = string }
resource "aws_secretsmanager_secret" "session" { name = "${var.project_name}/session" }
resource "aws_secretsmanager_secret" "api_keys" { name = "${var.project_name}/api-keys" }
output "session_secret_arn" { value = aws_secretsmanager_secret.session.arn }
