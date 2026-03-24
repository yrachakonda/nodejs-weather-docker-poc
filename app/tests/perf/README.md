# Local Performance Test Assets

These `k6` scripts exercise the local API for light-weight non-functional checks. They are intended for developer workstations and local Docker Compose runs, not for production-grade benchmarking or capacity certification.

## Coverage

- `baseline.js`: low-noise baseline response checks across health, current weather, and premium forecast
- `load.js`: modest concurrent steady-state load for the same endpoints
- `stress.js`: controlled ramp-up to find the point where latency or errors start to degrade
- `soak.js`: longer, low-intensity run to catch stability regressions such as leaks or error creep

The default runs focus on:

- `GET /api/v1/system/health`
- `GET /api/v1/weather/current`
- `GET /api/v1/weather/premium-forecast`
- optional `POST /api/v1/auth/login` plus `GET /api/v1/auth/me`

## Requirements

- local API reachable at `http://localhost:8080/api/v1`, or override `BASE_URL`
- `k6` installed and available on `PATH`
- local seed data unchanged if you use the defaults

Default auth values are intentionally local-only:

- username: `premiumuser`
- password: `premium-pass`
- API key: `poc-premium-key-001`

## Run

From `app/`:

```bash
npm run perf:baseline
npm run perf:load
npm run perf:stress
npm run perf:soak
```

Optional heavier profiles stay explicit:

```bash
npm run perf:baseline:auth
npm run perf:load:heavier
npm run perf:stress:heavier
npm run perf:soak:long
```

## Tuning

Useful environment variables:

- `BASE_URL`: API base, default `http://localhost:8080/api/v1`
- `LOCATION`: weather query location, default `seattle`
- `API_KEY`: API key for weather endpoints, default `poc-premium-key-001`
- `USERNAME`: login username, default `premiumuser`
- `PASSWORD`: login password, default `premium-pass`
- `PERF_INCLUDE_LOGIN=true`: include session login checks in supported scripts

Profile-specific variables:

- `LOAD_PROFILE=heavier`
- `STRESS_PROFILE=heavier`
- `SOAK_PROFILE=long`

The thresholds are intentionally conservative. They are meant to catch obvious regressions on a healthy local stack, not to act as strict SLOs across every machine.
