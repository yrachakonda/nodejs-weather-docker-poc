# Testing Guide

## Current State
This repository currently has:
- backend unit and integration tests with Vitest and Supertest
- frontend component and route-level tests with Vitest, Testing Library, and JSDOM
- Playwright smoke and E2E browser coverage
- local perf, load, stress, and soak scripts with `k6`
- automated Terraform validation and tests
- manual API validation assets through `curl`, Swagger, and Postman
- a Python-based AWS architecture diagram source under `docs/diagrams/`

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
| Manual API verification | Exercise auth and weather flows without Playwright. | `curl`, Swagger, and Postman requests against the local or deployed API. | Browser automation, repeatable CI gating, or load characteristics. | See `docs/runbook.md`. |

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

### Terraform Checks
- Terraform installed locally
- `terraform init -backend=false` must run before `terraform validate` or `terraform test`
- Terraform tests now also assert the split edge: web ingress, API Gateway, WAF association, and the private API integration path

### Diagram Rendering
- Python 3.13 or later
- `pip install diagrams graphviz`
- Graphviz `dot` available on `PATH`

Run the diagram renderer from the repo root:

```powershell
docs\diagrams\generate_architecture_diagram.ps1
```

That wrapper invokes `docs/diagrams/architecture_diagram.py` and renders the architecture diagram artifact(s) next to the script.

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

### Terraform Validation and Tests
Run from `terraform/`:

```bash
terraform init -backend=false
terraform validate
terraform test
```

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

### Option 2: Postman
- Import `app/tests/postman/weather-sim.postman_collection.json`
- Set `baseUrl` to either `http://localhost:8080/api/v1` or the deployed API URL such as `https://api.example.com/api/v1`
- Set `apiKey` to `poc-premium-key-001`
- Set `basicApiKey` when you want to exercise the negative authorization requests
- Use the collection variables for `premiumUsername`, `premiumPassword`, `basicUsername`, and `basicPassword` if the target deployment does not use the default seeded values
- Run the system, auth, weather, and negative authorization folders in order

### Option 3: Swagger
- Start the stack with Docker Compose
- Open `docs/swagger.html`
- Set the server URL to `http://localhost:8080/api/v1`
- Use `Authorize` for API-key-backed weather requests
- Use `/auth/login` first if you want to test cookie-backed routes

## CI-Friendly Execution Order
Use this order for fast failure and parity with the current pipeline design:

1. From `app/`, run `npm ci`.
2. From `app/`, run `npm run build`.
3. From `app/`, run `npm run test`.
4. From `app/`, run `npm run test:e2e:install`.
5. Start `app/docker-compose.yml`.
6. From `app/`, run `npm run test:e2e:smoke`.
7. From `app/`, run `npm run test:e2e`.
8. From `terraform/`, run `terraform init -backend=false`.
9. From `terraform/`, run `terraform validate`.
10. From `terraform/`, run `terraform test`.

Use the same order against a deployed environment after the deployment step, but replace steps 6 and 7 with the remote Playwright commands.

## Where Tests and Test Assets Live
- Application workspace scripts: `app/package.json`, `app/backend/package.json`, `app/frontend/package.json`
- Backend tests: `app/tests/backend/`
- Frontend tests: `app/tests/frontend/`
- Playwright E2E and smoke tests: `app/tests/e2e/` and `app/playwright.config.ts`
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
