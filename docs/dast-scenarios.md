# DAST Scenarios

These scenarios reflect the current application behavior and the AWS deployment model.

Use this checklist with:
- `docs/testing.md` when converting scenarios into repeatable test runs
- `docs/runbook.md` when validating a deployed environment
- `docs/contracts.md` when you need the expected response and auth contract for each route

## Table of Contents
- [Unauthenticated and auth-bound routes](#unauthenticated-and-auth-bound-routes)
- [API key validation](#api-key-validation)
- [Mixed auth behavior](#mixed-auth-behavior)
- [RBAC](#rbac)
- [Payload robustness](#payload-robustness)
- [Session behavior](#session-behavior)
- [Headers and hardening](#headers-and-hardening)
- [ALB and WAF behavior](#alb-and-waf-behavior)
- [Logging validation](#logging-validation)

## Unauthenticated and auth-bound routes
- Access `GET /api/v1/auth/me` without a session and expect `401`
- Access `POST /api/v1/auth/logout` without a session and expect `401`
- Access `GET /api/v1/weather/current` without a session and without `x-api-key` and expect `401`
- Access `GET /api/v1/weather/premium-forecast` without a session and without `x-api-key` and expect `401`

[Back to Table of Contents](#table-of-contents)

## API key validation
- Access `GET /api/v1/weather/current` without `x-api-key` and expect `401`
- Access `GET /api/v1/weather/current` with an invalid `x-api-key` and expect `401`
- Access `GET /api/v1/weather/premium-forecast` with an invalid `x-api-key` and expect `401`

[Back to Table of Contents](#table-of-contents)

## Mixed auth behavior
- Access `GET /api/v1/weather/current` with a valid `x-api-key` and no session and expect `200`
- Login as `basicuser` and call `GET /api/v1/weather/current` without `x-api-key` and expect `200`
- Access `GET /api/v1/weather/premium-forecast` with a valid premium `x-api-key` and no session and expect `200`

[Back to Table of Contents](#table-of-contents)

## RBAC
- Access `GET /api/v1/weather/premium-forecast` with a valid basic API key and expect `403`
- Login as `basicuser` and call `GET /api/v1/weather/premium-forecast` without `x-api-key` and expect `403`
- Login as `premiumuser` and call the same route without `x-api-key` and expect `200`
- Login as `admin` and call the same route without `x-api-key` and expect `200`

[Back to Table of Contents](#table-of-contents)

## Payload robustness
- Send malformed JSON to `POST /api/v1/auth/login` and expect request rejection
- Send a short password to `POST /api/v1/auth/register` and expect validation failure
- Send empty or whitespace `location` values and confirm the API falls back to the default city behavior

[Back to Table of Contents](#table-of-contents)

## Session behavior
- Login, call `GET /api/v1/auth/me`, logout, then call `GET /api/v1/auth/me` again and expect `401`
- Replay a stale or expired session cookie and expect `401`

[Back to Table of Contents](#table-of-contents)

## Headers and hardening
- Confirm `helmet` headers are present on API responses
- Confirm rate limiting returns `429` and payload `{ error: "Too many requests" }` after the configured threshold
- Confirm CORS behavior is limited to the configured origin

[Back to Table of Contents](#table-of-contents)

## ALB and WAF behavior
- Confirm the public application hostname resolves to the ALB
- Confirm HTTP requests are redirected to HTTPS by the ALB ingress configuration
- Trigger known WAF signatures and confirm WAF telemetry is generated

[Back to Table of Contents](#table-of-contents)

## Logging validation
- Confirm the API emits events such as:
  - `auth_register_success`
  - `auth_login_success`
  - `auth_login_failed`
  - `auth_api_key_failed`
  - `authorization_denied`
- Confirm request logs and error logs appear in the application logging path configured for the target environment

[Back to Table of Contents](#table-of-contents)
