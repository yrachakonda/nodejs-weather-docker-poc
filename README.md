# Weather Simulation Platform POC

This repository contains a TypeScript weather application plus the infrastructure and deployment assets used to run it on AWS.

## Repository layout
- `app/`: application source, local Docker Compose stack, and npm workspaces
- `app/backend/`: Express API
- `app/frontend/`: React web UI
- `app/fluent-bit/`: local Fluent Bit configuration
- `charts/weather-sim/`: Helm chart for Kubernetes deployment
- `terraform/`: AWS infrastructure for networking, EKS, ECR, ACM, Route53, WAF, and deployment wiring
- `docs/`: architecture, contracts, runbook, local development, and DAST notes
- `pipelines/`: Azure DevOps pipeline templates

## Current platform shape
- AWS region defaults to `us-east-1`
- The Terraform environment in [terraform/environments/poc/terraform.tfvars](/./terraform/environments/poc/terraform.tfvars) currently uses VPC CIDR `10.90.0.0/16`
- Two public `/20` subnets host the internet-facing ALB
- Two private `/20` subnets host the EKS worker nodes
- The application is deployed into Kubernetes namespace `weather-sim`
- The ingress path is fronted by an ALB with ACM TLS and a regional WAFv2 ACL
- The AWS Load Balancer Controller is installed into the cluster through Terraform and Helm

## Application behavior
- API base path: `/api/v1`
- Roles: `anonymous`, `basic`, `premium`, `admin`
- Sessions are Redis-backed
- `x-api-key` is required on weather endpoints
- `GET /api/v1/weather/current` requires a valid API key, but not a session
- `GET /api/v1/weather/premium-forecast` requires both a valid API key and a `premium` or `admin` session
- Health endpoints:
  - `/api/v1/system/live`
  - `/api/v1/system/ready`
  - `/api/v1/system/health`
  - `/api/v1/system/version`

## Local development
The local stack lives under `app/`.

```bash
cd app
cp .env.example .env
docker compose up --build
```

Local endpoints:
- Web UI: `http://localhost:5173`
- API base: `http://localhost:8080/api/v1`
- Health: `http://localhost:8080/api/v1/system/health`

Local services:
- `redis`
- `api`
- `web`
- `fluent-bit`

## Application workspace commands
Run from `app/`:

```bash
npm run build
npm run test
npm run lint
```

Current note:
- The `backend` and `frontend` package test scripts are still placeholders

## Seed users and API keys
Users:
- `admin/admin-pass`
- `basicuser/basic-pass`
- `premiumuser/premium-pass`

API keys:
- `poc-basic-key-001`
- `poc-premium-key-001`
- `poc-admin-key-001`

## Terraform
Run from `terraform/`:

```bash
terraform init -backend=false
terraform validate
terraform test
```

To plan or apply the POC environment:

```bash
terraform init
terraform plan -var-file=environments/poc/terraform.tfvars
terraform apply -var-file=environments/poc/terraform.tfvars
```

Terraform currently provisions:
- VPC, subnets, IGW, NAT, and route tables
- ECR repositories
- EKS cluster and managed node group
- AWS Load Balancer Controller IAM and Helm release
- ACM certificate with Route53 validation
- WAFv2 ACL
- Application Helm release
- DNS record for the application hostname

Terraform test coverage currently includes:
- Networking module unit tests
- EKS module unit tests
- Root stack integration-style composition tests with mocked providers

## Important limitations
- This repository does not currently provision a production Redis deployment for the EKS environment, even though the application requires Redis-backed sessions
- An Application Load Balancer cannot have an Elastic IP attached directly; if static public IPs are required later, use AWS Global Accelerator or redesign the entry path

## API docs and test assets
The repository now includes multiple ways to inspect and test the API:
- [Runbook](/./docs/runbook.md): deployment checks, default credentials, valid `x-api-key` values, and `curl` commands for every endpoint
- [OpenAPI Spec](/./docs/openapi.yaml): the API contract in OpenAPI 3.0 format
- [Swagger UI Page](/./docs/swagger.html): browser-based interactive API explorer
- [Postman Collection](/./docs/postman/weather-sim.postman_collection.json): ready-to-import collection covering system, auth, weather, and negative authorization tests

For local API testing:
- Start the application from `app/`
- Use `http://localhost:8080/api/v1` as the base URL
- Use `http://localhost:8080/api/v1/system/health` as the fastest connectivity check

## Related docs
- [Architecture](/./docs/architecture.md)
- [Contracts](/./docs/contracts.md)
- [Local Development](/./docs/local-development.md)
- [Runbook](/./docs/runbook.md)
- [DAST Scenarios](/./docs/dast-scenarios.md)
- [OpenAPI Spec](/./docs/openapi.yaml)
- [Swagger UI Page](/./docs/swagger.html)
- [Postman Collection](/./docs/postman/weather-sim.postman_collection.json)
