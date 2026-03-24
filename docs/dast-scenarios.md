# DAST Scenarios

These scenarios reflect the current application behavior and the AWS deployment model.

## Unauthenticated and auth-bound routes
- Access `GET /api/v1/auth/me` without a session and expect `401`
- Access `POST /api/v1/auth/logout` without a session and expect `401`
- Access `GET /api/v1/weather/premium-forecast` without a session but with a valid API key and expect `401`

## API key validation
- Access `GET /api/v1/weather/current` without `x-api-key` and expect `401`
- Access `GET /api/v1/weather/current` with an invalid `x-api-key` and expect `401`
- Access `GET /api/v1/weather/premium-forecast` with an invalid `x-api-key` and expect `401`

## Mixed auth behavior
- Access `GET /api/v1/weather/current` with a valid `x-api-key` and no session and expect `200`
- Access `GET /api/v1/weather/premium-forecast` with a valid `x-api-key` and no session and expect `401`

## RBAC
- Login as `basicuser` and call `GET /api/v1/weather/premium-forecast` with a valid API key and expect `403`
- Login as `premiumuser` and call the same route with a valid API key and expect `200`
- Login as `admin` and call the same route with a valid API key and expect `200`

## Payload robustness
- Send malformed JSON to `POST /api/v1/auth/login` and expect request rejection
- Send a short password to `POST /api/v1/auth/register` and expect validation failure
- Send empty or whitespace `location` values and confirm the API falls back to the default city behavior

## Session behavior
- Login, call `GET /api/v1/auth/me`, logout, then call `GET /api/v1/auth/me` again and expect `401`
- Replay a stale or expired session cookie and expect `401`

## Headers and hardening
- Confirm `helmet` headers are present on API responses
- Confirm rate limiting returns `429` and payload `{ error: "Too many requests" }` after the configured threshold
- Confirm CORS behavior is limited to the configured origin

## ALB and WAF behavior
- Confirm the public application hostname resolves to the ALB
- Confirm HTTP requests are redirected to HTTPS by the ALB ingress configuration
- Trigger known WAF signatures and confirm WAF telemetry is generated

## Logging validation
- Confirm the API emits events such as:
  - `auth_register_success`
  - `auth_login_success`
  - `auth_login_failed`
  - `auth_api_key_failed`
  - `authorization_denied`
- Confirm request logs and error logs appear in the application logging path configured for the target environment
