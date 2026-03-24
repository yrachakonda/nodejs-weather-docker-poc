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
1. Build the API image from `backend/`
2. Build the Web image from `frontend/`
3. Authenticate to ECR
4. Push both images to the Terraform-created repositories
5. Update the deployed tags if you are not using `:latest`

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
- `GET /api/v1/weather/premium-forecast` with a valid `x-api-key` but no session should return `401`
- `GET /api/v1/weather/premium-forecast` as `basicuser` should return `403`
- `GET /api/v1/weather/premium-forecast` as `premiumuser` should return `200`

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
- `401 Unauthorized` on `/weather/current`: missing or invalid `x-api-key`
- `401 Unauthorized` on `/weather/premium-forecast`: missing session
- `403 Forbidden` on `/weather/premium-forecast`: wrong role
- Ingress missing address: inspect AWS Load Balancer Controller logs
- TLS issues: verify ACM validation completed and ingress certificate annotation is correct

## Rollback
- Helm application rollback: `helm rollback weather-sim`
- Terraform rollback is change-specific; review `terraform plan` before applying reversions

Do not use destructive Terraform commands against shared environments without first reviewing state and planned deletes.
