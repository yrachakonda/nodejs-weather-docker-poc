mock_provider "aws" {
  override_during = plan

  mock_data "aws_caller_identity" {
    defaults = {
      account_id = "123456789012"
    }
  }

  mock_data "aws_region" {
    defaults = {
      name = "us-east-1"
    }
  }
}

run "secrets_use_customer_managed_kms" {
  command = apply

  module {
    source = "./modules/secrets"
  }

  variables {
    project_name = "weather-sim-test"
  }

  assert {
    condition     = aws_kms_key.secrets.enable_key_rotation
    error_message = "The Secrets Manager KMS key should enable key rotation."
  }

  assert {
    condition     = aws_kms_alias.secrets.name == "alias/weather-sim-test-secrets"
    error_message = "The Secrets Manager KMS key should have a predictable alias."
  }

  assert {
    condition     = aws_secretsmanager_secret.session.kms_key_id == aws_kms_key.secrets.arn
    error_message = "The session secret should use the module KMS key."
  }

  assert {
    condition     = aws_secretsmanager_secret.api_keys.kms_key_id == aws_kms_key.secrets.arn
    error_message = "The API keys secret should use the module KMS key."
  }
}
