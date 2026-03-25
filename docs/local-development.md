# Local Development

## Prerequisites
- Docker
- Docker Compose
- Node.js and npm if you want to run workspaces outside containers

## Start the local stack
1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Start the containers:

```bash
docker compose up --build
```

## Local endpoints
- Web UI: `http://localhost:5173`
- API base: `http://localhost:8080/api/v1`
- Health endpoint: `http://localhost:8080/api/v1/system/health`

## Services started by Docker Compose
- `redis` on `localhost:6379`
- `api` on `localhost:8080`
- `web` on `localhost:5173`
- `fluent-bit` in local stdout mode, receiving API container logs through Docker's `fluentd` logging driver

## Environment variables
From `.env.example`:
- `SESSION_SECRET`
- `AWS_REGION`
- `CLOUDWATCH_LOG_GROUP`

Note:
- `AWS_REGION` and `CLOUDWATCH_LOG_GROUP` are used by the CloudWatch-oriented Fluent Bit config, but the local Docker Compose stack uses a separate stdout config with Docker's `fluentd` log forwarding.

API runtime defaults also include:
- `API_PORT=8080`
- `REDIS_URL=redis://redis:6379`
- `CORS_ORIGIN=http://localhost:5173`
- `RATE_LIMIT_WINDOW_MS=60000`
- `RATE_LIMIT_MAX=120` in Docker Compose

## Security behavior
- Register and login create server-side Redis-backed sessions.
- The WebUI uses the session cookie for weather requests and does not embed an API key.
- `GET /api/v1/weather/current` requires either a valid session or a valid `x-api-key`.
- `GET /api/v1/weather/premium-forecast` requires either a `premium` or `admin` session, or a `premium`/`admin` `x-api-key`.
- Passwords and API keys are stored as salted `scrypt` hashes in the API seed data.
- All API requests are subject to the global rate limiter.
- API logs are forwarded into the local `fluent-bit` container and emitted to its stdout. Use `docker compose logs fluent-bit` to inspect what Fluent Bit receives.
- The `web` container still uses the default Docker logging path, so use `docker compose logs web` for frontend logs.

## Workspace commands
Run from `app/`:

```bash
npm run build
npm run test
npm run lint
```

Additional test commands live under `app/`:

```bash
npm run test:e2e:smoke
npm run test:e2e
npm run perf:baseline
npm run perf:load
```

Automated test assets now live under `app/tests/`.

Use [Testing Guide](/./docs/testing.md) for prerequisites, Docker Compose usage, exact suite coverage, Terraform checks, and troubleshooting.

## Useful local credentials
- `admin/admin-pass`
- `basicuser/basic-pass`
- `premiumuser/premium-pass`

Default local API key:
- `poc-premium-key-001`
