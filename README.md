# Weather Simulation Platform POC

This repository contains a full-stack TypeScript weather simulation application and the AWS infrastructure used to run it on Amazon EKS.

The stack now includes:
- A React Web UI in `frontend/`
- An Express API in `backend/`
- A Helm chart in `charts/weather-sim/`
- Terraform for AWS networking, EKS, ECR, ACM, Route53, and WAF in `terraform/`
- Azure DevOps pipeline templates in `pipelines/`

## Current platform shape
- AWS region defaults to `us-east-1`
- VPC CIDR is `10.0.0.0/16`
- Two public `/20` subnets host the internet-facing ALB
- Two private `/20` subnets host the EKS worker nodes
- The application is deployed into EKS namespace `weather-sim`
- The ingress path is fronted by an ALB with an ACM certificate and WAFv2 ACL

## Application contract summary
- API base path: `/api/v1`
- Roles: `anonymous`, `basic`, `premium`, `admin`
- Session cookie is used for authenticated identity
- `x-api-key` is required on weather endpoints
- `GET /api/v1/weather/current` requires a valid API key, but not a session
- `GET /api/v1/weather/premium-forecast` requires both a valid API key and a `premium` or `admin` session
- Health endpoints:
  - `/api/v1/system/live`
  - `/api/v1/system/ready`
  - `/api/v1/system/health`
  - `/api/v1/system/version`

## Local development
Copy `.env.example` to `.env`, then start the stack:

```bash
cp .env.example .env
docker compose up --build
```

Local endpoints:
- Web UI: `http://localhost:5173`
- API: `http://localhost:8080/api/v1`
- Health: `http://localhost:8080/api/v1/system/health`

## Seed personas
- `admin/admin-pass`
- `basicuser/basic-pass`
- `premiumuser/premium-pass`

## Seed API keys
- `poc-basic-key-001`
- `poc-premium-key-001`
- `poc-admin-key-001`

## Terraform validation and tests
From `terraform/`:

```bash
terraform init -backend=false
terraform validate
terraform test
```

The Terraform test suite uses native `.tftest.hcl` files and currently covers:
- Networking module subnet and CIDR layout
- EKS module cluster and node group configuration
- Root stack composition with mocked providers
