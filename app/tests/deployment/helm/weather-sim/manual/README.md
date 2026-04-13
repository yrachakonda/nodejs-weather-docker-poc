# Weather Sim Helm Manual Checks

This folder contains manual, engineer-executable Python helpers for the `weather-sim` Helm chart and a KinD smoke flow.

## What lives here
- `Invoke-WeatherSimHelmChecks.py` - lint and render the chart, then check the expected resource mix in the rendered manifest.
- `Invoke-WeatherSimKindSmoke.py` - stand up a KinD cluster, deploy the chart, and smoke test the API and web endpoints.
- `helm-checklist.md` - a manual checklist for engineers who want to step through the same flow by hand.

## Prerequisites
- Python 3.11+
- Docker Desktop or Docker Engine
- `helm`
- `kubectl`
- `kind`
- `docker`

## Recommended order
1. Run `python app/tests/deployment/helm/weather-sim/manual/Invoke-WeatherSimHelmChecks.py` to validate the chart render.
2. Run `python app/tests/deployment/helm/weather-sim/manual/Invoke-WeatherSimKindSmoke.py` to validate the KinD deployment path.
3. Use `helm-checklist.md` if you want to perform the same checks manually.

## Notes
- The scripts resolve the repository root automatically when run from this folder.
- The KinD smoke script builds local `weather-sim` API and web images unless you pass `--skip-image-build`.
- The KinD smoke script uses port-forwarded checks by default, which is more reliable than requiring an ingress controller in every local environment.
- The KinD smoke script keeps the cluster and namespace only if you pass `--skip-cleanup`.
