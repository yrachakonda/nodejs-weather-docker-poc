# Runbook

## Health checks
- Live: `/api/v1/health/live`
- Ready: `/api/v1/health/ready`

## Incident hints
- Check API container logs for `correlationId` and `authorization denied` events.
- Confirm Redis connectivity from readiness endpoint.
- Confirm CloudWatch receives Fluent Bit forwarded records.
