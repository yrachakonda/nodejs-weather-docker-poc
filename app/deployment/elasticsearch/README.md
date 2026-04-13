# Elasticsearch Helm Chart

This directory is a standalone Helm chart that deploys Elasticsearch as a single-node StatefulSet with persistent storage.

## What It Deploys

- StatefulSet with a persistent volume claim
- Headless service for StatefulSet identity
- ClusterIP service for HTTP access
- ConfigMap rendered from the existing `elasticsearch.yml`
- Helm test hook that checks cluster health

## Install

```bash
helm install elasticsearch ./app/deployment/elasticsearch -n observability --create-namespace
```

## Useful Values

- `persistence.size`
- `persistence.storageClass`
- `elasticsearch.clusterName`
- `elasticsearch.discoveryType`
- `elasticsearch.security.enabled`
- `service.httpPort`
- `fullnameOverride`

## Test

```bash
helm test elasticsearch -n observability
```

## Notes

- The chart defaults to the repository's non-secure single-node Elasticsearch flow.
- The existing `elasticsearch.yml` file is templated and mounted into the pod config directory.
