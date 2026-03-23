terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.aws_region
}

module "ecr" {
  source = "./modules/ecr"
  project_name = var.project_name
}

module "logging" {
  source = "./modules/logging"
  project_name = var.project_name
}

module "secrets" {
  source = "./modules/secrets"
  project_name = var.project_name
}

module "dns" {
  source = "./modules/dns"
  hosted_zone_id = var.hosted_zone_id
  domain_name = var.domain_name
  alb_dns_name = var.alb_dns_name
}

module "acm" {
  source = "./modules/acm"
  domain_name = var.domain_name
}

module "waf" {
  source = "./modules/waf"
  project_name = var.project_name
}
