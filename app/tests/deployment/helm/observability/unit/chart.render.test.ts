import { describe, expect, it } from 'vitest';
import { findManifest, lintChart, renderChart } from '../support/chart';

describe('kafka chart', () => {
  it('renders the StatefulSet, topic-init job, and optional Kafka UI', () => {
    lintChart({ chart: 'kafka', values: { ui: { enabled: true } } });
    const rendered = renderChart({ chart: 'kafka', values: { ui: { enabled: true } } });

    expect(findManifest(rendered, 'StatefulSet', 'kafka')).toContain('kind: StatefulSet');
    expect(findManifest(rendered, 'Service', 'kafka')).toContain('port: 29092');
    expect(findManifest(rendered, 'Service', 'kafka-headless')).toContain('clusterIP: None');
    expect(findManifest(rendered, 'ConfigMap', 'kafka-topic-init')).toContain('weather-sim.logs');
    expect(findManifest(rendered, 'Job', 'kafka-topic-init')).toContain('"helm.sh/hook": post-install,post-upgrade');
    expect(findManifest(rendered, 'Deployment', 'kafka-ui')).toContain('KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS');
  });

  it('can disable the optional Kafka UI', () => {
    const rendered = renderChart({ chart: 'kafka', values: { ui: { enabled: false } } });

    expect(() => findManifest(rendered, 'Deployment', 'kafka-ui')).toThrow();
  });
});

describe('fluent-bit chart', () => {
  it('renders a DaemonSet with RBAC, hostPath mounts, and Kafka forwarding config', () => {
    lintChart({ chart: 'fluent-bit' });
    const rendered = renderChart({ chart: 'fluent-bit' });

    expect(findManifest(rendered, 'DaemonSet', 'fluent-bit')).toContain('kind: DaemonSet');
    expect(findManifest(rendered, 'ServiceAccount', 'fluent-bit')).toContain('automountServiceAccountToken: true');
    expect(findManifest(rendered, 'ClusterRole', 'fluent-bit')).toContain('resources: ["pods", "namespaces", "nodes"]');
    expect(findManifest(rendered, 'ClusterRoleBinding', 'fluent-bit')).toContain('kind: ClusterRoleBinding');
    const configMap = findManifest(rendered, 'ConfigMap', 'fluent-bit');
    expect(configMap).toContain('Name docker');
    expect(configMap).toContain('Name cri');
    expect(configMap).toContain('Name tail');
    expect(configMap).toContain("Regex $kubernetes['namespace_name'] ^(observability)$");
    expect(configMap).toContain('Brokers kafka:29092');
    expect(configMap).toContain('Topics weather-sim.logs');
  });
});

describe('logstash chart', () => {
  it('renders a persistent StatefulSet with the current Kafka and Elasticsearch pipeline', () => {
    lintChart({ chart: 'logstash' });
    const rendered = renderChart({ chart: 'logstash' });

    expect(findManifest(rendered, 'StatefulSet', 'logstash')).toContain('kind: StatefulSet');
    expect(findManifest(rendered, 'Service', 'logstash')).toContain('port: 9600');
    expect(findManifest(rendered, 'Service', 'logstash-headless')).toContain('clusterIP: None');
    const configMap = findManifest(rendered, 'ConfigMap', 'logstash-config');
    expect(configMap).toContain('queue.type: persisted');
    expect(configMap).toContain('bootstrap_servers => "kafka:29092"');
    expect(configMap).toContain('weather-sim-logs-%{+YYYY.MM.dd}');
    expect(configMap).toContain('observability_namespace');
  });
});
