# Weather Simulation Platform POC

This repository contains a full-stack TypeScript weather simulation platform to validate DAST and DevSecOps controls in Azure DevOps.

## Wave 0 Contract Lock (Frozen)
- Roles: `anonymous`, `basic`, `premium`, `admin`.
- API base: `/api/v1`.
- Auth: Redis-backed server session cookie.
- API key header: `x-api-key` on weather endpoints.
- Health: `/api/v1/system/live`, `/ready`, `/health`, `/version`.
- Log group: `/weather-sim/poc/app`.

## Repository structure
- `backend/`: Express + TypeScript API.
- `frontend/`: React + TypeScript UI.
- `charts/weather-sim/`: Helm chart.
- `terraform/`: AWS infrastructure.
- `pipelines/`: Azure DevOps pipeline templates.
- `docs/`: architecture, runbook, local-dev, DAST scenarios.

## Local start
```bash
cp .env.example .env
docker compose up --build
```

## Seed personas
- `admin/admin-pass` (admin)
- `basicuser/basic-pass` (basic)
- `premiumuser/premium-pass` (premium)

## API keys
- `poc-basic-key-001`
- `poc-premium-key-001`
- `poc-admin-key-001`
