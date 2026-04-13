# Local Development

## Table of Contents
- [Overview](#overview)
- [When To Use Which Mode](#when-to-use-which-mode)
- [Prerequisites](#prerequisites)
- [Docker Compose Workflow](#docker-compose-workflow)
  - [Start The Stack](#start-the-stack)
  - [Local Endpoints](#local-endpoints)
  - [Services Started By Docker Compose](#services-started-by-docker-compose)
  - [Local Logging Path](#local-logging-path)
  - [View Logs In Kafka UI](#view-logs-in-kafka-ui)
  - [View API Logs In Kibana](#view-api-logs-in-kibana)
- [Local Kubernetes Workflow](#local-kubernetes-workflow)
  - [What The Local Kubernetes Workflow Covers](#what-the-local-kubernetes-workflow-covers)
  - [What It Does Not Fully Reproduce](#what-it-does-not-fully-reproduce)
- [Pick A Local Cluster](#pick-a-local-cluster)
  - [Option 1: Minikube](#option-1-minikube)
  - [Option 2: MicroK8s](#option-2-microk8s)
  - [Option 3: Docker Desktop Kubernetes](#option-3-docker-desktop-kubernetes)
- [Build The Application Images](#build-the-application-images)
- [Prepare A Local Values Override](#prepare-a-local-values-override)
- [Optional: Deploy Redis In The Local Cluster](#optional-deploy-redis-in-the-local-cluster)
- [Deploy The Helm Chart](#deploy-the-helm-chart)
- [Access The Local Kubernetes Deployment](#access-the-local-kubernetes-deployment)
  - [Option 1: Ingress Host Mapping](#option-1-ingress-host-mapping)
  - [Option 2: Port Forwarding](#option-2-port-forwarding)
- [Test The Local Kubernetes Deployment](#test-the-local-kubernetes-deployment)
  - [Basic Health Checks](#basic-health-checks)
  - [Browser Testing](#browser-testing)
  - [Kubernetes Runtime Checks](#kubernetes-runtime-checks)
  - [Helm-Level Checks](#helm-level-checks)
  - [Optional E2E Testing Against Local Kubernetes](#optional-e2e-testing-against-local-kubernetes)
- [Visualize And Inspect The Local Cluster](#visualize-and-inspect-the-local-cluster)
  - [Lens Desktop](#lens-desktop)
  - [Docker Desktop Kubernetes UI](#docker-desktop-kubernetes-ui)
  - [K9s](#k9s)
  - [Octant](#octant)
  - [Headlamp](#headlamp)
  - [Stern](#stern)
- [Troubleshooting Local Kubernetes](#troubleshooting-local-kubernetes)
- [Useful Local Credentials](#useful-local-credentials)
- [Workspace Commands](#workspace-commands)

## Overview
This repository supports two practical local workflows:
- Docker Compose for the full local application plus observability stack already checked into `app/docker-compose.yml`
- Local Kubernetes for validating the Helm chart, Kubernetes service wiring, ingress behavior, and cluster operations using MicroK8s, Minikube, or Docker Desktop Kubernetes

Important limitation:
- The full AWS edge architecture from the Terraform deployment is not reproduced locally. There is no local equivalent here for API Gateway, AWS WAF, Route53, ACM, VPC Link, or AWS-managed load balancers.
- The local Kubernetes workflow is best used to test the in-cluster application path: ingress -> web service and API service -> pods.
- If you want a closer end-to-end observability experience locally, Docker Compose remains the easiest way to run Redis, Kafka, Fluent Bit, Logstash, Elasticsearch, and Kibana together on one machine.

[Back to Table of Contents](#table-of-contents)

## When To Use Which Mode
- Use Docker Compose when you want the fastest local startup and the repository's complete local observability stack.
- Use local Kubernetes when you want to validate the Helm chart, test pod/service/ingress behavior, and exercise the app the way it will run in a cluster.
- Use both when needed: run the application on local Kubernetes and use local cluster tooling for Kubernetes behavior, then fall back to Docker Compose when you need the full bundled Kafka and Elastic stack from this repo.

[Back to Table of Contents](#table-of-contents)

## Prerequisites
- Docker Desktop or a working local container runtime
- Node.js and npm if you want to run workspace commands outside containers
- `kubectl`
- `helm`

Optional but recommended local Kubernetes tooling:
- `minikube` if you want a disposable local cluster with an easy ingress addon
- `microk8s` if you want a lightweight local cluster on Linux
- Docker Desktop Kubernetes if you already use Docker Desktop and want the simplest local cluster bootstrap
- Lens Desktop for graphical cluster inspection
- `k9s` for terminal-based cluster inspection
- `stern` or `kubetail` for multi-pod log tailing

[Back to Table of Contents](#table-of-contents)

## Docker Compose Workflow
Use this when you want the repository's full local stack exactly as currently defined.

### Start The Stack
Run from `app/`:

```bash
cp .env.example .env
docker compose up --build
```

[Back to Table of Contents](#table-of-contents)

### Local Endpoints
- Web UI: `http://localhost:5173`
- API base: `http://localhost:8080/api/v1`
- Kafka UI: `http://localhost:8081`
- Kibana: `http://localhost:5601`

[Back to Table of Contents](#table-of-contents)

### Services Started By Docker Compose
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

### Local Logging Path
- `api` and `web` write logs to stdout/stderr
- Docker Compose forwards those logs to the local `fluent-bit` container with the `fluentd` logging driver
- Fluent Bit publishes to the local Apache Kafka topic `weather-sim.logs`
- Logstash reads from Kafka and writes to Elasticsearch index `weather-sim-logs-%{+YYYY.MM.dd}`
- Kibana reads from Elasticsearch

[Back to Table of Contents](#table-of-contents)

### View Logs In Kafka UI
Kafka UI is the fastest way to confirm that Fluent Bit is publishing records into Kafka before Logstash or Elasticsearch are involved.

1. Start the local stack with `docker compose up --build`.
2. Open `http://localhost:8081`.
3. Select the cluster named `weather-sim-local`.
4. Open `Topics`.
5. Select the topic `weather-sim.logs`.
6. Open `Messages`.
7. Click `Consume messages`.

Useful traffic generators:

```bash
curl http://localhost:8080/api/v1/system/health
curl "http://localhost:8080/api/v1/weather/current?location=seattle" -H "x-api-key: poc-premium-key-001"
```

[Back to Table of Contents](#table-of-contents)

### View API Logs In Kibana
1. Open `http://localhost:5601`.
2. Open `Discover`.
3. If prompted, create a data view:
   - Name: `weather-sim-logs`
   - Index pattern: `weather-sim-logs-*`
   - Time field: `@timestamp` if present, otherwise `timestamp`
4. Search with filters such as:
   - `service : "weather-sim-api"`
   - `level : "http"`
   - `statusCode >= 400`

[Back to Table of Contents](#table-of-contents)

## Local Kubernetes Workflow
This workflow validates the Helm chart under `app/deployment/weather-sim/charts` against a real local cluster.

### What The Local Kubernetes Workflow Covers
- local image build and deployment
- Kubernetes Deployments, Services, and Ingress behavior
- local web and API access through cluster networking
- Helm chart testing and troubleshooting
- cluster inspection with Lens Desktop, Docker Desktop, `k9s`, and `kubectl`

[Back to Table of Contents](#table-of-contents)

### What It Does Not Fully Reproduce
- API Gateway
- AWS WAF
- Route53 and ACM
- VPC Link
- AWS Load Balancer Controller behavior
- Terraform-managed AWS resources

[Back to Table of Contents](#table-of-contents)

## Pick A Local Cluster

### Option 1: Minikube
Start a cluster and enable ingress:

```bash
minikube start
minikube addons enable ingress
kubectl get nodes
```

If you want the built images available inside Minikube:

```bash
minikube image load weather-sim-api:1.0.0
minikube image load weather-sim-web:1.0.0
```

[Back to Table of Contents](#table-of-contents)

### Option 2: MicroK8s
Enable the core services you need:

```bash
microk8s enable dns storage ingress
microk8s kubectl get nodes
```

If `kubectl` is not already pointed at MicroK8s:

```bash
microk8s config > ~/.kube/config
kubectl get nodes
```

[Back to Table of Contents](#table-of-contents)

### Option 3: Docker Desktop Kubernetes
1. Enable Kubernetes in Docker Desktop settings.
2. Wait for Docker Desktop to report Kubernetes as running.
3. Confirm connectivity:

```bash
kubectl get nodes
```

This is the simplest option if you already use Docker Desktop to build the local images.

[Back to Table of Contents](#table-of-contents)

## Build The Application Images
Run from `app/`:

```bash
docker build -t weather-sim-api:1.0.0 ./backend
docker build -t weather-sim-web:1.0.0 ./frontend
```

Image notes:
- Docker Desktop Kubernetes can use these local images directly.
- Minikube usually needs `minikube image load`.
- MicroK8s may need either image import or a local registry flow depending on your runtime setup.

[Back to Table of Contents](#table-of-contents)

## Prepare A Local Values Override
The checked-in chart defaults are production-oriented. For local Kubernetes, use `app/deployment/weather-sim/charts/values-local.yaml` and add a small override file for local image pull policy and ingress host if needed.

Example file: `app/deployment/weather-sim/charts/values-local-k8s.yaml`

```yaml
image:
  api: weather-sim-api:1.0.0
  web: weather-sim-web:1.0.0

env:
  CORS_ORIGIN: http://weather-sim.local

ingress:
  enabled: true
  className: nginx
  host: weather-sim.local
  annotations: {}

service:
  apiType: ClusterIP
  webType: ClusterIP
```

If your local cluster cannot pull local images unless the pull policy is explicit, add:

```yaml
imagePullPolicy: IfNotPresent
```

Note:
- The current chart does not declare a Redis dependency. The app expects Redis for sessions, so either deploy Redis separately in the cluster or limit local verification to health and unauthenticated flows until Redis is available.

[Back to Table of Contents](#table-of-contents)

## Optional: Deploy Redis In The Local Cluster
If you want login and session-backed flows to work in local Kubernetes, deploy Redis first.

Example with Helm:

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm upgrade --install redis bitnami/redis \
  --namespace weather-sim \
  --create-namespace \
  --set architecture=standalone \
  --set auth.enabled=false
```

This matches the chart's default local Redis target of `redis-master:6379`.

[Back to Table of Contents](#table-of-contents)

## Deploy The Helm Chart
Run from the repository root:

```bash
helm upgrade --install weather-sim ./app/deployment/weather-sim/charts \
  --namespace weather-sim \
  --create-namespace \
  -f ./app/deployment/weather-sim/charts/values-local.yaml \
  -f ./app/deployment/weather-sim/charts/values-local-k8s.yaml
```

Verify the deployment:

```bash
kubectl get all -n weather-sim
kubectl get ingress -n weather-sim
kubectl describe pod -n weather-sim
```

Useful checks:
- `kubectl get deploy -n weather-sim`
- `kubectl get svc -n weather-sim`
- `kubectl get endpoints -n weather-sim`
- `kubectl logs deploy/weather-sim-api -n weather-sim`
- `kubectl logs deploy/weather-sim-web -n weather-sim`

[Back to Table of Contents](#table-of-contents)

## Access The Local Kubernetes Deployment

### Option 1: Ingress Host Mapping
If the ingress controller is working, map the ingress host to your local cluster.

For Minikube:

```bash
minikube ip
```

For Docker Desktop or MicroK8s:
- use `localhost` if the ingress is bound locally
- or inspect the ingress controller service:

```bash
kubectl get svc -A
```

Then add a hosts entry such as:

```text
127.0.0.1 weather-sim.local
```

or, for Minikube:

```text
<minikube-ip> weather-sim.local
```

After that:
- Web UI: `http://weather-sim.local/`
- API health: `http://weather-sim.local/api/v1/system/health`

Important:
- In the current chart, ingress only routes the web path. If you need direct API access in local Kubernetes, use port-forwarding or expose a temporary local ingress rule specifically for the API service.

[Back to Table of Contents](#table-of-contents)

### Option 2: Port Forwarding
This is the most reliable local access method when ingress is not yet stable.

Forward the web service:

```bash
kubectl port-forward -n weather-sim svc/weather-sim-web 8088:80
```

Forward the API service:

```bash
kubectl port-forward -n weather-sim svc/weather-sim-api 8080:8080
```

Then use:
- Web UI: `http://localhost:8088`
- API base: `http://localhost:8080/api/v1`

[Back to Table of Contents](#table-of-contents)

## Test The Local Kubernetes Deployment

### Basic Health Checks
If using port-forward:

```bash
curl -fsS http://localhost:8080/api/v1/system/live
curl -fsS http://localhost:8080/api/v1/system/ready
curl -fsS http://localhost:8080/api/v1/system/health
curl -fsS "http://localhost:8080/api/v1/weather/current?location=seattle" -H "x-api-key: poc-premium-key-001"
```

If using ingress host mapping:

```bash
curl -fsS http://weather-sim.local/
curl -fsS http://weather-sim.local/api/v1/system/health
```

[Back to Table of Contents](#table-of-contents)

### Browser Testing
Once the web UI is reachable:
- load the home page
- navigate to the weather screens
- test login if Redis is deployed
- test API-key-backed routes with the seeded API key

[Back to Table of Contents](#table-of-contents)

### Kubernetes Runtime Checks
Run:

```bash
kubectl get pods -n weather-sim -o wide
kubectl describe ingress weather-sim -n weather-sim
kubectl logs deploy/weather-sim-api -n weather-sim --tail=200
kubectl logs deploy/weather-sim-web -n weather-sim --tail=200
```

[Back to Table of Contents](#table-of-contents)

### Helm-Level Checks
Run:

```bash
helm list -n weather-sim
helm get values weather-sim -n weather-sim
helm get manifest weather-sim -n weather-sim
helm status weather-sim -n weather-sim
```

[Back to Table of Contents](#table-of-contents)

### Optional E2E Testing Against Local Kubernetes
If the app is reachable through either ingress or port-forward, point Playwright at the local endpoints.

Example from `app/`:

```bash
$env:PLAYWRIGHT_BASE_URL="http://localhost:8088"
$env:PLAYWRIGHT_API_BASE_URL="http://localhost:8080/api/v1"
npm run test:e2e:smoke
```

The remote runner works for this mode too and avoids shell-specific environment setup:

```bash
npm run test:e2e:remote:smoke -- --base-url http://localhost:8088 --api-base-url http://localhost:8080/api/v1
```

You can also run the broader suites from `app/`:

```bash
npm run test:e2e
npm run test:e2e:remote -- --base-url http://localhost:8088 --api-base-url http://localhost:8080/api/v1
npm run perf:baseline
npm run perf:load
```

[Back to Table of Contents](#table-of-contents)

## Visualize And Inspect The Local Cluster

### Lens Desktop
Lens Desktop is one of the easiest ways to inspect workloads, logs, events, and port-forwarding.

Basic workflow:
1. Open Lens Desktop.
2. Add the current kubeconfig context.
3. Open the `weather-sim` namespace.
4. Inspect:
   - Pods
   - Deployments
   - Services
   - Ingresses
   - Events
5. Use Lens built-in log streaming for `weather-sim-api` and `weather-sim-web`.
6. Use Lens port-forward support if you do not want terminal-based `kubectl port-forward`.

Useful Lens views:
- workload health
- pod restarts
- service endpoints
- ingress routing
- recent warnings and scheduling failures

[Back to Table of Contents](#table-of-contents)

### Docker Desktop Kubernetes UI
If you use Docker Desktop Kubernetes, Docker Desktop itself can inspect:
- containers and images
- Kubernetes workloads
- service exposure
- basic logs and events

This is convenient when your local images are built by Docker and consumed by the Docker Desktop cluster.

[Back to Table of Contents](#table-of-contents)

### K9s
For fast terminal-based inspection:

```bash
k9s
```

Recommended views:
- `:ns weather-sim`
- deployments
- pods
- services
- ingress
- logs
- events

[Back to Table of Contents](#table-of-contents)

### Octant
Octant is another good local cluster UI if you prefer a browser-based open source dashboard.

Common uses:
- inspect resource relationships
- inspect events
- inspect manifests
- drill into workload conditions and pod details

[Back to Table of Contents](#table-of-contents)

### Headlamp
Headlamp is another Kubernetes UI that works well for local clusters and is lighter weight than a full desktop suite.

[Back to Table of Contents](#table-of-contents)

### Stern
For tailing logs across multiple pods:

```bash
stern weather-sim -n weather-sim
stern weather-sim-api -n weather-sim
```

This is often faster than clicking around in a UI when debugging rollout or runtime issues.

[Back to Table of Contents](#table-of-contents)

## Troubleshooting Local Kubernetes
- Images fail to pull:
  - confirm the cluster can see local images
  - use `minikube image load` for Minikube
  - confirm tag names match the Helm values overrides
- Pods stay `CrashLoopBackOff`:
  - inspect `kubectl logs`
  - confirm Redis is reachable if you are testing login/session flows
- Ingress exists but traffic does not route:
  - confirm the ingress controller is installed and healthy
  - confirm the ingress class matches the controller
  - use port-forward first to isolate whether the problem is app/service or ingress
- Web works but login fails:
  - Redis is likely missing or unreachable
- Service has no endpoints:
  - confirm pod labels match the Service selectors in the chart
- Helm release upgrades but behavior does not change:
  - inspect `helm get values` and `helm get manifest`
  - confirm you passed both values files

[Back to Table of Contents](#table-of-contents)

## Useful Local Credentials
- `admin/admin-pass`
- `basicuser/basic-pass`
- `premiumuser/premium-pass`

Default local API key:
- `poc-premium-key-001`

[Back to Table of Contents](#table-of-contents)

## Workspace Commands
Run from `app/`:

```bash
npm run build
npm run test
npm run lint
```

Additional test commands from `app/`:

```bash
npm run test:e2e:smoke
npm run test:e2e
npm run test:e2e:remote -- --base-url <web-url> --api-base-url <api-url>
npm run perf:baseline
npm run perf:load
```

Manual API verification assets live in `app/tests/postman/weather-sim.postman_collection.json`. Import that collection into Postman, then set `baseUrl` to either the local API URL or your port-forwarded Kubernetes API URL.

Use [Testing Guide](testing.md) for broader suite coverage, Docker Compose specifics, remote Playwright execution, Postman usage, and Terraform checks. Use [Contract Reference](contracts.md) for expected endpoint and auth behavior, and [DAST Scenarios](dast-scenarios.md) for adversarial checks.

[Back to Table of Contents](#table-of-contents)
