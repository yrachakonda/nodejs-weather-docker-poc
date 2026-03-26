# Runbook

## Deploy Infrastructure
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
- `weather-sim` application release
- `observability` namespace
- CloudWatch log group for Fluent Bit application logs
- Strimzi Kafka, Kafbat UI, Fluent Bit, ECK operator, Elasticsearch, Kibana, and Logstash

What this does not currently provision:
- A production Redis deployment for session storage

## Build and Publish Images
The Terraform stack assumes images are available in ECR. Build and push both application images before or after infrastructure creation, depending on your deployment flow.

Example high-level sequence:
1. Build the API image from `app/backend`
2. Build the Web image from `app/frontend`
3. Authenticate to ECR
4. Push both images to the Terraform-created repositories
5. Update the deployed tags if you are not using `:latest`

## Default POC Credentials
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

## Verify Deployment
Infrastructure checks:
- Confirm the EKS cluster is `ACTIVE`
- Confirm the managed node group is `ACTIVE`
- Confirm the AWS Load Balancer Controller pod is running in `kube-system`
- Confirm `kubectl get pods -n weather-sim` is healthy
- Confirm `kubectl get pods -n observability` is healthy
- Confirm the ingress has an ALB hostname
- Confirm the Route53 record resolves to the ALB hostname

Observability checks:
- Confirm the Strimzi Kafka pod is running
- Confirm the Kafbat UI pod is running
- Confirm the Fluent Bit DaemonSet is ready on each node
- Confirm the CloudWatch log group `/weather-sim-poc/observability/application` exists
- Confirm the ECK operator pod is running
- Confirm Elasticsearch, Kibana, and Logstash are running
- Confirm the Kafka topic `weather-sim.logs` exists
- Confirm Logstash is consuming from Kafka and indexing into Elasticsearch

Application smoke checks:
- `GET /api/v1/system/live`
- `GET /api/v1/system/ready`
- `GET /api/v1/system/health`
- Load the Web UI through the public hostname in `terraform/environments/poc/terraform.tfvars`

Log verification:
- Generate application traffic
- Check Fluent Bit logs in `observability`
- Check recent CloudWatch log streams in `/weather-sim-poc/observability/application`
- Check Logstash logs in `observability`
- Open Kibana and confirm recent events in the `weather-sim-logs-*` index pattern

## Port Forward Access
Kafka, Elasticsearch, Kibana, and Kafka UI are internal-only in EKS. Use `kubectl port-forward`:

```bash
kubectl -n observability port-forward svc/kafbat-ui 8081:80
kubectl -n observability port-forward svc/weather-sim-kibana-kb-http 5601:5601
kubectl -n observability port-forward svc/weather-sim-elasticsearch-es-http 9200:9200
```

## Incident Response
Primary places to inspect:
- EKS workloads in `weather-sim` and `observability`
- Fluent Bit logs
- CloudWatch Logs for `/weather-sim-poc/observability/application`
- Kafka topic state and Logstash logs
- Elasticsearch health
- Kibana access

Useful symptoms and checks:
- `401 Unauthorized` on `/weather/current`: missing both session and `x-api-key`, or invalid `x-api-key`
- `401 Unauthorized` on `/weather/premium-forecast`: missing both session and `x-api-key`, or invalid `x-api-key`
- `403 Forbidden` on `/weather/premium-forecast`: wrong role for the session or API key
- Ingress missing address: inspect AWS Load Balancer Controller logs
- Kibana empty: confirm Logstash is consuming `weather-sim.logs` and Elasticsearch health is green
- CloudWatch empty: confirm the Fluent Bit service account annotation points at the expected IRSA role and inspect the Fluent Bit pod logs for `cloudwatch_logs` delivery errors

## Rollback
- Helm application rollback: `helm rollback weather-sim`
- Observability rollback depends on the component:
  - use `helm rollback` for Helm-managed releases
  - reapply the prior Terraform plan if the change was made through infrastructure code

Do not use destructive Terraform commands against shared environments without first reviewing state and planned deletes.
