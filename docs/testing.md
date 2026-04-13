# Testing Guide

## Table of Contents
- [Current State](#current-state)
- [Test Inventory](#test-inventory)
- [Prerequisites](#prerequisites)
  - [Application and Docker-Based Checks](#application-and-docker-based-checks)
  - [Terraform Checks](#terraform-checks)
  - [Helm Deployment Checks](#helm-deployment-checks)
  - [Diagram Rendering](#diagram-rendering)
- [Exact Commands](#exact-commands)
  - [Application Test Commands](#application-test-commands)
  - [Terraform Validation and Tests](#terraform-validation-and-tests)
  - [Helm Chart Validation and KinD Smoke Tests](#helm-chart-validation-and-kind-smoke-tests)
  - [Observability Helm Validation and KinD Integration Tests](#observability-helm-validation-and-kind-integration-tests)
- [Smoke With Docker Compose](#smoke-with-docker-compose)
- [Remote Playwright Execution](#remote-playwright-execution)
- [Deployed AWS Edge Checks](#deployed-aws-edge-checks)
- [E2E With Docker Compose](#e2e-with-docker-compose)
- [Manual API Verification](#manual-api-verification)
  - [Option 1: `curl`](#option-1-curl)
  - [Option 2: Postman](#option-2-postman)
  - [Option 3: Swagger](#option-3-swagger)
- [CI-Friendly Execution Order](#ci-friendly-execution-order)
- [Where Tests and Test Assets Live](#where-tests-and-test-assets-live)
- [Troubleshooting](#troubleshooting)

## Current State
This repository currently has:
- backend unit and integration tests with Vitest and Supertest
- frontend component and route-level tests with Vitest, Testing Library, and JSDOM
- Playwright smoke and E2E browser coverage
- local perf, load, stress, and soak scripts with `k6`
- automated Terraform validation and tests
- automated Helm render and KinD integration tests for `app/deployment/weather-sim/charts`
- PowerShell-based manual Helm and KinD smoke scripts for `app/deployment/weather-sim/charts`
- automated Helm render and KinD integration tests for `app/deployment/observability-stack` backed by the real sibling charts under `app/deployment/{elasticsearch,kibana,kafka,fluent-bit,logstash}`
- manual API validation assets through `curl`, Swagger, and Postman
- a Python-based AWS architecture diagram source under `docs/diagrams/`

[Back to Table of Contents](#table-of-contents)

## Test Inventory
| Suite | Purpose | What it runs today | What it does not prove | Command |
| --- | --- | --- | --- | --- |
| Backend tests | Check API routes, auth/session behavior, role enforcement, and middleware logic without Docker. | Vitest runs unit and integration suites from `app/tests/backend/`. | Browser behavior, Compose wiring, or real Redis connectivity. | `npm run test -w backend` |
| Frontend tests | Check React rendering, routing, auth context, form behavior, and API error states in JSDOM. | Vitest runs `*.test.tsx` files from `app/tests/frontend/` against the React app in `app/frontend/src/`. | Real browser execution, container networking, or backend API reachability. | `npm run test -w frontend` |
| Workspace aggregate test | Match the app CI stage. | Runs backend tests, then frontend tests. | Playwright browser flows, Compose startup, or infrastructure correctness. | `npm run test` |
| E2E | Exercise browser-backed user journeys end to end against an already-running target. | Playwright runs all specs in `app/tests/e2e/` against the configured web app and API. | Throughput, long-duration stability, cross-browser coverage, or infrastructure certification. | `npm run test:e2e` or `npm run test:e2e:remote -- --base-url <web> --api-base-url <api>` |
| Smoke | Fail fast on the minimum browser and API checks before running broader E2E coverage. | Playwright runs only tests tagged `@smoke`. | Full auth coverage, role transitions, or UI edge cases. | `npm run test:e2e:smoke` or `npm run test:e2e:remote:smoke -- --base-url <web> --api-base-url <api>` |
| Perf / load / stress / soak | Exercise local non-functional checks against the API with `k6`. | Scripted baseline, load, stress, and soak runs are checked into `app/tests/perf/`. | Production benchmarking, cluster-scale capacity claims, or SLO certification. | `npm run perf:baseline`, `npm run perf:load`, `npm run perf:stress`, `npm run perf:soak` |
| Terraform validation and tests | Validate IaC syntax and run Terraform test cases. | `terraform validate` plus tests under `terraform/tests/`. | Application behavior, image correctness, Kubernetes runtime health, or Redis availability. | `terraform init -backend=false && terraform validate && terraform test` |
| Helm render unit tests | Validate Helm rendering across all weather-sim values files without creating a cluster. | Vitest shells out to `helm lint` and `helm template` from `app/tests/deployment/helm/weather-sim/unit/`. | Runtime pod health, image pull behavior, or live service reachability. | `npm run test:helm:weather-sim:unit` |
| Helm KinD integration tests | Validate the chart install and upgrade path inside KinD with a Testcontainers-managed local registry and fixture images. | Vitest provisions the harness from `app/tests/deployment/helm/weather-sim/integration/` and `kind-fixtures/`. | AWS-specific ingress behavior, Terraform-managed infrastructure, or production load balancers. | `npm run test:helm:weather-sim:integration` |
| Observability render unit tests | Validate the umbrella observability chart against the real sibling charts without creating a cluster. | Vitest copies the checked-in component charts into a temporary workspace, runs `helm dependency build`, then shells out to `helm lint` and `helm template` on the umbrella chart. | Real cluster scheduling, container health, or persistent volume binding in KinD. | `npm run test:helm:observability:unit` |
| Observability KinD integration tests | Validate the umbrella chart install and the basic stack wiring inside KinD with Testcontainers-managed fixture images and a real Kafka broker image. | Vitest starts a local registry through Testcontainers, mirrors the chart-compatible fixture images plus the Kafka broker image into it, loads those images into KinD, installs the umbrella chart into `observability`, and checks the rendered config plus the live health endpoints. | Production-scale storage, full Elasticsearch or Logstash protocol compatibility, or managed Kubernetes storage classes. | `npm run test:helm:observability:integration` |
| Manual Helm and KinD checks | Provide operator-run validation paths for chart rendering and an end-to-end local smoke flow. | Python helpers in `app/tests/deployment/helm/weather-sim/manual/` lint, render, and smoke test the chart against KinD. | CI gating, repeatable assertions across all chart variants, or automated upgrade coverage. | `python app/tests/deployment/helm/weather-sim/manual/Invoke-WeatherSimHelmChecks.py` and `python app/tests/deployment/helm/weather-sim/manual/Invoke-WeatherSimKindSmoke.py` |
| Manual API verification | Exercise auth and weather flows without Playwright. | `curl`, Swagger, and Postman requests against the local or deployed API. | Browser automation, repeatable CI gating, or load characteristics. | See `docs/runbook.md`. |

[Back to Table of Contents](#table-of-contents)

## Prerequisites

### Application and Docker-Based Checks
- Docker Desktop or Docker Engine with Docker Compose support
- Node.js 22.x and npm if you want to run workspace scripts outside containers
- Playwright browser binaries for browser-based suites:

```bash
cd app
npm run test:e2e:install
```

- a copied env file:

```bash
cd app
cp .env.example .env
```

Required local assumptions:
- ports `5173`, `8080`, `5601`, `8081`, `9200`, `9092`, `24224`, and `5044` are free
- Docker can build local images from `app/backend` and `app/frontend`
- the `.env` file provides `SESSION_SECRET`

Local Docker Compose runtime values:
- API: `NODE_ENV=development`, `API_PORT=8080`, `REDIS_URL=redis://redis:6379`
- Web: `VITE_API_BASE_URL=http://localhost:8080/api/v1`
- CORS: `CORS_ORIGIN=http://localhost:5173`
- Rate limit: `RATE_LIMIT_WINDOW_MS=60000`, `RATE_LIMIT_MAX=120`

Playwright runtime values:
- `PLAYWRIGHT_BASE_URL` defaults to `http://localhost:5173`
- `PLAYWRIGHT_API_BASE_URL` defaults to `http://localhost:8080/api/v1`
- `PLAYWRIGHT_IGNORE_HTTPS_ERRORS=true` is optional for self-signed or lab TLS targets

[Back to Table of Contents](#table-of-contents)

### Terraform Checks
- Terraform installed locally
- `terraform init -backend=false` must run before `terraform validate` or `terraform test`
- Terraform tests now also assert the split edge: web ingress, API Gateway, WAF association, and the private API integration path

[Back to Table of Contents](#table-of-contents)

### Helm Deployment Checks
- Helm 3 installed locally
- `kubectl` installed and configured for the KinD integration suite or manual KinD smoke flow
- KinD and Docker installed if you want to run the local cluster smoke flow
- `npm ci` run from `app/` so `vitest` and `testcontainers` are available for the automated Helm suites
- The observability KinD suite also needs Docker because it mirrors the chart-compatible fixture images and the Kafka broker image into a Testcontainers-managed registry before loading them into KinD
- PowerShell 7+ is recommended for the helper scripts in `app/tests/deployment/helm/weather-sim/manual/`
- A local cluster is not required for the render-only Helm checks
- The manual KinD smoke helper provisions `redis-master` in-cluster because the chart expects `redis-master:6379`
- The observability test harness copies the real sibling charts into a temporary workspace at runtime, so it does not mutate the repo while still exercising the file:// dependencies

[Back to Table of Contents](#table-of-contents)

### Diagram Rendering
- Python 3.13 or later
- `pip install diagrams graphviz`
- Graphviz `dot` available on `PATH`

Run the diagram renderer from the repo root:

```powershell
docs\diagrams\generate_architecture_diagram.ps1
```

That wrapper invokes `docs/diagrams/architecture_diagram.py` and renders the architecture diagram artifact(s) next to the script.

[Back to Table of Contents](#table-of-contents)

## Exact Commands

### Application Test Commands
Run from `app/`:

```bash
npm ci
npm run build
npm run test
```

Target a single workspace if needed:

```bash
npm run test -w backend
npm run test -w frontend
```

Browser suites:

```bash
npm run test:e2e:install
npm run test:e2e:smoke
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:remote -- --base-url https://web.example.com --api-base-url https://api.example.com/api/v1
npm run test:e2e:remote:smoke -- --base-url https://web.example.com --api-base-url https://api.example.com/api/v1
```

Local perf suites:

```bash
npm run perf:baseline
npm run perf:load
npm run perf:stress
npm run perf:soak
```

[Back to Table of Contents](#table-of-contents)

### Terraform Validation and Tests
Run from `terraform/`:

```bash
terraform init -backend=false
terraform validate
terraform test
```

[Back to Table of Contents](#table-of-contents)

### Helm Chart Validation and KinD Smoke Tests
Run the automated suites from `app/`.

Automated Helm render tests:

```bash
npm run test:helm:weather-sim:unit
```

Automated KinD integration tests:

```bash
npm run test:helm:weather-sim:integration
```

Run both automated suites together:

```bash
npm run test:helm:weather-sim
```

Run the manual scripts from the repository root when you want an operator-driven check.

Render and lint the chart:

```bash
python app/tests/deployment/helm/weather-sim/manual/Invoke-WeatherSimHelmChecks.py
```

Run the local KinD smoke flow:

```bash
python app/tests/deployment/helm/weather-sim/manual/Invoke-WeatherSimKindSmoke.py
```

Useful options for the KinD helper:

```bash
python app/tests/deployment/helm/weather-sim/manual/Invoke-WeatherSimKindSmoke.py --skip-image-build
python app/tests/deployment/helm/weather-sim/manual/Invoke-WeatherSimKindSmoke.py --skip-cleanup
```

What the Helm render check proves:
- the chart renders successfully with `values.yaml`, `values-local.yaml`, `values-dev.yaml`, `values-poc.yaml`, and `values-qa.yaml`
- the rendered output includes the API and web Deployments, Services, ConfigMap, Ingress, HPA, and PodDisruptionBudget
- the chart passes `helm lint` for the covered values combinations

What the automated KinD integration test proves:
- a Testcontainers-managed local registry can supply the fixture images used by the chart
- the chart can be installed and upgraded into KinD with test-safe overrides
- the API and web Deployments become available after install and upgrade
- the ConfigMap, Services, Ingress, HPA, and PodDisruptionBudget are created as expected
- the port-forwarded API and web endpoints answer after deployment

What the manual KinD smoke flow proves:
- the real app images can be built locally and loaded into KinD
- the chart can be installed into a local cluster with the Redis dependency the script provisions
- the API health, login, session, and premium forecast flows still work when the chart is installed into KinD

What these checks do not prove:
- AWS-specific ingress annotations and load balancer behavior
- Terraform-managed networking, API Gateway, or WAF integration
- production-scale load, soak, or failover characteristics

[Back to Table of Contents](#table-of-contents)

### Observability Helm Validation and KinD Integration Tests
Run these from `app/`.

Automated observability render tests:

```bash
npm run test:helm:observability:unit
```

Automated observability KinD integration tests:

```bash
npm run test:helm:observability:integration
```

Run both observability suites together:

```bash
npm run test:helm:observability
```

What the render suite proves:
- the umbrella chart declares local file dependencies on `elasticsearch`, `kibana`, `kafka`, `fluent-bit`, and `logstash`
- the stack renders the expected StatefulSets, Deployments, DaemonSet, Job, Services, ConfigMaps, and storage templates
- the chart wiring still references the repository config files for Elasticsearch, Kibana, Kafka topic bootstrap, Fluent Bit, and Logstash

What the KinD suite proves:
- Testcontainers can start the temporary local registry used by the mirrored images
- the mirrored fixture images and Kafka broker image can be pushed, pulled, loaded into KinD, and used by the umbrella chart
- the release can be installed into the `observability` namespace and the workloads become ready
- the key services answer the expected health endpoints and expose the configuration wiring used by the stack
- the suite keeps persistence disabled in the KinD install so it does not depend on a local storage provisioner

What these checks do not prove:
- production-scale persistent storage provisioning or storage-class behavior in KinD
- full upstream Elasticsearch, Kibana, Fluent Bit, or Logstash runtime behavior
- cloud-managed ingress, WAF, or EKS-specific runtime details

[Back to Table of Contents](#table-of-contents)

## Smoke With Docker Compose
Run from `app/`:

```bash
cp .env.example .env
docker compose up --build -d
npm run test:e2e:smoke
curl -fsS http://localhost:8080/api/v1/system/health
docker compose down
```

What this proves:
- Redis, API, web, Fluent Bit, Apache Kafka 4.0, Logstash, Elasticsearch, and Kibana containers can start together
- the web app shell loads in Chromium
- the basic API health endpoint responds from the Compose stack

What this does not prove:
- production ingress, TLS, WAF, EKS rollout, external Redis behavior, or API Gateway integration
- Kubernetes DaemonSet tailing of `/var/log/containers`

[Back to Table of Contents](#table-of-contents)

## Remote Playwright Execution
Run from `app/` when you want the same Playwright coverage against a deployed environment instead of Docker Compose.

Exact commands:

```bash
npm run test:e2e:remote -- --base-url https://web.example.com --api-base-url https://api.example.com/api/v1
npm run test:e2e:remote:smoke -- --base-url https://web.example.com --api-base-url https://api.example.com/api/v1
npm run test:e2e:remote:headed -- --base-url https://web.example.com --api-base-url https://api.example.com/api/v1
```

Optional variant for self-signed or lab certificates:

```bash
npm run test:e2e:remote -- --base-url https://web.example.com --api-base-url https://api.example.com/api/v1 --ignore-https-errors
```

What the remote target must satisfy:
- The web UI at `--base-url` must already be deployed and reachable from the machine running Playwright.
- The API at `--api-base-url` must expose `/system/health`, `/auth/login`, `/auth/me`, `/weather/current`, and `/weather/premium-forecast`.
- The deployed frontend must already be configured to call the deployed API. In this repo that means `VITE_API_BASE_URL` was set correctly at build time.
- The API must allow the frontend origin through `CORS_ORIGIN`.
- Seeded users must exist with the credentials used in `app/tests/e2e/test-data.ts`: `basicuser/basic-pass` and `premiumuser/premium-pass`.
- Session cookies must work for the deployment shape. Same-origin or a cookie-compatible frontend/API setup is the safest configuration.

What this proves:
- The deployed web app shell loads in Chromium.
- Browser login, session reuse, and role-gated weather flows still work after deployment.
- The API health endpoint remains reachable at the deployed API base URL.

What this does not prove:
- Multi-browser compatibility beyond Chromium.
- Long-duration resilience, load, or soak characteristics.
- WAF policy completeness, API Gateway quota behavior, or infrastructure internals beyond externally visible behavior.

[Back to Table of Contents](#table-of-contents)

## Deployed AWS Edge Checks
Use the URLs from `terraform output`:
- Web UI should resolve to the ALB hostname
- API should resolve to the API Gateway invoke URL or custom domain

Useful checks:

```bash
export WEB_URL="https://<web-hostname>"
export API_URL="https://<api-gateway-host>/api/v1"

curl -fsS "${API_URL}/system/health"
curl -fsS "${API_URL}/system/live"
curl -fsS "${API_URL}/system/ready"
```

What this proves:
- the API is reachable through API Gateway
- the web UI is still reachable through the public ALB
- the ALB is no longer the supported public API path

[Back to Table of Contents](#table-of-contents)

## E2E With Docker Compose
Run from `app/` after `docker compose up --build -d`.

Exact commands:

```bash
npm run test:e2e
```

Useful variants:

```bash
npm run test:e2e -- --list
npm run test:e2e:headed
```

What this suite depends on:
- Docker Compose must already be running
- the web app must be reachable at `PLAYWRIGHT_BASE_URL` or `http://localhost:5173`
- the API must be reachable at `PLAYWRIGHT_API_BASE_URL` or `http://localhost:8080/api/v1`
- Playwright Chromium must already be installed

[Back to Table of Contents](#table-of-contents)

## Manual API Verification
### Option 1: `curl`
Set variables:

```bash
export BASE_URL="http://localhost:8080/api/v1"
export API_KEY="poc-premium-key-001"
export BASIC_API_KEY="poc-basic-key-001"
export COOKIE_JAR="./weather-sim.cookies.txt"
```

Then run:

```bash
curl -i -c "${COOKIE_JAR}" -H "Content-Type: application/json" -X POST "${BASE_URL}/auth/login" -d '{"username":"premiumuser","password":"premium-pass"}'
curl -i -b "${COOKIE_JAR}" "${BASE_URL}/auth/me"
curl -i -b "${COOKIE_JAR}" "${BASE_URL}/weather/current?location=seattle"
curl -i -b "${COOKIE_JAR}" "${BASE_URL}/weather/premium-forecast?location=seattle"
curl -i -H "x-api-key: ${BASIC_API_KEY}" "${BASE_URL}/weather/premium-forecast?location=seattle"
```

[Back to Table of Contents](#table-of-contents)

### Option 2: Postman
- Import `app/tests/postman/weather-sim.postman_collection.json`
- Set `baseUrl` to either `http://localhost:8080/api/v1` or the deployed API URL such as `https://api.example.com/api/v1`
- Set `apiKey` to `poc-premium-key-001`
- Set `basicApiKey` when you want to exercise the negative authorization requests
- Use the collection variables for `premiumUsername`, `premiumPassword`, `basicUsername`, and `basicPassword` if the target deployment does not use the default seeded values
- Run the system, auth, weather, and negative authorization folders in order

[Back to Table of Contents](#table-of-contents)

### Option 3: Swagger
- Start the stack with Docker Compose
- Open `docs/swagger.html`
- Set the server URL to `http://localhost:8080/api/v1`
- Use `Authorize` for API-key-backed weather requests
- Use `/auth/login` first if you want to test cookie-backed routes

[Back to Table of Contents](#table-of-contents)

## CI-Friendly Execution Order
Use this order for fast failure and parity with the current pipeline design:

1. From `app/`, run `npm ci`.
2. From `app/`, run `npm run build`.
3. From `app/`, run `npm run test`.
4. From `app/`, run `npm run test:e2e:install`.
5. Start `app/docker-compose.yml`.
6. From `app/`, run `npm run test:e2e:smoke`.
7. From `app/`, run `npm run test:e2e`.
8. From `app/`, run `npm run test:helm:weather-sim:unit`.
9. From `app/`, run `npm run test:helm:weather-sim:integration`.
10. From `app/`, run `npm run test:helm:observability:unit`.
11. From `app/`, run `npm run test:helm:observability:integration`.
12. From `terraform/`, run `terraform init -backend=false`.
13. From `terraform/`, run `terraform validate`.
14. From `terraform/`, run `terraform test`.

Use the same order against a deployed environment after the deployment step, but replace steps 6 and 7 with the remote Playwright commands.

[Back to Table of Contents](#table-of-contents)

## Where Tests and Test Assets Live
- Application workspace scripts: `app/package.json`, `app/backend/package.json`, `app/frontend/package.json`
- Backend tests: `app/tests/backend/`
- Frontend tests: `app/tests/frontend/`
- Playwright E2E and smoke tests: `app/tests/e2e/` and `app/playwright.config.ts`
- Helm render helpers and unit tests: `app/tests/deployment/helm/weather-sim/support/` and `app/tests/deployment/helm/weather-sim/unit/`
- Helm KinD integration tests and fixture harness: `app/tests/deployment/helm/weather-sim/integration/` and `app/tests/deployment/helm/weather-sim/kind-fixtures/`
- Helm manual checks and manual KinD smoke assets: `app/tests/deployment/helm/weather-sim/manual/`
- Observability umbrella and component charts: `app/deployment/observability-stack/`, `app/deployment/elasticsearch/`, `app/deployment/kibana/`, `app/deployment/kafka/`, `app/deployment/fluent-bit/`, and `app/deployment/logstash/`
- Observability render helpers and unit tests: `app/tests/deployment/observability/support/` and `app/tests/deployment/observability/unit/`
- Observability KinD integration tests and fixture harness: `app/tests/deployment/observability/integration/` and `app/tests/deployment/observability/kind-fixtures/`
- Playwright remote runner: `app/scripts/run-playwright-remote.mjs`
- Local perf scripts: `app/tests/perf/`
- Postman collection: `app/tests/postman/weather-sim.postman_collection.json`
- Terraform tests: `terraform/tests/`
- Local stack definition: `app/docker-compose.yml`
- Manual API smoke and E2E commands: `docs/runbook.md`
- OpenAPI contract: `docs/openapi.yaml`
- Contract summary and behavioral expectations: `docs/contracts.md`
- DAST checklist and hostile-path scenarios: `docs/dast-scenarios.md`
- Browser API explorer: `docs/swagger.html`
- Architecture diagram source, render wrapper, and rendered PNG: `docs/diagrams/`

[Back to Table of Contents](#table-of-contents)

## Troubleshooting
- `npm ci` fails because the lockfile is out of sync: regenerate `app/package-lock.json` before relying on CI-style installs.
- `terraform test` fails with `Module not installed`: run `terraform init -backend=false` first.
- `docker compose up --build` fails on port binding: free ports `5173`, `8080`, `5601`, `8081`, `9200`, `9092`, `24224`, or `5044`, then retry.
- `npm run test:e2e` fails immediately with browser errors: run `npm run test:e2e:install`.
- `npm run test:e2e` fails on navigation or API requests: confirm Docker Compose is already running and the Playwright base URLs point to the right ports.
- `npm run test:e2e:remote` fails before Playwright starts: pass both `--base-url` and `--api-base-url`, or set `PLAYWRIGHT_BASE_URL` and `PLAYWRIGHT_API_BASE_URL`.
- Remote Playwright login succeeds in the browser but API assertions fail: confirm the deployed frontend was built with the deployed `VITE_API_BASE_URL`, and confirm `CORS_ORIGIN` allows the frontend origin.
- Remote Playwright login fails only on HTTPS environments: confirm secure cookies and same-site behavior are compatible with the deployment, and use `--ignore-https-errors` only for certificate issues, not as a general fix.
- API health endpoints fail while containers are still starting: use `docker compose ps` and `docker compose logs api redis fluent-bit kafka logstash elasticsearch kibana`.
- Login or session-backed weather requests fail: confirm Redis is running and the cookie jar file is being reused between requests.
- Browser requests from the web app fail with CORS issues: confirm the API is using `CORS_ORIGIN=http://localhost:5173`.
- Kibana is empty: confirm Logstash is reading `weather-sim.logs` and Elasticsearch health is green.
- `docker compose logs api` is sparse: API logs are forwarded through the `fluent-bit` container; inspect `docker compose logs fluent-bit` as well.
- Deployed smoke checks fail after rollout: confirm the web hostname resolves, the ALB is healthy, the API Gateway invoke URL resolves, and `/api/v1/system/health` is reachable through the API Gateway edge.
- Diagram rendering fails: confirm `diagrams`, Graphviz, and the `dot` executable are installed.

[Back to Table of Contents](#table-of-contents)
