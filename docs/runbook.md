# Runbook

## Deploy infrastructure
Run from `terraform/`:

```bash
terraform init
terraform plan -var-file=environments/poc/terraform.tfvars
terraform apply -var-file=environments/poc/terraform.tfvars
```

What this provisions:
- A VPC with `10.0.0.0/16`
- Two public `/20` subnets
- Two private `/20` subnets
- ECR repositories for the API and Web images
- An EKS cluster and managed node group
- AWS Load Balancer Controller IAM wiring
- ACM certificate with Route53 DNS validation
- WAFv2 ACL
- Application Helm release and DNS record

What this does not currently provision:
- A production Redis deployment for session storage

## Build and publish images
The Terraform stack assumes images are available in ECR. Build and push both application images before or after infrastructure creation, depending on your deployment flow.

Example high-level sequence:
1. Build the API image from `app/backend`
2. Build the Web image from `app/frontend`
3. Authenticate to ECR
4. Push both images to the Terraform-created repositories
5. Update the deployed tags if you are not using `:latest`

## Default POC credentials
These demo credentials are valid in the local POC unless changed in code. The API stores the corresponding passwords and API keys as salted `scrypt` hashes, not plaintext.

Default users:
- `admin` / `admin-pass`
- `basicuser` / `basic-pass`
- `premiumuser` / `premium-pass`

Default valid `x-api-key` values:
- `poc-basic-key-001`
- `poc-premium-key-001`
- `poc-admin-key-001`

Source of truth:
- `app/backend/src/data/seed-users.json`
- `app/backend/src/data/seed-api-keys.json`

## Verify deployment
Infrastructure checks:
- Confirm the EKS cluster is `ACTIVE`
- Confirm the managed node group is `ACTIVE`
- Confirm the AWS Load Balancer Controller pod is running in `kube-system`
- Confirm the ingress has an ALB hostname
- Confirm the Route53 record resolves to the ALB hostname
- Confirm the configured Redis endpoint is reachable by the API workload

Application smoke checks:
- `GET /api/v1/system/live`
- `GET /api/v1/system/ready`
- `GET /api/v1/system/health`
- Load the Web UI through the public hostname in `terraform/environments/poc/terraform.tfvars`

Authorization checks:
- `GET /api/v1/weather/current` with a valid `x-api-key` should succeed without a session
- `GET /api/v1/weather/current` with a valid session should also succeed without an API key
- `GET /api/v1/weather/premium-forecast` with a valid premium `x-api-key` should return `200`
- `GET /api/v1/weather/premium-forecast` as `basicuser` should return `403`
- `GET /api/v1/weather/premium-forecast` as `premiumuser` should return `200`

## API endpoint testing with curl
Set these shell variables first. Replace the host value for a deployed environment.

```bash
export BASE_URL="http://localhost:8080/api/v1"
export APP_URL="http://localhost:8080"
export API_KEY="poc-premium-key-001"
export BASIC_API_KEY="poc-basic-key-001"
export COOKIE_JAR="./weather-sim.cookies.txt"
```

### System endpoints

Live:

```bash
curl -i "${BASE_URL}/system/live"
```

Ready:

```bash
curl -i "${BASE_URL}/system/ready"
```

Health:

```bash
curl -i "${BASE_URL}/system/health"
```

Version:

```bash
curl -i "${BASE_URL}/system/version"
```

### Auth endpoints

Register a new basic user:

```bash
curl -i \
  -c "${COOKIE_JAR}" \
  -H "Content-Type: application/json" \
  -X POST "${BASE_URL}/auth/register" \
  -d '{"username":"newuser","password":"newuser-pass"}'
```

Login as premium user:

```bash
curl -i \
  -c "${COOKIE_JAR}" \
  -H "Content-Type: application/json" \
  -X POST "${BASE_URL}/auth/login" \
  -d '{"username":"premiumuser","password":"premium-pass"}'
```

Get current authenticated user:

```bash
curl -i \
  -b "${COOKIE_JAR}" \
  "${BASE_URL}/auth/me"
```

