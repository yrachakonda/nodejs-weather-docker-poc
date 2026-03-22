variable "project_name" { type = string }
resource "aws_cloudwatch_log_group" "app" {
  name              = "/${var.project_name}/poc/app"
  retention_in_days = 14
}
output "log_group_name" { value = aws_cloudwatch_log_group.app.name }
