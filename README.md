# Weather Simulation Platform POC

This repository contains a TypeScript weather application plus the infrastructure and deployment assets used to run it on AWS.

## Repository Layout
- `app/`: application source, local Docker Compose stack, and npm workspaces
- `charts/weather-sim/`: Helm chart for the application workloads
- `terraform/`: AWS infrastructure for networking, EKS, ECR, ACM, Route53, WAF, and observability wiring
- `docs/`: architecture, local development, testing, and runbook guidance

## Current Platform Shape
- `weather-sim` is the application namespace for the API and web workloads only
- `observability` is the namespace for Strimzi Kafka, Kafbat UI, Fluent Bit, the ECK operator, Elasticsearch, Kibana, and Logstash
- The application still depends on Redis for sessions, but Redis is not provisioned in EKS in this repository
- The EKS API endpoint is private-only, so cluster access requires a VPC-connected network path
- Kafka, Elasticsearch, Kibana, and Kafbat UI are internal-only in EKS and are intended for `kubectl port-forward`

## Logging Flow
Application containers write to stdout/stderr. Fluent Bit runs as a DaemonSet in `observability`, tails `/var/log/containers`, enriches log records with Kubernetes metadata, publishes them to Kafka topic `weather-sim.logs`, and also ships the same records into the CloudWatch log group `/weather-sim-poc/observability/application`. Logstash consumes the Kafka topic and writes to Elasticsearch. Kibana reads from Elasticsearch and is used for viewing logs, while CloudWatch provides an AWS-native verification path.

## Local Development
The local stack lives under `app/`.

The local observability broker runs on the official Apache Kafka 4.0 image line (`apache/kafka:4.0.2`) in single-node KRaft mode.

```bash
cd app
cp .env.example .env
docker compose up --build
```

Local endpoints:
- Web UI: `http://localhost:5173`
- API base: `http://localhost:8080/api/v1`
- Kafka UI: `http://localhost:8081`
- Kibana: `http://localhost:5601`

Local services:
- `redis`
- `api`
- `web`
- `fluent-bit`
- `kafka`
- `kafka-ui`
- `logstash`
- `elasticsearch`
- `kibana`

## Application Behavior
- API base path: `/api/v1`
- Roles: `anonymous`, `basic`, `premium`, `admin`
- Sessions are Redis-backed
- `GET /api/v1/weather/current` requires either a valid session or a valid `x-api-key`
- `GET /api/v1/weather/premium-forecast` requires either a `premium` or `admin` session, or a `premium`/`admin` `x-api-key`
- Health endpoints:
  - `/api/v1/system/live`
  - `/api/v1/system/ready`
  - `/api/v1/system/health`
  - `/api/v1/system/version`

## Terraform
Run from `terraform/`:

```bash
terraform init -backend=false
terraform validate
terraform test
```

To plan or apply the POC environment:

```bash
terraform init
terraform plan -var-file=environments/poc/terraform.tfvars
terraform apply -var-file=environments/poc/terraform.tfvars
```

Terraform provisions:
- VPC, subnets, IGW, NAT, and route tables
- VPC flow logs and private service endpoints
- ECR repositories
- EKS cluster and managed node group
- AWS Load Balancer Controller IAM and Helm release
- ACM certificate with Route53 validation
- WAFv2 ACL
- `weather-sim` application Helm release
- `observability` namespace and observability Helm releases
- CloudWatch log group for Fluent Bit application logs
- DNS record for the application hostname

## Important Limitations
- Redis is still not provisioned for the EKS environment
- The EKS API endpoint is private-only
- Kafka, Elasticsearch, Kibana, and Kafbat UI remain internal-only in EKS
- An Application Load Balancer cannot have an Elastic IP attached directly; use AWS Global Accelerator or a different entry pattern if static public IPs are needed later

## API Docs and Test Assets
- [Testing Guide](docs/testing.md)
- [Runbook](docs/runbook.md)
- [OpenAPI Spec](docs/openapi.yaml)
- [Swagger UI Page](docs/swagger.html)
- [Postman Collection](app/tests/postman/weather-sim.postman_collection.json)
- [Contract Reference](docs/contracts.md)
- [DAST Scenarios](docs/dast-scenarios.md)
- [Architecture](docs/architecture.md)
- [Local Development](docs/local-development.md)
