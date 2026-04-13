# kafka Helm Chart

This directory now contains a standalone Helm chart for the weather-sim Kafka broker.

## What it installs

- a single-node KRaft Kafka StatefulSet with persistent storage
- an install/upgrade hook job that creates `weather-sim.logs`
- an optional Kafbat UI Deployment and Service

## Default assumptions

- install into the `observability` namespace
- broker service name: `kafka`
- internal bootstrap address: `kafka:29092`
- controller listener service: `kafka-headless:9093`

## Typical install

```bash
helm upgrade --install kafka ./app/deployment/kafka -n observability --create-namespace
```

## Useful overrides

- `kraft.clusterId` for a custom KRaft cluster ID
- `storage.size` and `storage.storageClassName` for persistence
- `topicInit.topics` to add or change bootstrap topics
- `ui.enabled` to disable the Kafka UI
