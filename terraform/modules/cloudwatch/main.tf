variable "log_group_name" { type = string }
resource "aws_cloudwatch_log_group" "app" {
  name              = var.log_group_name
  retention_in_days = 14
}
output "log_group_name" { value = aws_cloudwatch_log_group.app.name }
