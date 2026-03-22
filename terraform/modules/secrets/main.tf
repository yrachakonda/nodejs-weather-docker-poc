variable "name_prefix" { type = string }
resource "aws_secretsmanager_secret" "session_secret" { name = "${var.name_prefix}/session-secret" }
resource "aws_secretsmanager_secret" "redis_url" { name = "${var.name_prefix}/redis-url" }
output "session_secret_arn" { value = aws_secretsmanager_secret.session_secret.arn }
output "redis_url_secret_arn" { value = aws_secretsmanager_secret.redis_url.arn }
