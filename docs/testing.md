# Testing Guide

## Current state
This repository currently has:
- backend unit and integration tests with Vitest and Supertest
- frontend component and route-level tests with Vitest, Testing Library, and JSDOM
- Playwright smoke and E2E browser coverage
- local perf, load, stress, and soak scripts with `k6`
- automated Terraform validation and tests
- manual API validation assets through `curl`, Swagger, and Postman
- deployed-environment smoke coverage in Azure Pipelines

Use this guide as the source of truth for what can be run today.

## Test inventory
| Suite | Purpose | What it runs today | What it does not prove | Command | Files |
| --- | --- | --- | --- | --- | --- |
| Backend tests | Check API routes, auth/session behavior, role enforcement, and middleware logic without Docker. | Vitest runs unit and integration suites from `app/tests/backend/`. | Browser behavior, Compose wiring, ALB ingress, or real Redis connectivity. | `npm run test -w backend` | `app/tests/backend/setup.ts`, `app/tests/backend/unit/auth-middleware.test.ts`, `app/tests/backend/integration/app.test.ts`, `app/backend/vitest.config.ts` |
| Frontend tests | Check React rendering, routing, auth context, form behavior, and API error states in JSDOM. | Vitest runs `*.test.tsx` files from `app/tests/frontend/` against the React app in `app/frontend/src/`. | Real browser execution, container networking, or backend API reachability. | `npm run test -w frontend` | `app/tests/frontend/**/*.test.tsx`, `app/tests/frontend/support/setup.ts`, `app/frontend/vite.config.ts` |
| Workspace aggregate test | Match the app CI stage. | Runs backend tests, then frontend tests. | Playwright browser flows, Compose startup, or infrastructure correctness. | `npm run test` | `app/package.json` |
| E2E | Exercise browser-backed user journeys end to end against the running local stack. | Playwright runs all specs in `app/tests/e2e/` against an already-running app and API. | Throughput, long-duration stability, cross-browser coverage, or deployed ingress behavior. | `npm run test:e2e` | `app/tests/e2e/weather.e2e.spec.ts`, `app/playwright.config.ts` |
| Smoke | Fail fast on the minimum browser and API checks before running broader E2E coverage. | Playwright runs only tests tagged `@smoke`. | Full auth coverage, role transitions, or UI edge cases. | `npm run test:e2e:smoke` | `app/tests/e2e/smoke.spec.ts`, `app/playwright.config.ts` |
| Perf / load / stress / soak | Exercise local non-functional checks against the API with `k6`. | Scripted baseline, load, stress, and soak runs are checked into `app/tests/perf/`. | Production benchmarking, cluster-scale capacity claims, or cross-environment SLO certification. | `npm run perf:baseline`, `npm run perf:load`, `npm run perf:stress`, `npm run perf:soak` | `app/tests/perf/baseline.js`, `app/tests/perf/load.js`, `app/tests/perf/stress.js`, `app/tests/perf/soak.js`, `app/tests/perf/lib/scenarios.js` |
| Terraform validation and tests | Validate IaC syntax and run Terraform test cases. | `terraform validate` plus tests under `terraform/tests/`. | Application behavior, image correctness, Kubernetes runtime health, or Redis availability. | `terraform init -backend=false && terraform validate && terraform test` | `terraform/tests/networking_unit.tftest.hcl`, `terraform/tests/eks_unit.tftest.hcl`, `terraform/tests/stack_integration.tftest.hcl` |
| Manual API verification | Exercise auth and weather flows without Playwright. | `curl`, Swagger, and Postman requests against the local or deployed API. | Browser automation, repeatable CI gating, or load characteristics. | See [Manual API verification](#manual-api-verification). | `docs/runbook.md`, `docs/postman/weather-sim.postman_collection.json`, `docs/swagger.html` |

## Prerequisites

### Application and Docker-based checks
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
- ports `5173`, `8080`, `6379`, and `24224` are free
- Docker can build local images from `app/backend` and `app/frontend`
- the `.env` file provides `SESSION_SECRET`; `.env.example` also defines `AWS_REGION` and `CLOUDWATCH_LOG_GROUP`

Local Docker Compose runtime values:
- API: `NODE_ENV=development`, `API_PORT=8080`, `REDIS_URL=redis://redis:6379`
- Web: `VITE_API_BASE_URL=http://localhost:8080/api/v1`
- CORS: `CORS_ORIGIN=http://localhost:5173`
- Rate limit: `RATE_LIMIT_WINDOW_MS=60000`, `RATE_LIMIT_MAX=120`

Playwright runtime values:
- `PLAYWRIGHT_BASE_URL` defaults to `http://localhost:5173`
- `PLAYWRIGHT_API_BASE_URL` defaults to `http://localhost:8080/api/v1`
- the Playwright config expects the local stack to already be running before tests start

### Terraform checks
- Terraform installed locally, or follow the CI template behavior and install it before running tests
- `terraform init -backend=false` must run before `terraform validate` or `terraform test`

## Exact commands

### Application test commands
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
```

Local perf suites:

```bash
npm run perf:baseline
npm run perf:load
npm run perf:stress
npm run perf:soak
```

### Terraform validation and tests
Run from `terraform/`:

```bash
terraform init -backend=false
terraform validate
terraform test
```

## Smoke with Docker Compose
Run from `app/`:

```bash
cp .env.example .env
docker compose up --build -d
npm run test:e2e:smoke
curl -fsS http://localhost:8080/api/v1/system/health
docker compose down
```

What this proves:
- Redis, API, web, and Fluent Bit containers can start together
- the web app shell loads in Chromium
- the basic API health endpoint responds from the Compose stack

What this does not prove:
- login/logout journeys
- premium authorization behavior outside the dedicated E2E suite
- production ingress, TLS, WAF, EKS rollout, or external Redis behavior

## E2E with Docker Compose
Run from `app/` after `docker compose up --build -d`.

Exact commands:

```bash
npm run test:e2e
```

Expected outcomes:
- seeded basic user can log in, fetch current weather, and log out
- seeded premium user can open the premium forecast journey
- seeded basic user is blocked from premium forecast UI and direct API access

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

## Manual API verification
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
- Import `docs/postman/weather-sim.postman_collection.json`
- Set `baseUrl` to `http://localhost:8080/api/v1`
- Set `apiKey` to `poc-premium-key-001`
- Run the system, auth, weather, and negative authorization requests in order

### Option 3: Swagger
- Start the stack with Docker Compose
- Open `docs/swagger.html`
- Set the server URL to `http://localhost:8080/api/v1`
- Use `Authorize` for API-key-backed weather requests
- Use `/auth/login` first if you want to test cookie-backed routes

## CI-friendly execution order
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

Pipeline parity today:
- application CI runs `npm ci`, `npm run build`, and `npm run test` from `app/`
- Playwright commands exist locally but are not wired into `azure-pipelines.yml` yet
- infrastructure CI runs `terraform init -backend=false`, `terraform validate`, and `terraform test`
- deploy CI performs a smoke check with `curl -fsS "https://${APP_HOST}/api/v1/system/health"`

## Where tests and test assets live
- Application workspace scripts: `app/package.json`, `app/backend/package.json`, `app/frontend/package.json`
- Backend tests: `app/tests/backend/`
- Frontend tests: `app/tests/frontend/`
- Playwright E2E and smoke tests: `app/tests/e2e/` and `app/playwright.config.ts`
- Local perf scripts: `app/tests/perf/`
- Terraform tests: `terraform/tests/`
- Local stack definition: `app/docker-compose.yml`
- Manual API smoke and E2E commands: `docs/runbook.md`
- Postman collection: `docs/postman/weather-sim.postman_collection.json`
- OpenAPI contract: `docs/openapi.yaml`
- Browser API explorer: `docs/swagger.html`

## Troubleshooting
- `npm ci` fails because the lockfile is out of sync: regenerate `app/package-lock.json` before relying on CI-style installs. In the current checkout, new test dependencies are present in `package.json` files but not yet fully reflected in the lockfile.
- `terraform test` fails with `Module not installed`: run `terraform init -backend=false` first.
- `docker compose up --build` fails on port binding: free ports `5173`, `8080`, `6379`, or `24224`, then retry.
- `npm run test:e2e` fails immediately with browser errors: run `npm run test:e2e:install`.
- `npm run test:e2e` fails on navigation or API requests: confirm Docker Compose is already running and the Playwright base URLs point to the right ports.
- API health endpoints fail while containers are still starting: use `docker compose ps` and `docker compose logs api redis`.
- Login or session-backed weather requests fail: confirm Redis is running and the cookie jar file is being reused between requests.
- Browser requests from the web app fail with CORS issues: confirm the API is using `CORS_ORIGIN=http://localhost:5173`.
- Swagger session tests behave inconsistently: serve `docs/swagger.html` from a local static server or prefer Postman/`curl` for cookie-based checks.
- `docker compose logs api` is sparse: API logs are forwarded through the `fluent-bit` container; inspect `docker compose logs fluent-bit` as well.
- Deployed smoke checks fail after rollout: confirm the ingress host resolves, the ALB is healthy, and `/api/v1/system/health` is reachable through HTTPS.
