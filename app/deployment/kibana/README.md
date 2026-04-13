# Kibana Helm Chart

This directory is a standalone Helm chart that deploys Kibana and connects it to Elasticsearch through values.

## What It Deploys

- Deployment for Kibana
- ClusterIP service
- ConfigMap rendered from the existing `kibana.yml`
- Helm test hook that checks the status endpoint

## Install

```bash
helm install kibana ./app/deployment/kibana -n observability --create-namespace
```

## Useful Values

- `elasticsearch.hosts`
- `kibana.publicBaseUrl`
- `kibana.telemetryEnabled`
- `service.port`
- `fullnameOverride`

## Test

```bash
helm test kibana -n observability
```

## Notes

- The chart defaults to the repo's local observability wiring: Kibana points at `http://elasticsearch:9200`.
- The existing `kibana.yml` file is templated and mounted into the pod config directory.
