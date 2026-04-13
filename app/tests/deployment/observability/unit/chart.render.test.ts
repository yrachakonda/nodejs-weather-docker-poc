import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import {
  buildObservabilityValues,
  createTempWorkspace,
  findManifest,
  lintChart,
  materializeObservabilityWorkspace,
  renderChart,
  runCommand,
  sourceChartDir,
  writeJsonFile
} from '../support/chart';

const canRunHelm = (() => {
  try {
    runCommand('helm', ['version', '--short']);
    return true;
  } catch {
    return false;
  }
})();

const suite = canRunHelm ? describe : describe.skip;

suite('observability stack chart', () => {
  it('declares local file dependencies for the five component charts', () => {
    const chart = parseYaml(fs.readFileSync(path.join(sourceChartDir, 'Chart.yaml'), 'utf8')) as {
      dependencies?: Array<{ name: string; alias?: string; repository: string; condition: string }>;
    };
    const values = parseYaml(fs.readFileSync(path.join(sourceChartDir, 'values.yaml'), 'utf8')) as {
      global?: { namespace?: string; clusterName?: string; appNamespace?: string };
      elasticsearch?: { fullnameOverride?: string };
      kibana?: { fullnameOverride?: string };
      kafka?: { fullnameOverride?: string; ui?: { enabled?: boolean } };
      fluentBit?: { fullnameOverride?: string; service?: { enabled?: boolean } };
      logstash?: { fullnameOverride?: string };
    };

    expect(chart.dependencies).toEqual([
      expect.objectContaining({ name: 'elasticsearch', repository: 'file://../elasticsearch', condition: 'elasticsearch.enabled' }),
      expect.objectContaining({ name: 'kibana', repository: 'file://../kibana', condition: 'kibana.enabled' }),
      expect.objectContaining({ name: 'kafka', repository: 'file://../kafka', condition: 'kafka.enabled' }),
      expect.objectContaining({ name: 'fluent-bit', alias: 'fluentBit', repository: 'file://../fluent-bit', condition: 'fluentBit.enabled' }),
      expect.objectContaining({ name: 'logstash', repository: 'file://../logstash', condition: 'logstash.enabled' })
    ]);

    expect(values.global).toMatchObject({
      namespace: 'observability',
      clusterName: 'weather-sim-observability',
      appNamespace: 'weather-sim'
    });
    expect(values.elasticsearch?.fullnameOverride).toBe('elasticsearch');
    expect(values.kibana?.fullnameOverride).toBe('kibana');
    expect(values.kafka?.fullnameOverride).toBe('kafka');
    expect(values.kafka?.ui?.enabled).toBe(true);
    expect(values.fluentBit?.fullnameOverride).toBe('fluent-bit');
    expect(values.fluentBit?.service?.enabled).toBe(true);
    expect(values.logstash?.fullnameOverride).toBe('logstash');
  });

  it('renders the real sibling charts with stable names, storage templates, and config wiring', () => {
    const workspace = createTempWorkspace('observability-render-');

    try {
      const chartPath = materializeObservabilityWorkspace(workspace.directory);
      const valuesPath = writeJsonFile(
        workspace.directory,
        'values.render.json',
        buildObservabilityValues({
          registryHost: 'localhost:5000',
          version: 'render-v1'
        })
      );

      lintChart({
        chartPath,
        valuesFiles: [valuesPath],
        namespace: 'observability'
      });

      const rendered = renderChart({
        chartPath,
        valuesFiles: [valuesPath],
        releaseName: 'observability-stack',
        namespace: 'observability'
      });

      expect(rendered).toContain('kind: StatefulSet');
      expect(rendered).toContain('kind: Deployment');
      expect(rendered).toContain('kind: DaemonSet');
      expect(rendered).toContain('kind: Job');
      expect(rendered).toContain('name: elasticsearch-headless');
      expect(rendered).toContain('name: kibana');
      expect(rendered).toContain('name: kafka-topic-init');
      expect(rendered).toContain('name: kafka-ui');
      expect(rendered).toContain('name: fluent-bit');
      expect(rendered).toContain('name: logstash-headless');
      expect(rendered).toContain('volumeClaimTemplates:');

      expect(findManifest(rendered, 'ConfigMap', 'elasticsearch')).toContain('cluster.name: "weather-sim-observability"');
      expect(findManifest(rendered, 'ConfigMap', 'elasticsearch')).toContain('xpack.security.enabled: false');
      expect(findManifest(rendered, 'ConfigMap', 'kibana')).toContain('server.host: "0.0.0.0"');
      expect(findManifest(rendered, 'ConfigMap', 'kibana')).toContain('server.publicBaseUrl: "http://kibana:5601"');
      expect(findManifest(rendered, 'ConfigMap', 'kafka-topic-init')).toContain('weather-sim.logs');
      expect(findManifest(rendered, 'ConfigMap', 'fluent-bit')).toContain("Regex $kubernetes['namespace_name'] ^(observability)$");
      expect(findManifest(rendered, 'ConfigMap', 'fluent-bit')).toContain('Name kafka');
      expect(findManifest(rendered, 'ConfigMap', 'logstash-config')).toContain('bootstrap_servers => "kafka:29092"');
      expect(findManifest(rendered, 'ConfigMap', 'logstash-config')).toContain('hosts => [');
      expect(findManifest(rendered, 'Deployment', 'kafka-ui')).toContain('KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS');
      expect(findManifest(rendered, 'Service', 'fluent-bit')).toContain('port: 2020');
      expect(findManifest(rendered, 'StatefulSet', 'kafka')).toContain('KAFKA_ADVERTISED_LISTENERS');
      expect(findManifest(rendered, 'StatefulSet', 'elasticsearch')).toContain('ES_JAVA_OPTS');
      expect(findManifest(rendered, 'StatefulSet', 'logstash')).toContain('LS_JAVA_OPTS');
    } finally {
      workspace.cleanup();
    }
  });

  it('builds KinD-safe overrides with persistence disabled', () => {
    const values = buildObservabilityValues({
      registryHost: 'localhost:5000',
      version: 'kind-v1',
      persistenceEnabled: false,
      kafkaUiEnabled: false
    }) as {
      global: { namespace: string; clusterName: string; kafkaTopic: string };
      elasticsearch: { image: { repository: string; tag: string }; persistence: { enabled: boolean } };
      kafka: { ui: { enabled: boolean } };
      fluentBit: { service: { enabled: boolean } };
      logstash: { persistence: { enabled: boolean } };
    };

    expect(values.global).toMatchObject({
      namespace: 'observability',
      clusterName: 'weather-sim-observability',
      kafkaTopic: 'weather-sim.logs'
    });
    expect(values.elasticsearch.image.repository).toBe('localhost:5000/observability-fixtures/elasticsearch');
    expect(values.elasticsearch.image.tag).toBe('kind-v1');
    expect(values.elasticsearch.persistence.enabled).toBe(false);
    expect(values.kafka.ui.enabled).toBe(false);
    expect(values.fluentBit.service.enabled).toBe(true);
    expect(values.logstash.persistence.enabled).toBe(false);
  });
});
