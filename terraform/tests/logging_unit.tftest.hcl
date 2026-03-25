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

  mock_resource "aws_kms_key" {
    defaults = {
      arn    = "arn:aws:kms:us-east-1:123456789012:key/test"
      key_id = "test"
    }
  }
}

run "logging_uses_shared_kms_key_for_application_logs" {
  command = plan

  module {
    source = "./modules/logging"
  }

  variables {
    project_name = "weather-sim-test"
  }

  assert {
    condition     = aws_cloudwatch_log_group.app.kms_key_id == "arn:aws:kms:us-east-1:123456789012:key/test"
    error_message = "Application log groups must use the shared customer-managed KMS key."
  }

  assert {
    condition     = aws_kms_alias.telemetry.name == "alias/weather-sim-test-telemetry"
    error_message = "The telemetry KMS key should expose a stable alias."
  }
}
