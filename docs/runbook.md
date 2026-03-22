# Runbook

## Deploy
- Build images and push to ECR.
- Update Helm values image tags.
- Deploy via Helm into EKS namespace `weather-sim`.

## Smoke checks
- `/api/v1/system/live`
- `/api/v1/system/ready`
- `/api/v1/system/health`

## Incident response
- Review CloudWatch group `/weather-sim/poc/app` for `authorization_denied`, `auth_login_failed`, and `unhandled_error`.
- Rollback with `helm rollback weather-sim`.
