# Contract Reference

## API base path
- `/api/v1`

## Roles
- `anonymous`
- `basic`
- `premium`
- `admin`

## API endpoint contract
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/weather/current?location=<location>`
- `GET /api/v1/weather/premium-forecast?location=<location>`
- `GET /api/v1/system/live`
- `GET /api/v1/system/ready`
- `GET /api/v1/system/health`
- `GET /api/v1/system/version`

## Auth and authorization contract
- Session cookie is the authoritative authenticated identity state.
- The WebUI does not transmit a bundled API key to the API.
- `x-api-key` is supported for direct API clients.
- `GET /api/v1/weather/current` requires either a valid session or a valid `x-api-key`.
- `GET /api/v1/weather/premium-forecast` requires either a valid `premium` or `admin` session, or a valid `premium`/`admin` `x-api-key`.
- `POST /api/v1/auth/logout` requires a session.
- `GET /api/v1/auth/me` requires a session.

## Response and error contract
Success payloads:
- Auth endpoints return `{ user: ... }`
- Weather endpoints return `{ data: ... }`
- Logout returns `204 No Content`
- System endpoints return simple JSON status payloads such as `{ status: "healthy" }` or `{ version: "1.0.0" }`

Common error payloads:
- `{ error: "Unauthorized" }`
- `{ error: "Forbidden" }`
- `{ error: "Invalid credentials" }`
- `{ error: "Too many requests" }`

Validation failures from request parsing can also surface through the shared error handler.

## Environment variable catalog
Backend:
- `NODE_ENV`
- `API_PORT`
- `SESSION_SECRET`
- `REDIS_URL`
- `CORS_ORIGIN`
- `LOG_LEVEL`
- `APP_VERSION`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `WEATHER_SEED_CITY`

Frontend:
- `VITE_API_BASE_URL`

Operational and local compose defaults:
- `SESSION_SECRET`
- `weather-sim.logs`
- `weather-sim-logs-*`
- `/weather-sim-poc/observability/application`

## Platform naming conventions
- Project slug: `weather-sim`
- Default environment: `poc`
- Terraform cluster name pattern: `<project_name>-<environment>`
- Helm release: `weather-sim`
- Kubernetes namespace: `weather-sim`
- Observability namespace: `observability`
- Kafka cluster: `weather-sim-kafka`
- Kafka topic: `weather-sim.logs`
- CloudWatch Logs group pattern: `/<project_name>-<environment>/observability/application`
- Elasticsearch index pattern: `weather-sim-logs-*`
- Default Terraform VPC CIDR: `10.0.0.0/16`

## Logging and security controls
- `helmet` is enabled globally on the API
- CORS is enabled with credentials support
- Global rate limiting is enabled
- Session state is stored in Redis
- Passwords and API keys are stored as salted `scrypt` hashes
- Public web ingress is protected by a regional WAFv2 ACL on the ALB, and API traffic is protected by a regional WAFv2 ACL in front of API Gateway
- Deployed application logs are routed by Fluent Bit to both Kafka and CloudWatch Logs
