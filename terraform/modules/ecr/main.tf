variable "project_name" { type = string }
resource "aws_ecr_repository" "api" { name = "${var.project_name}-api" }
resource "aws_ecr_repository" "web" { name = "${var.project_name}-web" }
output "api_repository_url" { value = aws_ecr_repository.api.repository_url }
output "web_repository_url" { value = aws_ecr_repository.web.repository_url }
