variable "name_prefix" { type = string }
resource "aws_ecr_repository" "api" { name = "${var.name_prefix}-api" }
resource "aws_ecr_repository" "web" { name = "${var.name_prefix}-web" }
output "api_repo_url" { value = aws_ecr_repository.api.repository_url }
output "web_repo_url" { value = aws_ecr_repository.web.repository_url }
