variable "project_name" {
  description = "Project name used in secret names."
  type        = string
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

locals {
  kms_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowSecretsManagerUseOfTheKey"
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:Encrypt",
          "kms:GenerateDataKey*",
          "kms:ReEncrypt*"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
            "kms:ViaService"    = "secretsmanager.${data.aws_region.current.region}.amazonaws.com"
          }
        }
      },
      {
        Sid    = "AllowSecretsManagerGrantManagement"
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action = [
          "kms:CreateGrant",
          "kms:ListGrants",
          "kms:RevokeGrant"
        ]
        Resource = "*"
        Condition = {
          Bool = {
            "kms:GrantIsForAWSResource" = "true"
          }
          StringEquals = {
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
            "kms:ViaService"    = "secretsmanager.${data.aws_region.current.region}.amazonaws.com"
          }
        }
      }
    ]
  })
}

resource "aws_kms_key" "secrets" {
  description             = "Customer-managed key for ${var.project_name} Secrets Manager secrets"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  policy                  = local.kms_policy
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.project_name}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

resource "aws_secretsmanager_secret" "session" {
  name       = "${var.project_name}/session"
  kms_key_id = aws_kms_key.secrets.arn
}

resource "aws_secretsmanager_secret" "api_keys" {
  name       = "${var.project_name}/api-keys"
  kms_key_id = aws_kms_key.secrets.arn
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
