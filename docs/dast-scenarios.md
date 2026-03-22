# DAST Scenarios

## Unauthenticated
- Access `/api/v1/auth/me` without session -> expect 401.
- Access `/api/v1/weather/current` without session -> expect 401.

## API key validation
- Missing `x-api-key` on weather routes -> 401.
- Invalid `x-api-key` -> 401 with generic error.

## Authenticated RBAC
- `basicuser` calling `/api/v1/weather/premium-forecast` -> 403.
- `premiumuser` calling same route -> 200.

## Payload robustness
- malformed JSON for `/auth/login` -> 400.
- short password for `/auth/register` -> 400.

## Session scenarios
- Login then logout then call `/auth/me` -> 401.
- Replay stale cookie after session expiry -> 401.

## Headers and hardening
- Validate helmet headers on API responses.
- Validate rate limiting returns 429 after configured threshold.

## WAF + pipeline gate
- Trigger known scanner signatures and confirm WAF telemetry.
- Pipeline gate fails when ZAP reports high severity above threshold.

## Logging validation
- Confirm `auth_login_success`, `auth_login_failed`, `authorization_denied`, `request_complete` in CloudWatch.
