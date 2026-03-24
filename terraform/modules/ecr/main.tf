variable "project_name" {
  description = "Project name used for ECR repositories."
  type        = string
}

resource "aws_ecr_repository" "api" {
  name = "${var.project_name}-api"
}

resource "aws_ecr_repository" "web" {
  name = "${var.project_name}-web"
}

output "api_repository_url" {
  description = "API repository URL."
  value       = aws_ecr_repository.api.repository_url
}

output "web_repository_url" {
  description = "Web repository URL."
  value       = aws_ecr_repository.web.repository_url
}
