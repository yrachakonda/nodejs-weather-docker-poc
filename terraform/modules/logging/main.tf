data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

variable "project_name" {
  description = "Project name used in the log group path."
  type        = string
}

locals {
  telemetry_kms_key_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableAccountAdministration"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowCloudWatchLogsUseOfKey"
        Effect = "Allow"
        Principal = {
          Service = "logs.${data.aws_region.current.name}.amazonaws.com"
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
            "kms:ViaService" = "logs.${data.aws_region.current.name}.amazonaws.com"
          }
        }
      },
      {
        Sid    = "AllowEKSUseOfKey"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
        Action = [
          "kms:CreateGrant",
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:Encrypt",
          "kms:GenerateDataKey*",
          "kms:ListGrants",
          "kms:ReEncrypt*",
          "kms:RevokeGrant"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "eks.${data.aws_region.current.name}.amazonaws.com"
          }
        }
      }
    ]
  })
}

resource "aws_kms_key" "telemetry" {
  description             = "Shared key for VPC flow logs and EKS secret encryption"
  enable_key_rotation     = true
  deletion_window_in_days = 7
  policy                  = local.telemetry_kms_key_policy
}

resource "aws_kms_alias" "telemetry" {
  name          = "alias/${var.project_name}-telemetry"
  target_key_id = aws_kms_key.telemetry.key_id
}

output "kms_key_arn" {
  description = "Shared KMS key ARN for telemetry and cluster encryption."
  value       = aws_kms_key.telemetry.arn
}
