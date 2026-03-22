terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "ecr" {
  source = "./modules/ecr"
  name_prefix = var.name_prefix
}

module "cloudwatch" {
  source = "./modules/cloudwatch"
  log_group_name = var.cloudwatch_log_group
}

module "secrets" {
  source = "./modules/secrets"
  name_prefix = var.name_prefix
}
