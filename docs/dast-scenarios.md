# DAST Scenarios

## Unauthenticated
- Access `/api/v1/auth/me` without session => 401
- Access premium forecast without session => 401/403 chain

## Authenticated + API key
- Basic user + basic key can call current weather
- Basic user denied premium forecast (403)
- Premium user allowed premium forecast (200)

## Payload and injection checks
- Invalid register payload => 400
- Malformed JSON => 400
- Query fuzzing on city parameter

## Session tests
- Session fixation attempt across users should fail
- Expired session should require re-auth

## Header/security tests
- Validate `helmet` headers are present
- Validate generic auth errors do not leak details

## CI/CD gates
- ZAP baseline fail threshold should block deployment promotion
- Rapid7 critical finding threshold should fail gate stage
