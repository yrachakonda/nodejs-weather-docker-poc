# Wave 0 Contract Lock

## API endpoint contract
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/weather/current?location=<location>`
- `GET /api/v1/weather/premium-forecast?location=<location>`
- `GET /api/v1/system/live|ready|health|version`

## Response/error contract
- Success payload: `{ data: ... }` for weather, `{ user: ... }` for auth.
- Generic errors: `{ error: 'Unauthorized'|'Forbidden'|'Invalid request'|'Internal server error' }`.

## Auth/session/API key contract
- Session cookie is authoritative identity state.
- `x-api-key` required for weather endpoints.
- Premium route requires role in `premium|admin`.

## Environment variable catalog
- `NODE_ENV`, `API_PORT`, `SESSION_SECRET`, `REDIS_URL`, `CORS_ORIGIN`
- `LOG_LEVEL`, `APP_VERSION`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`
- `VITE_API_BASE_URL`, `VITE_API_KEY`
- `AWS_REGION`, `CLOUDWATCH_LOG_GROUP`

## Naming conventions
- Project slug: `weather-sim`
- CloudWatch group: `/weather-sim/poc/app`
- Helm release: `weather-sim`
- Terraform project_name: `weather-sim`