Logout:

```bash
curl -i \
  -b "${COOKIE_JAR}" \
  -X POST "${BASE_URL}/auth/logout"
```

### Weather endpoints

Current weather with API key only:

```bash
curl -i \
  -H "x-api-key: ${API_KEY}" \
  "${BASE_URL}/weather/current?location=seattle"
```

Current weather with session only:

```bash
curl -i \
  -b "${COOKIE_JAR}" \
  "${BASE_URL}/weather/current?location=seattle"
```

Premium forecast with premium API key only:

```bash
curl -i \
  -H "x-api-key: ${API_KEY}" \
  "${BASE_URL}/weather/premium-forecast?location=seattle"
```

Premium forecast with authenticated premium session:

```bash
curl -i \
  -b "${COOKIE_JAR}" \
  "${BASE_URL}/weather/premium-forecast?location=seattle"
```

### Negative tests

Current weather without session or API key:

```bash
curl -i "${BASE_URL}/weather/current?location=seattle"
```

Premium forecast with a basic API key:

```bash
curl -i \
  -H "x-api-key: ${BASIC_API_KEY}" \
  "${BASE_URL}/weather/premium-forecast?location=seattle"
```

Premium forecast as `basicuser`:

```bash
curl -i \
  -c "${COOKIE_JAR}" \
  -H "Content-Type: application/json" \
  -X POST "${BASE_URL}/auth/login" \
  -d '{"username":"basicuser","password":"basic-pass"}'

curl -i \
  -b "${COOKIE_JAR}" \
  "${BASE_URL}/weather/premium-forecast?location=seattle"
```

### Full endpoint coverage checklist
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /weather/current`
- `GET /weather/premium-forecast`
- `GET /system/live`
- `GET /system/ready`
- `GET /system/health`
- `GET /system/version`

## Swagger UI
Swagger assets are available in `docs/`:
- OpenAPI spec: `docs/openapi.yaml`
- Swagger UI page: `docs/swagger.html`

To use the Swagger page locally:
1. Start the API locally from `app/`
2. Open `docs/swagger.html` in a browser
3. Set the server URL to `http://localhost:8080/api/v1`
4. Click `Authorize` and supply an API key when testing weather endpoints
5. Login first if you want to test session-backed weather access without an API key, or session routes such as `/auth/me` and `/auth/logout`

Note:
- Browser-based session testing works best when the Swagger page is served from the same origin as the API or from a local static server that can send cookies correctly.

## Postman collection
The Postman collection is available at:
- `docs/postman/weather-sim.postman_collection.json`

Recommended Postman variables:
- `baseUrl`
- `apiKey`
- `username`
- `password`
- `location`

The collection includes:
- System checks
- Auth flows
- Current weather
- Premium forecast
- Negative authorization scenarios

## Terraform quality checks
Run from `terraform/`:

```bash
terraform validate
terraform test
```

Current Terraform tests cover:
- Networking unit checks
- EKS unit checks
- Root stack composition checks with mocked providers

## Incident response
Primary places to inspect:
- EKS workloads and ingress state
- AWS Load Balancer Controller logs in `kube-system`
- CloudWatch application logs under `/weather-sim-poc/poc/app`
- WAF telemetry for blocked or sampled requests

Useful symptoms and checks:
- `401 Unauthorized` on `/weather/current`: missing both session and `x-api-key`, or invalid `x-api-key`
- `401 Unauthorized` on `/weather/premium-forecast`: missing both session and `x-api-key`, or invalid `x-api-key`
- `403 Forbidden` on `/weather/premium-forecast`: wrong role for the session or API key
- Ingress missing address: inspect AWS Load Balancer Controller logs
- TLS issues: verify ACM validation completed and ingress certificate annotation is correct

## Rollback
- Helm application rollback: `helm rollback weather-sim`
- Terraform rollback is change-specific; review `terraform plan` before applying reversions

Do not use destructive Terraform commands against shared environments without first reviewing state and planned deletes.
