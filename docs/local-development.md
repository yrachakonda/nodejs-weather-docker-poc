# Local Development

1. Copy env file: `cp .env.example .env`
2. Start stack: `docker compose up --build`
3. Open UI: `http://localhost:5173`
4. API health: `http://localhost:8080/api/v1/system/health`

## Security behavior
- Login/register create server-side sessions stored in Redis.
- Current weather requires both valid session and `x-api-key`.
- Premium forecast additionally requires `premium` or `admin` role.
