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

run "logging_exposes_shared_telemetry_key" {
  command = plan

  module {
    source = "./modules/logging"
  }

  variables {
    project_name = "weather-sim-test"
  }

  assert {
    condition     = aws_kms_key.telemetry.description == "Shared key for VPC flow logs and EKS secret encryption"
    error_message = "The telemetry KMS key description should match the shared telemetry scope."
  }

  assert {
    condition     = aws_kms_alias.telemetry.name == "alias/weather-sim-test-telemetry"
    error_message = "The telemetry KMS key should expose a stable alias."
  }
}
