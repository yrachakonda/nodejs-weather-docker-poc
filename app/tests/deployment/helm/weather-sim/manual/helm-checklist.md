# Weather Sim Helm Manual Checklist

Use this checklist when you want to validate the chart by hand instead of running the helper scripts.

## Chart sanity
- [ ] Run `helm lint` against `app/deployment/weather-sim/charts`.
- [ ] Render the chart with `helm template` using `values.yaml` and `values-local.yaml`.
- [ ] Confirm the rendered manifest contains `weather-sim-api` and `weather-sim-web` Deployments.
- [ ] Confirm the rendered manifest contains `weather-sim-config`, both Services, the Ingress, the API HPA, and the API PodDisruptionBudget.
- [ ] Confirm the API Deployment includes `livenessProbe` and `readinessProbe` endpoints on `/api/v1/system/live` and `/api/v1/system/ready`.
- [ ] Confirm the rendered manifest still contains the expected Deployments, Services, ConfigMap, Ingress, HPA, and PodDisruptionBudget resources.

## KinD smoke flow
- [ ] Build the local API and web images from `app/backend` and `app/frontend`.
- [ ] Create or select a KinD cluster named `weather-sim`.
- [ ] Load the local images into the KinD cluster.
- [ ] Create the `weather-sim` namespace.
- [ ] Create the `weather-sim-session-secret` secret with `SESSION_SECRET`.
- [ ] Deploy Redis as `redis-master` on port `6379`.
- [ ] Install or upgrade the Helm release with the local chart values and local image tags.
- [ ] Wait for `weather-sim-api` and `weather-sim-web` rollouts to complete.
- [ ] Port-forward `weather-sim-api` to `18080` and `weather-sim-web` to `18081`.
- [ ] Confirm `GET /api/v1/system/health` returns `{"status":"healthy"}`.
- [ ] Log in with `premiumuser / premium-pass` and confirm `/api/v1/auth/me` returns the session user.
- [ ] Confirm `/api/v1/weather/premium-forecast` succeeds for the premium session.
- [ ] Uninstall the release and clean up the namespace or cluster when finished.

## Optional ingress check
- [ ] If an ingress controller is already installed in KinD, repeat the web check through the chart Ingress host.
- [ ] Confirm the ingress routes only the web service and not the API service.
