# Local Development

## Prerequisites
- Docker
- Docker Compose
- Node.js and npm if you want to run workspaces outside containers

## Start the Local Stack
1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Start the containers:

```bash
docker compose up --build
```

## Local Endpoints
- Web UI: `http://localhost:5173`
- API base: `http://localhost:8080/api/v1`
- Kafka UI: `http://localhost:8081`
- Kibana: `http://localhost:5601`

## Services Started by Docker Compose
- `redis`
- `api`
- `web`
- `fluent-bit`
- `kafka`
- `kafka-ui`
- `logstash`
- `elasticsearch`
- `kibana`

## Local Logging Path
- `api` and `web` write logs to stdout/stderr
- Docker Compose forwards those logs to the local `fluent-bit` container with the `fluentd` logging driver
- Fluent Bit publishes to the local Apache Kafka 4.0 topic `weather-sim.logs`
- Logstash reads from Kafka and writes to Elasticsearch index `weather-sim-logs-%{+YYYY.MM.dd}`
- Kibana reads from Elasticsearch

## View Logs in Kafka UI
Kafka UI is the fastest way to confirm that Fluent Bit is publishing records into Kafka before Logstash or Elasticsearch are involved.

1. Start the local stack with `docker compose up --build`.
2. Open `http://localhost:8081`.
3. Select the cluster named `weather-sim-local`.
4. Open `Topics`.
5. Select the topic `weather-sim.logs`.
6. Open `Messages`.
7. Click `Consume messages`.

What to look for:
- New records should appear after you load the web UI, call the API, or run any health check against `http://localhost:8080/api/v1/system/health`.
- Messages are JSON records produced by Fluent Bit.
- API requests usually include fields such as `message`, `level`, `service`, `requestId`, `method`, `originalUrl`, `statusCode`, and `timestamp`.
- If no records appear, check `docker compose logs fluent-bit kafka kafka-init`.

Useful local traffic generators:

```bash
curl http://localhost:8080/api/v1/system/health
curl "http://localhost:8080/api/v1/weather/current?location=seattle" -H "x-api-key: poc-premium-key-001"
```

Kafka UI troubleshooting:
- If the topic list is empty, confirm `kafka-init` exited with code `0`.
- If the topic exists but no new messages arrive, inspect `docker compose logs fluent-bit`.
- If Kafka UI loads but shows cluster connection errors, inspect `docker compose logs kafka kafka-ui`.

## View API Logs in Kibana
Kibana is the downstream log exploration surface after Kafka and Logstash have processed the records into Elasticsearch.

1. Open `http://localhost:5601`.
2. Open `Discover`.
3. If Kibana prompts for a data view, create one with:
   - Name: `weather-sim-logs`
   - Index pattern: `weather-sim-logs-*`
   - Time field: `@timestamp` if present, otherwise `timestamp`
4. Set the time picker to `Last 15 minutes` or a wider range if needed.
5. Search for API logs with filters such as:
   - `service : "weather-sim-api"`
   - `level : "http"`
   - `message : "request_complete"`
   - `statusCode >= 400`
6. Expand a document to inspect request metadata.

Useful fields to inspect for API requests:
- `timestamp` or `@timestamp`
- `service`
- `level`
- `message`
- `requestId`
- `method`
- `originalUrl`
- `statusCode`
- `durationMs`
- `username`
- `userId`
- `authType`
- `ip`

Example Kibana queries:
- `service : "weather-sim-api"`
- `service : "weather-sim-api" and level : "http"`
- `service : "weather-sim-api" and statusCode >= 500`
- `requestId : "<request-id-value>"`

Kibana troubleshooting:
- If Discover shows no indices, confirm `docker compose ps` reports healthy `elasticsearch` and `logstash`.
- If the index pattern exists but no documents appear, check `docker compose logs logstash elasticsearch`.
- If Kafka UI shows messages but Kibana does not, the break is usually between Logstash and Elasticsearch.
- If Kibana itself does not load, inspect `docker compose logs kibana`.

## Environment Variables
From `.env.example`:
- `SESSION_SECRET`

API runtime defaults also include:
- `API_PORT=8080`
- `REDIS_URL=redis://redis:6379`
- `CORS_ORIGIN=http://localhost:5173`
- `RATE_LIMIT_WINDOW_MS=60000`
- `RATE_LIMIT_MAX=120`

## Security Behavior
- Register and login create server-side Redis-backed sessions
- The WebUI uses the session cookie for weather requests and does not embed an API key
- `GET /api/v1/weather/current` requires either a valid session or a valid `x-api-key`
- `GET /api/v1/weather/premium-forecast` requires either a `premium` or `admin` session, or a `premium`/`admin` `x-api-key`
- Passwords and API keys are stored as salted `scrypt` hashes in the API seed data
- API logs are forwarded through Fluent Bit and then into Kafka, Logstash, and Elasticsearch

## Workspace Commands
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

Use [Testing Guide](testing.md) for prerequisites, Docker Compose usage, exact suite coverage, Terraform checks, and troubleshooting.

## Useful Local Credentials
- `admin/admin-pass`
- `basicuser/basic-pass`
- `premiumuser/premium-pass`

Default local API key:
- `poc-premium-key-001`
