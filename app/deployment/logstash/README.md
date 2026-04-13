# logstash Helm Chart

This directory now contains a standalone Helm chart for the weather-sim Logstash stage.

## What it installs

- a persistent Logstash StatefulSet
- a Service for the Logstash HTTP API
- a ConfigMap with the current Kafka input and Elasticsearch output pipeline

## Default assumptions

- install into the `observability` namespace
- Kafka bootstrap address: `kafka:29092`
- Elasticsearch endpoint: `http://elasticsearch:9200`
- persisted queue and data both live on the StatefulSet volume

## Typical install

```bash
helm upgrade --install logstash ./app/deployment/logstash -n observability --create-namespace
```

## Useful overrides

- `kafka.bootstrapServers` and `kafka.topics`
- `elasticsearch.hosts` and `elasticsearch.index`
- `observabilityNamespace` for the indexed document metadata
- `persistence.size` and `persistence.storageClassName`
