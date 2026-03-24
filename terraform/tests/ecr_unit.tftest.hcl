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

run "ecr_repositories_use_kms_and_immutable_tags" {
  command = apply

  module {
    source = "./modules/ecr"
  }

  variables {
    project_name = "weather-sim-test"
  }

  assert {
    condition     = aws_kms_key.ecr.enable_key_rotation
    error_message = "The ECR KMS key should enable key rotation."
  }

  assert {
    condition     = aws_kms_alias.ecr.name == "alias/weather-sim-test-ecr"
    error_message = "The ECR KMS key should have a predictable alias."
  }

  assert {
    condition     = aws_ecr_repository.api.image_scanning_configuration[0].scan_on_push
    error_message = "The API repository should scan images on push."
  }

  assert {
    condition     = aws_ecr_repository.api.image_tag_mutability == "IMMUTABLE"
    error_message = "The API repository should reject mutable tags."
  }

  assert {
    condition     = aws_ecr_repository.api.encryption_configuration[0].encryption_type == "KMS"
    error_message = "The API repository should use KMS encryption."
  }

  assert {
    condition     = aws_ecr_repository.api.encryption_configuration[0].kms_key == aws_kms_key.ecr.arn
    error_message = "The API repository should encrypt with the module KMS key."
  }

  assert {
    condition     = aws_ecr_repository.web.image_scanning_configuration[0].scan_on_push
    error_message = "The web repository should scan images on push."
  }

  assert {
    condition     = aws_ecr_repository.web.image_tag_mutability == "IMMUTABLE"
    error_message = "The web repository should reject mutable tags."
  }
}
