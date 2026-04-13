# Weather Sim KinD Integration Tests

This directory contains the Helm integration harness for `app/deployment/weather-sim/charts`.

## What the suite does

- Starts a Testcontainers-managed local OCI registry
- Builds four tiny fixture images from `kind-fixtures/Dockerfile`
- Pushes and re-pulls those images through the registry
- Creates a KinD cluster and loads the images into the node runtime
- Creates the namespace and required `weather-sim-session-secret`
- Installs the chart with test-safe overrides
- Verifies Deployment, Service, ConfigMap, Ingress, HPA, and PDB objects
- Port-forwards the Services and checks the API and web endpoints
- Upgrades the release to a second fixture image set and verifies the rollout

## Run the automated suite

From `app/`:

```bash
npx vitest run --config tests/deployment/helm/weather-sim/integration/vitest.config.ts
```

## Manual verification flow

The automated suite is the preferred path, but the same flow can be run manually if you want to inspect the release:

```bash
# From app/
npx vitest run --config tests/deployment/helm/weather-sim/integration/vitest.config.ts --reporter=verbose
```

If you want to inspect the live KinD objects after the test harness finishes, re-run the suite with breakpoints or reuse the same release setup from the test file and then inspect:

```bash
kubectl get all,ingress,hpa,pdb -n <namespace>
kubectl get configmap weather-sim-config -n <namespace> -o yaml
kubectl get deployment weather-sim-api -n <namespace> -o yaml
kubectl port-forward -n <namespace> svc/weather-sim-api 18080:8080
kubectl port-forward -n <namespace> svc/weather-sim-web 18081:80
curl http://127.0.0.1:18080/api/v1/system/ready
curl http://127.0.0.1:18080/api/v1/system/version
curl http://127.0.0.1:18081/
```

## Prerequisites

- Docker
- KinD
- kubectl
- Helm

If any of those are missing, the Vitest suite skips itself with a clear message.
