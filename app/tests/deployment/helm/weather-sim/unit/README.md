# Weather Sim Helm Tests

This directory holds the Vitest-based Helm render coverage for `app/deployment/weather-sim/charts`.

## Render tests

Run the fast render checks from `app/`:

```powershell
npx vitest run --config tests/deployment/helm/weather-sim/support/vitest.config.ts tests/deployment/helm/weather-sim/unit/chart.render.test.ts
```

These tests shell out to `helm lint` and `helm template` for each chart values file:
`values.yaml`, `values-local.yaml`, `values-dev.yaml`, `values-poc.yaml`, and `values-qa.yaml`.

For the cluster-backed suite, use `tests/deployment/helm/weather-sim/integration/README.md`.
