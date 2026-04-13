import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  buildAndPushFixtureImage,
  buildObservabilityValues,
  checkPrerequisites,
  createKindCluster,
  deleteKindCluster,
  helmUpgradeInstall,
  kubectlExec,
  kubectlGetJson,
  kubectlWaitForWorkload,
  loadImageIntoKind,
  materializeObservabilityWorkspace,
  registryEndpoint,
  repullImage,
  runCommand,
  runCommandAllowFailure,
  startPortForward,
  startRegistryContainer,
  waitForHttp,
  writeJsonFile,
  createTempWorkspace
} from '../kind-fixtures/harness';
import type { StartedTestContainer } from 'testcontainers';

type WorkloadManifest = {
  spec: {
    replicas?: number;
    template?: {
      spec?: {
        containers?: Array<{
          image?: string;
        }>;
      };
    };
  };
  status?: {
    readyReplicas?: number;
    availableReplicas?: number;
    currentNumberScheduled?: number;
    numberReady?: number;
    succeeded?: number;
  };
};

type ConfigMapManifest = {
  data?: Record<string, string>;
};

type ServiceManifest = {
  spec: {
    type: string;
  };
};

const missingPrerequisites = checkPrerequisites();

if (missingPrerequisites.length > 0) {
  console.warn(
    `Skipping observability KinD integration tests because the following prerequisites are missing: ${missingPrerequisites.join(', ')}`
  );
}

const suite = missingPrerequisites.length > 0 ? describe.skip : describe.sequential;

const runId = randomUUID().slice(0, 8);
const clusterName = `obs-${runId}`;
const namespace = `observability-${runId}`;
const releaseName = `observability-stack-${runId}`;
const appVersionV1 = 'kind-v1';
const appVersionV2 = 'kind-v2';
const componentRoles = ['elasticsearch', 'kibana', 'kafka', 'fluent-bit', 'logstash', 'kafka-ui'] as const;
const componentPorts: Record<(typeof componentRoles)[number], number> = {
  elasticsearch: 9200,
  kibana: 5601,
  kafka: 9092,
  'fluent-bit': 2020,
  logstash: 9600,
  'kafka-ui': 8080
};

