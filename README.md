# Weather Simulation Platform POC

This repository contains a TypeScript weather application plus the infrastructure and deployment assets used to run it on AWS and on local Kubernetes environments with Helm.

## Table of Contents
- [Repository Layout](#repository-layout)
- [Current Platform Shape](#current-platform-shape)
- [Logging Flow](#logging-flow)
- [Local Docker Development](#local-docker-development)
- [Kubernetes Deployments With Helm](#kubernetes-deployments-with-helm)
  - [Build the Images](#build-the-images)
  - [Common Kubernetes Prerequisites](#common-kubernetes-prerequisites)
  - [Docker Desktop Kubernetes](#docker-desktop-kubernetes)
  - [MicroK8S](#microk8s)
  - [KinD](#kind)
  - [Uninstall](#uninstall)
- [Application Behavior](#application-behavior)
- [Terraform](#terraform)
- [Important Limitations](#important-limitations)
- [API Docs and Test Assets](#api-docs-and-test-assets)

## Repository Layout
- `app/`: application source, local Docker Compose stack, deployment assets, and npm workspaces
- `app/deployment/charts/weather-sim/`: Helm chart for the API and web workloads
- `terraform/`: AWS infrastructure for networking, EKS, ECR, ACM, Route53, WAF, and observability wiring
- `docs/`: architecture, local development, testing, and runbook guidance

[Back to Table of Contents](#table-of-contents)

## Current Platform Shape
- `weather-sim` is the application namespace for the API and web workloads only
- `observability` is the namespace for Strimzi Kafka, Kafbat UI, Fluent Bit, the ECK operator, Elasticsearch, Kibana, and Logstash
- The application still depends on Redis for sessions, but Redis is not provisioned in EKS in this repository
- The EKS control plane endpoint is not public, while the application API is exposed externally through API Gateway and remains internally reachable through the cluster service and internal NLB path
- Kafka, Elasticsearch, Kibana, and Kafbat UI are internal-only in EKS and are intended for `kubectl port-forward`

[Back to Table of Contents](#table-of-contents)

## Logging Flow
Application containers write to stdout/stderr. Fluent Bit runs as a DaemonSet in `observability`, tails `/var/log/containers`, enriches log records with Kubernetes metadata, publishes log records to Kafka topic `weather-sim.logs`, and also ships the same records into the CloudWatch log group `/weather-sim-poc/observability/application`. Logstash consumes the Kafka topic and writes to Elasticsearch. Kibana reads from Elasticsearch and is used for viewing logs, while CloudWatch provides an AWS-native verification path.

[Back to Table of Contents](#table-of-contents)

## Local Docker Development
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

[Back to Table of Contents](#table-of-contents)

## Kubernetes Deployments With Helm
The application Helm chart is in `app/deployment/charts/weather-sim`.

What the chart deploys:
- `weather-sim-api` Deployment and Service
- `weather-sim-web` Deployment and Service
- `weather-sim-config` ConfigMap
- `weather-sim` Ingress for the web service only
- `weather-sim-api` HPA and PodDisruptionBudget

Important chart behavior:
- The chart expects a Kubernetes Secret named `weather-sim-session-secret` with key `SESSION_SECRET`
- `values*.yaml` currently point `REDIS_URL` at `redis-master:6379`, so a Redis service must exist in-cluster before the API will become ready
- The ingress routes only the web frontend; if the frontend needs to call the API through the same hostname, add a matching API ingress rule or expose the API separately
- The default `values.yaml` uses AWS-oriented LoadBalancer annotations; for local clusters use `values-local.yaml` or override those fields explicitly

### Build the Images
Build from `app/` so the image names line up with the examples below:

```bash
cd app
docker build -t weather-sim-api:local ./backend
docker build -t weather-sim-web:local ./frontend
```

[Back to Table of Contents](#table-of-contents)

### Common Kubernetes Prerequisites
Create the namespace, session secret, and a simple Redis dependency:

```bash
kubectl create namespace weather-sim
kubectl -n weather-sim create secret generic weather-sim-session-secret \
  --from-literal=SESSION_SECRET='replace-with-long-random-value'
kubectl -n weather-sim create deployment redis-master --image=redis:8.6.1
kubectl -n weather-sim expose deployment redis-master --port=6379 --target-port=6379
```

Install or upgrade the chart:

```bash
helm upgrade --install weather-sim ./deployment/charts/weather-sim \
  --namespace weather-sim \
  -f ./deployment/charts/weather-sim/values-local.yaml \
  --set image.api=weather-sim-api:local \
  --set image.web=weather-sim-web:local \
  --set env.CORS_ORIGIN=http://localhost \
  --set ingress.host=weather-sim.local
```

Basic validation:

```bash
kubectl -n weather-sim get pods,svc,ingress
kubectl -n weather-sim rollout status deploy/weather-sim-api
kubectl -n weather-sim rollout status deploy/weather-sim-web
```

[Back to Table of Contents](#table-of-contents)

### Docker Desktop Kubernetes
If you are using the Kubernetes cluster bundled with Docker Desktop, the Docker daemon already contains the images you built locally, so no extra image import step is required.

After the common prerequisites and Helm install, expose the app with port-forwarding:

```bash
kubectl -n weather-sim port-forward svc/weather-sim-web 8088:80
kubectl -n weather-sim port-forward svc/weather-sim-api 8080:8080
```

Use:
- Web UI: `http://localhost:8088`
- API base: `http://localhost:8080/api/v1`

[Back to Table of Contents](#table-of-contents)

### MicroK8S
Enable the required addons first:

```bash
microk8s enable dns ingress helm3
```

Import the locally-built Docker images into the MicroK8S container runtime:

```bash
docker save weather-sim-api:local | microk8s ctr image import -
docker save weather-sim-web:local | microk8s ctr image import -
```

Then install the chart with the common Helm command, using `microk8s kubectl` and `microk8s helm3` if you prefer:

```bash
microk8s kubectl create namespace weather-sim
microk8s kubectl -n weather-sim create secret generic weather-sim-session-secret \
  --from-literal=SESSION_SECRET='replace-with-long-random-value'
microk8s kubectl -n weather-sim create deployment redis-master --image=redis:8.6.1
microk8s kubectl -n weather-sim expose deployment redis-master --port=6379 --target-port=6379

microk8s helm3 upgrade --install weather-sim ./app/deployment/charts/weather-sim \
  --namespace weather-sim \
  -f ./app/deployment/charts/weather-sim/values-local.yaml \
  --set image.api=weather-sim-api:local \
  --set image.web=weather-sim-web:local \
  --set env.CORS_ORIGIN=http://localhost \
  --set ingress.host=weather-sim.local
```

MicroK8S ingress is typically reachable on the node IP. For a quick local test:

```bash
microk8s kubectl -n weather-sim port-forward svc/weather-sim-web 8088:80
microk8s kubectl -n weather-sim port-forward svc/weather-sim-api 8080:8080
```

[Back to Table of Contents](#table-of-contents)

### KinD
Create a KinD cluster and load the images into the cluster nodes:

```bash
kind create cluster --name weather-sim
kind load docker-image weather-sim-api:local --name weather-sim
kind load docker-image weather-sim-web:local --name weather-sim
```

Install an ingress controller if you want to use the chart's ingress resource. If not, keep using port-forwarding.

Then run the common prerequisites and Helm install against the KinD context:

```bash
kubectl config use-context kind-weather-sim
kubectl create namespace weather-sim
kubectl -n weather-sim create secret generic weather-sim-session-secret \
  --from-literal=SESSION_SECRET='replace-with-long-random-value'
kubectl -n weather-sim create deployment redis-master --image=redis:8.6.1
kubectl -n weather-sim expose deployment redis-master --port=6379 --target-port=6379

helm upgrade --install weather-sim ./app/deployment/charts/weather-sim \
  --namespace weather-sim \
  -f ./app/deployment/charts/weather-sim/values-local.yaml \
  --set image.api=weather-sim-api:local \
  --set image.web=weather-sim-web:local \
  --set env.CORS_ORIGIN=http://localhost \
  --set ingress.host=weather-sim.local
```

For a simple local access path:

```bash
kubectl -n weather-sim port-forward svc/weather-sim-web 8088:80
kubectl -n weather-sim port-forward svc/weather-sim-api 8080:8080
```

[Back to Table of Contents](#table-of-contents)

### Uninstall

```bash
helm uninstall weather-sim -n weather-sim
kubectl delete namespace weather-sim
```

[Back to Table of Contents](#table-of-contents)

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

[Back to Table of Contents](#table-of-contents)

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
- Public API Gateway routing to the internal API service through a VPC link
- `observability` namespace and observability Helm releases
- CloudWatch log group for Fluent Bit application logs
- DNS record for the application hostname

[Back to Table of Contents](#table-of-contents)

## Important Limitations
- Redis is still not provisioned for the EKS environment
- The chart does not create the `weather-sim-session-secret`; it must exist before deployment
- The ingress currently routes only the web service and does not expose the API
- The EKS control plane is not publicly exposed, so administrative cluster access still requires the appropriate network path and credentials
- Kafka, Elasticsearch, Kibana, and Kafbat UI remain internal-only in EKS
- An Application Load Balancer cannot have an Elastic IP attached directly; use AWS Global Accelerator or a different entry pattern if static public IPs are needed later

[Back to Table of Contents](#table-of-contents)

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

[Back to Table of Contents](#table-of-contents)
