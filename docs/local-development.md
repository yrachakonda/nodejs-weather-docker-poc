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
- `fluent-bit` as a local log-forwarder sidecar container

## Environment variables
From `.env.example`:
- `SESSION_SECRET`
- `DEFAULT_API_KEY`
- `AWS_REGION`
- `CLOUDWATCH_LOG_GROUP`

API runtime defaults also include:
- `API_PORT=8080`
- `REDIS_URL=redis://redis:6379`
- `CORS_ORIGIN=http://localhost:5173`
- `RATE_LIMIT_WINDOW_MS=60000`
- `RATE_LIMIT_MAX=120` in Docker Compose

## Security behavior
- Register and login create server-side Redis-backed sessions.
- `GET /api/v1/weather/current` requires a valid `x-api-key`.
- `GET /api/v1/weather/premium-forecast` requires both a valid `x-api-key` and a session with role `premium` or `admin`.
- All API requests are subject to the global rate limiter.

## Workspace commands
Run from the repository root:

```bash
npm run build
npm run test
npm run lint
```

Current workspace test scripts are placeholders for the frontend and backend application packages. The Terraform test suite lives separately under `terraform/`.

## Useful local credentials
- `admin/admin-pass`
- `basicuser/basic-pass`
- `premiumuser/premium-pass`

Default local API key:
- `poc-premium-key-001`
