# Weather Simulation DAST POC

Production-style proof-of-concept platform for validating DAST controls in Azure DevOps.

## Stack
- React + TypeScript frontend (`frontend`)
- Express + TypeScript backend (`backend`)
- Redis-backed session storage
- Winston JSON logs with correlation IDs
- Fluent Bit sidecar forwarding to CloudWatch
- Docker Compose local runtime
- Helm chart for EKS
- Terraform app/platform layer
- Azure DevOps YAML pipeline with ZAP + Rapid7 stage placeholders

## Quick start
```bash
docker compose up --build
```

- Web: `http://localhost:3000`
- API: `http://localhost:8080/api/v1`
- OpenAPI UI: `http://localhost:8080/api-docs`

## Seed users
All seeded users use password: `Password123!`
- `admin` (admin, premium)
- `basicuser` (basic)
- `premiumuser` (premium)

## Seed API keys
- basic: `basic-key-123`
- premium: `premium-key-123`
- admin: `admin-key-123`
