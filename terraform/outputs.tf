output "api_ecr_repo" { value = module.ecr.api_repository_url }
output "web_ecr_repo" { value = module.ecr.web_repository_url }
output "cloudwatch_log_group" { value = module.logging.log_group_name }
output "session_secret_arn" { value = module.secrets.session_secret_arn }
