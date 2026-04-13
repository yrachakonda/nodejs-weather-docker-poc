# fluent-bit Helm Chart

This directory now contains a standalone DaemonSet chart for log collection.

## What it installs

- Fluent Bit as a DaemonSet with hostPath mounts for container logs
- Kubernetes metadata enrichment via RBAC-backed API access
- Kafka output wired to `weather-sim.logs`
- an optional forward-profile config that preserves the current local behavior

## Default assumptions

- install into the `observability` namespace
- Kafka bootstrap address: `kafka:29092`
- only logs from the `observability` namespace are forwarded by default

## Typical install

```bash
helm upgrade --install fluent-bit ./app/deployment/fluent-bit -n observability --create-namespace
```

## Useful overrides

- `config.profile` to switch between Kubernetes tailing and forward mode
- `config.namespaceFilter.namespaces` to change the allowed namespaces
- `kafka.brokers` and `kafka.topic` to retarget the output
- `service.enabled` to expose the metrics endpoint with a Service
