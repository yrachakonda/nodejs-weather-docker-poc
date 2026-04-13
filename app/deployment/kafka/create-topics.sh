#!/usr/bin/env bash
set -euo pipefail

bootstrap_servers="${KAFKA_BOOTSTRAP_SERVERS:-kafka:29092}"
kafka_bin_dir="${KAFKA_BIN_DIR:-/opt/kafka/bin}"

until "${kafka_bin_dir}/kafka-topics.sh" --bootstrap-server "${bootstrap_servers}" --list >/dev/null 2>&1; do
  sleep 5
done

"${kafka_bin_dir}/kafka-topics.sh" \
  --bootstrap-server "${bootstrap_servers}" \
  --create \
  --if-not-exists \
  --topic "weather-sim.logs" \
  --partitions 3 \
  --replication-factor 1 \
  --config retention.ms="259200000" \
  --config segment.bytes="1073741824" \
  --config cleanup.policy=delete