suite('observability Helm chart in KinD', () => {
  let registryContainer: StartedTestContainer | undefined;
  let workspace: ReturnType<typeof createTempWorkspace> | undefined;
  let chartPath = '';
  let valuesV1Path = '';
  let valuesV2Path = '';
  let registryHost = '';

  beforeAll(async () => {
    workspace = createTempWorkspace(`observability-kind-${runId}-`);

    registryContainer = await startRegistryContainer();
    registryHost = registryEndpoint(registryContainer);

    for (const version of [appVersionV1, appVersionV2]) {
      for (const role of componentRoles) {
        const imageTag = buildAndPushFixtureImage({
          registryHost,
          role,
          version,
          port: componentPorts[role]
        });

        repullImage(imageTag);
      }
    }

    createKindCluster(clusterName);
    runCommand('kubectl', ['config', 'use-context', `kind-${clusterName}`]);
    runCommandAllowFailure('kubectl', ['delete', 'namespace', namespace, '--ignore-not-found=true']);

    for (const version of [appVersionV1, appVersionV2]) {
      for (const role of componentRoles) {
        loadImageIntoKind(clusterName, buildObservabilityImageTag(registryHost, role, version));
      }
    }

    chartPath = materializeObservabilityWorkspace(workspace.directory);
    valuesV1Path = writeJsonFile(
      workspace.directory,
      'values.v1.json',
      buildObservabilityValues({
        registryHost,
        version: appVersionV1,
        persistenceEnabled: false
      })
    );
    valuesV2Path = writeJsonFile(
      workspace.directory,
      'values.v2.json',
      buildObservabilityValues({
        registryHost,
        version: appVersionV2,
        persistenceEnabled: false
      })
    );

    runCommand('kubectl', ['delete', 'clusterrole', 'fluent-bit', 'clusterrolebinding', 'fluent-bit', '--ignore-not-found=true']);

    helmUpgradeInstall({
      releaseName,
      namespace,
      chartPath,
      valuesFile: valuesV1Path
    });

    kubectlWaitForWorkload(namespace, 'statefulset', 'elasticsearch');
    kubectlWaitForWorkload(namespace, 'deployment', 'kibana');
    kubectlWaitForWorkload(namespace, 'statefulset', 'kafka');
    kubectlWaitForWorkload(namespace, 'deployment', 'kafka-ui');
    kubectlWaitForWorkload(namespace, 'daemonset', 'fluent-bit');
    kubectlWaitForWorkload(namespace, 'statefulset', 'logstash');
  }, 900_000);

  afterAll(async () => {
    deleteKindCluster(clusterName);

    if (registryContainer) {
      await registryContainer.stop();
    }

    workspace?.cleanup();
  }, 120_000);

  it('installs the stack and exposes the expected Kubernetes resources', () => {
    const elasticsearch = kubectlGetJson<WorkloadManifest>(namespace, 'statefulset', 'elasticsearch');
    const kibana = kubectlGetJson<WorkloadManifest>(namespace, 'deployment', 'kibana');
    const kafka = kubectlGetJson<WorkloadManifest>(namespace, 'statefulset', 'kafka');
    const kafkaUi = kubectlGetJson<WorkloadManifest>(namespace, 'deployment', 'kafka-ui');
    const fluentBit = kubectlGetJson<WorkloadManifest>(namespace, 'daemonset', 'fluent-bit');
    const logstash = kubectlGetJson<WorkloadManifest>(namespace, 'statefulset', 'logstash');
    const elasticsearchConfig = kubectlGetJson<ConfigMapManifest>(namespace, 'configmap', 'elasticsearch');
    const kibanaConfig = kubectlGetJson<ConfigMapManifest>(namespace, 'configmap', 'kibana');
    const kafkaConfig = kubectlGetJson<ConfigMapManifest>(namespace, 'configmap', 'kafka-topic-init');
    const fluentBitConfig = kubectlGetJson<ConfigMapManifest>(namespace, 'configmap', 'fluent-bit');
    const logstashConfig = kubectlGetJson<ConfigMapManifest>(namespace, 'configmap', 'logstash-config');
    const elasticsearchService = kubectlGetJson<ServiceManifest>(namespace, 'service', 'elasticsearch');
    const kibanaService = kubectlGetJson<ServiceManifest>(namespace, 'service', 'kibana');
    const kafkaService = kubectlGetJson<ServiceManifest>(namespace, 'service', 'kafka');
    const kafkaUiService = kubectlGetJson<ServiceManifest>(namespace, 'service', 'kafka-ui');
    const fluentBitService = kubectlGetJson<ServiceManifest>(namespace, 'service', 'fluent-bit');
    const logstashService = kubectlGetJson<ServiceManifest>(namespace, 'service', 'logstash');

    expect(elasticsearch.spec.replicas).toBe(1);
    expect(kibana.spec.replicas).toBe(1);
    expect(kafka.spec.replicas).toBe(1);
    expect(kafkaUi.spec.replicas).toBe(1);
    expect(logstash.spec.replicas).toBe(1);
    expect(fluentBit.status?.numberReady).toBeGreaterThanOrEqual(1);
    expect(elasticsearch.status?.readyReplicas).toBe(1);
    expect(kibana.status?.availableReplicas).toBe(1);
    expect(kafka.status?.readyReplicas).toBe(1);
    expect(kafkaUi.status?.availableReplicas).toBe(1);
    expect(logstash.status?.readyReplicas).toBe(1);
    expect(elasticsearchService.spec.type).toBe('ClusterIP');
    expect(kibanaService.spec.type).toBe('ClusterIP');
    expect(kafkaService.spec.type).toBe('ClusterIP');
    expect(kafkaUiService.spec.type).toBe('ClusterIP');
    expect(fluentBitService.spec.type).toBe('ClusterIP');
    expect(logstashService.spec.type).toBe('ClusterIP');

    expect(elasticsearchConfig.data?.['elasticsearch.yml']).toContain('cluster.name: "weather-sim-observability"');
    expect(elasticsearchConfig.data?.['elasticsearch.yml']).toContain('xpack.security.enabled: false');
    expect(kibanaConfig.data?.['kibana.yml']).toContain('server.host: "0.0.0.0"');
    expect(kibanaConfig.data?.['kibana.yml']).toContain('server.publicBaseUrl: "http://kibana:5601"');
    expect(kafkaConfig.data?.['topic-init.sh']).toContain('weather-sim.logs');
    expect(fluentBitConfig.data?.['fluent-bit.conf']).toContain("Regex $kubernetes['namespace_name'] ^(observability)$");
    expect(fluentBitConfig.data?.['fluent-bit.conf']).toContain('Name kafka');
    expect(logstashConfig.data?.['logstash.yml']).toContain('queue.type: persisted');
    expect(logstashConfig.data?.['weather-sim.conf']).toContain('observability_namespace');
    expect(logstashConfig.data?.['weather-sim.conf']).toContain('bootstrap_servers => "kafka:29092"');
    expect(logstashConfig.data?.['weather-sim.conf']).toContain('hosts => [');
  }, 60_000);

  it('answers the core health checks and reflects the expected wiring', async () => {
    const elasticsearchForward = await startPortForward({
      namespace,
      resource: 'svc/elasticsearch',
      remotePort: 9200
    });
    const kibanaForward = await startPortForward({
      namespace,
      resource: 'svc/kibana',
      remotePort: 5601
    });
    const fluentBitForward = await startPortForward({
      namespace,
      resource: 'svc/fluent-bit',
      remotePort: 2020
    });
    const logstashForward = await startPortForward({
      namespace,
      resource: 'svc/logstash',
      remotePort: 9600
    });

    try {
      await waitForHttp(`http://127.0.0.1:${elasticsearchForward.localPort}/_cluster/health`, async (response) => {
        const body = await response.json();
        expect(response.status).toBe(200);
        expect(body).toMatchObject({
          cluster_name: 'weather-sim-observability',
          status: 'green'
        });
      }, 240_000);

      await waitForHttp(`http://127.0.0.1:${kibanaForward.localPort}/api/status`, async (response) => {
        const body = (await response.json()) as {
          status?: { overall?: { state?: string } };
          elasticsearchHosts?: string[];
          publicBaseUrl?: string;
        };

        expect(response.status).toBe(200);
        expect(body).toMatchObject({
          status: {
            overall: {
              state: 'green'
            }
          },
          elasticsearchHosts: ['http://elasticsearch:9200'],
          publicBaseUrl: 'http://kibana:5601'
        });
      }, 240_000);

      await waitForHttp(`http://127.0.0.1:${fluentBitForward.localPort}/api/v1/health`, async (response) => {
        expect(response.ok).toBe(true);
      }, 240_000);

      await waitForHttp(`http://127.0.0.1:${logstashForward.localPort}/_node/stats`, async (response) => {
        const text = await response.text();
        expect(response.ok).toBe(true);
        expect(text).toContain('pipelines');
        expect(text).toContain('logstash');
      }, 240_000);

      const topicList = kubectlExec(namespace, 'kafka-0', ['bash', '-ec', '/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:29092 --list']);
      expect(topicList).toContain('weather-sim.logs');
    } finally {
      await elasticsearchForward.stop();
      await kibanaForward.stop();
      await fluentBitForward.stop();
      await logstashForward.stop();
    }
  }, 300_000);

  it('upgrades the release to the second image set and keeps the stack healthy', () => {
    helmUpgradeInstall({
      releaseName,
      namespace,
      chartPath,
      valuesFile: valuesV2Path
    });

    kubectlWaitForWorkload(namespace, 'statefulset', 'elasticsearch');
    kubectlWaitForWorkload(namespace, 'deployment', 'kibana');
    kubectlWaitForWorkload(namespace, 'statefulset', 'kafka');
    kubectlWaitForWorkload(namespace, 'deployment', 'kafka-ui');
    kubectlWaitForWorkload(namespace, 'daemonset', 'fluent-bit');
    kubectlWaitForWorkload(namespace, 'statefulset', 'logstash');

    const elasticsearch = kubectlGetJson<WorkloadManifest>(namespace, 'statefulset', 'elasticsearch');
    const kibana = kubectlGetJson<WorkloadManifest>(namespace, 'deployment', 'kibana');
    const kafka = kubectlGetJson<WorkloadManifest>(namespace, 'statefulset', 'kafka');
    const kafkaUi = kubectlGetJson<WorkloadManifest>(namespace, 'deployment', 'kafka-ui');
    const fluentBit = kubectlGetJson<WorkloadManifest>(namespace, 'daemonset', 'fluent-bit');
    const logstash = kubectlGetJson<WorkloadManifest>(namespace, 'statefulset', 'logstash');

    expect(elasticsearch.spec.template?.spec?.containers?.[0].image).toContain(appVersionV2);
    expect(kibana.spec.template?.spec?.containers?.[0].image).toContain(appVersionV2);
    expect(kafka.spec.template?.spec?.containers?.[0].image).toContain(appVersionV2);
    expect(kafkaUi.spec.template?.spec?.containers?.[0].image).toContain(appVersionV2);
    expect(fluentBit.spec.template?.spec?.containers?.[0].image).toContain(appVersionV2);
    expect(logstash.spec.template?.spec?.containers?.[0].image).toContain(appVersionV2);
  }, 180_000);
});

function buildObservabilityImageTag(registryHost: string, role: (typeof componentRoles)[number], version: string): string {
  return `${registryHost}/observability-fixtures/${role}:${version}`;
}
