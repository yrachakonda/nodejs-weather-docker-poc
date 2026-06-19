# Agents Guide

This file defines practical agent roles and operating rules for this repository.

## Purpose

Use agents to parallelize work across:
- TypeScript application development in `app/backend` and `app/frontend`
- Helm chart and deployment validation in `app/deployment`
- AWS infrastructure as code in `terraform`
- Test automation in `app/tests` and `terraform/tests`

## Repository Initialization

Run these once after clone:

```powershell
Set-Location app
npm ci

Set-Location ..\terraform
terraform init -backend=false
```

Optional local E2E browser setup:

```powershell
Set-Location app
npm run test:e2e:install
```

## Agent Roles

### 1) App Agent

Scope:
- `app/backend/src`
- `app/frontend/src`
- `docs/openapi.yaml` and `docs/contracts.md` when API contracts change

Responsibilities:
- implement API and UI features
- keep request/response contracts aligned
- add or update backend/frontend unit tests

Standard commands:

```powershell
Set-Location app
npm run build
npm run test
```

### 2) Deployment Agent

Scope:
- `app/deployment/**`
- `helm-values/**`
- `manifests/**`

Responsibilities:
- update Helm chart values and templates
- preserve local and EKS deployment compatibility
- validate chart rendering and integration paths

Standard commands:

```powershell
Set-Location app
npm run test:helm:weather-sim
npm run test:helm:observability
```

### 3) Terraform Agent

Scope:
- `terraform/main.tf`
- `terraform/modules/**`
- `terraform/environments/**`
- `terraform/tests/**`

Responsibilities:
- change AWS infrastructure safely
- keep modules reusable and environment-aware
- update tests with infra behavior changes

Standard commands:

```powershell
Set-Location terraform
terraform fmt -recursive
terraform validate
terraform test
```

### 4) Quality Agent

Scope:
- cross-cutting validation across app, deployment, and infra

Responsibilities:
- run targeted and full test suites
- identify regressions before merge
- verify documentation matches behavior

Standard commands:

```powershell
Set-Location app
npm run test
npm run test:e2e:smoke

Set-Location ..\terraform
terraform test
```

## CI/CD Mapping

Primary pipeline files:
- `azure-pipelines.yml`: application build and test entry pipeline
- `azure-pipelines-terraform.yml`: Terraform validation and deployment entry pipeline
- `pipelines/templates/build-test.yml`: app build and test template
- `pipelines/templates/containerize.yml`: container image build and publish template
- `pipelines/templates/deploy.yml`: application deployment template
- `pipelines/templates/terraform-validate.yml`: Terraform validate and test template
- `pipelines/templates/terraform-deploy.yml`: Terraform plan/apply template

Agent ownership in CI/CD:
- App Agent owns failures in application build, unit tests, and frontend/backend packaging stages.
- Deployment Agent owns Helm chart lint/render/integration failures and manifest or values regressions.
- Terraform Agent owns Terraform fmt/validate/test/plan/apply failures and module contract regressions.
- Quality Agent owns cross-stage failures, flaky tests, and release-gate verification.

Suggested CI execution order:
1. App build and unit tests.
2. Helm render and chart integration tests.
3. Terraform validate and terraform test.
4. Containerize and deploy stages.

## Folder Ownership Mapping

Use this mapping to route work and reviews to the right agent.

| Folder | Primary Owner | Secondary Owner | Notes |
| --- | --- | --- | --- |
| `app/backend/**` | App Agent | Quality Agent | API logic, middleware, service behavior, backend tests |
| `app/frontend/**` | App Agent | Quality Agent | React UI flows, routing, and frontend tests |
| `app/tests/backend/**` | App Agent | Quality Agent | Backend unit/integration test assets |
| `app/tests/frontend/**` | App Agent | Quality Agent | Frontend component and route tests |
| `app/tests/e2e/**` | Quality Agent | App Agent | Smoke and end-to-end browser validation |
| `app/tests/deployment/**` | Deployment Agent | Quality Agent | Helm unit/integration/manual validation harnesses |
| `app/deployment/**` | Deployment Agent | Quality Agent | Helm charts and chart dependencies |
| `helm-values/**` | Deployment Agent | Terraform Agent | Environment-specific Helm values overlays |
| `manifests/**` | Deployment Agent | Terraform Agent | Kubernetes manifests and generated overlays |
| `terraform/modules/**` | Terraform Agent | Quality Agent | Reusable AWS infrastructure modules |
| `terraform/environments/**` | Terraform Agent | Deployment Agent | Environment composition and variable overlays |
| `terraform/tests/**` | Terraform Agent | Quality Agent | Unit and integration `.tftest.hcl` suites |
| `pipelines/**` | Quality Agent | App/Deployment/Terraform Agents | Shared CI/CD templates and release wiring |
| `docs/**` | Quality Agent | Relevant domain agent | Keep runbooks, contracts, and architecture aligned |

Escalation rule:
- If a change touches more than one primary ownership area, Quality Agent coordinates integration and release readiness.

## Troubleshooting

Use this section for first-response actions when CI fails.

Common failures and first checks:
- App build or unit test failed:
	- `Set-Location app`
	- `npm run build`
	- `npm run test`
- Helm validation or integration failed:
	- `Set-Location app`
	- `npm run test:helm:weather-sim`
	- `npm run test:helm:observability`
- Terraform validation or test failed:
	- `Set-Location terraform`
	- `terraform init -backend=false`
	- `terraform validate`
	- `terraform test`
- Playwright smoke or E2E failed:
	- `Set-Location app`
	- `npm run test:e2e:install`
	- `npm run test:e2e:smoke`

Fast triage commands:
- Show changed files: `git status --short`
- Re-run a focused Terraform test file: `terraform test -filter=tests/eks_unit.tftest.hcl`
- Re-run a focused app test area: `npm run test -w backend` or `npm run test -w frontend`

## Working Agreements

- Prefer small, reviewable changes.
- Do not mix unrelated app, Helm, and Terraform edits in a single change set.
- Update docs when behavior, commands, or architecture changes.
- Keep secrets out of code and use environment variables or secret stores.
- Run the narrowest useful test suite first, then broaden to full validation.

## Definition of Done

A task is complete when:
- code builds for affected areas
- relevant tests pass
- deployment/infra checks pass for touched scope
- docs are updated if behavior changed
