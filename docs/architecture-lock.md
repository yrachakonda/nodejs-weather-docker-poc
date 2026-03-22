# Wave 0 Contract Lock

## Frozen naming
- API base path: `/api/v1`
- Session cookie: `weather.sid`
- Roles: `anonymous | basic | premium | admin`
- Premium route: `GET /weather/premium/forecast`
- Current weather route: `GET /weather/current`
- Correlation header: `x-correlation-id`
- API key header: `x-api-key`
- CloudWatch log group default: `/weather-sim/poc/app`

## Frozen env contract
`NODE_ENV, PORT, SESSION_SECRET, REDIS_URL, CORS_ORIGIN, APP_VERSION, LOG_LEVEL, SESSION_TTL_SECONDS, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX, ENABLE_NEGATIVE_TEST_ROUTES, AWS_REGION, CLOUDWATCH_LOG_GROUP`

## Seed data schema
- users: `id, username, passwordHash, role, isPremium`
- api keys: `keyId, key, userId, active, label`
- weather reports: `city, date, condition, temperatureC, humidity, windKph`

## Runtime assumptions
- Local: Docker Compose provides `redis`, `api`, `web`, `fluent-bit`
- AWS: Existing EKS cluster, ingress controller, and IAM setup are pre-provisioned
