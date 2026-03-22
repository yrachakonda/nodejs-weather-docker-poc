output "api_repo_url" { value = module.ecr.api_repo_url }
output "web_repo_url" { value = module.ecr.web_repo_url }
output "session_secret_arn" { value = module.secrets.session_secret_arn }
output "redis_secret_arn" { value = module.secrets.redis_url_secret_arn }
