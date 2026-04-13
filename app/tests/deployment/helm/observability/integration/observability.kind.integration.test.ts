import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  applyManifest,
  buildTestValues,
  checkPrerequisites,
  createKindCluster,
  createNamespace,
  deleteKindCluster,
  helmUpgradeInstall,
  kubectlExec,
  kubectlGetJson,
  kubectlRolloutStatus,
  kubectlWait,
  registryEndpoint,
  startPortForward,
  startRegistryContainer,
  waitForHttp,
  type K8sResourceKind
} from './harness';
import type { StartedTestContainer } from 'testcontainers';

type StatefulSetManifest = {
  spec?: {
    replicas?: number;
  };
  status?: {
    readyReplicas?: number;
  };
};

type DeploymentManifest = {
  spec?: {
    replicas?: number;
  };
  status?: {
    availableReplicas?: number;
  };
};

type DaemonSetManifest = {
  status?: {
    desiredNumberScheduled?: number;
    numberReady?: number;
  };
};

type ServiceManifest = {
  spec?: {
    type?: string;
  };
};

type ConfigMapManifest = {
  data?: Record<string, string>;
};

type SearchResponse = {
  hits?: {
    total?: {
      value?: number;
    };
    hits?: Array<{
      _source?: Record<string, unknown>;
    }>;
  };
};

const missingPrerequisites = checkPrerequisites();
const suite = missingPrerequisites.length > 0 ? describe.skip : describe.sequential;

if (missingPrerequisites.length > 0) {
  console.warn(
    `Skipping observability Helm integration tests because the following prerequisites are missing: ${missingPrerequisites.join(', ')}`
  );
}

const runId = randomUUID().slice(0, 8);
const clusterName = `observability-${runId}`;
const namespace = 'observability';
const releaseKafka = 'kafka';
const releaseFluentBit = 'fluent-bit';
const releaseLogstash = 'logstash';

suite('observability Helm stack in KinD', () => {
  let registryContainer: StartedTestContainer | undefined;
  let values: ReturnType<typeof buildTestValues> | undefined;
  let esForward: { localPort: number; stop: () => void } | undefined;

  beforeAll(async () => {
    registryContainer = await startRegistryContainer();
    const registryHost = registryEndpoint(registryContainer);
    values = buildTestValues({ registryHost, namespace, usePublicImages: true });

    createKindCluster(clusterName);

    createNamespace(namespace);

    applyManifest(
      namespace,
      `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: elasticsearch
  labels:
    app.kubernetes.io/name: elasticsearch
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: elasticsearch
  template:
    metadata:
      labels:
        app.kubernetes.io/name: elasticsearch
    spec:
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
        - key: node-role.kubernetes.io/master
          operator: Exists
          effect: NoSchedule
      containers:
        - name: elasticsearch
          image: ${values.elasticsearch.image.repository}:${values.elasticsearch.image.tag}
          imagePullPolicy: IfNotPresent
          env:
            - name: discovery.type
              value: single-node
            - name: cluster.name
              value: observability-local
            - name: node.name
              value: observability-local-1
            - name: xpack.security.enabled
              value: "false"
            - name: xpack.security.enrollment.enabled
              value: "false"
            - name: ES_JAVA_OPTS
              value: -Xms256m -Xmx256m
          ports:
            - containerPort: 9200
              name: http
          readinessProbe:
            httpGet:
              path: /_cluster/health
              port: http
            initialDelaySeconds: 20
            periodSeconds: 10
          resources:
            requests:
              cpu: 100m
              memory: 512Mi
            limits:
              cpu: 500m
              memory: 1Gi
---
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch
spec:
  selector:
    app.kubernetes.io/name: elasticsearch
  ports:
    - name: http
      port: 9200
      targetPort: http
`
    );

    kubectlWait('deployment', namespace, 'elasticsearch');

    helmUpgradeInstall({
      releaseName: releaseKafka,
      namespace,
      chart: 'kafka',
      values: values.kafka
    });

    helmUpgradeInstall({
      releaseName: releaseFluentBit,
      namespace,
      chart: 'fluent-bit',
      values: values.fluentBit
    });

    helmUpgradeInstall({
      releaseName: releaseLogstash,
      namespace,
      chart: 'logstash',
      values: values.logstash
    });

    kubectlRolloutStatus('statefulset', namespace, releaseKafka);
    kubectlRolloutStatus('daemonset', namespace, releaseFluentBit);
    kubectlRolloutStatus('statefulset', namespace, releaseLogstash);
    kubectlWait('job', namespace, 'kafka-topic-init', 'complete');
    kubectlWait('deployment', namespace, 'elasticsearch');

    esForward = await startPortForward({
      namespace,
      resource: 'svc/elasticsearch',
      remotePort: 9200
    });
  }, 900000);

  afterAll(async () => {
    esForward?.stop();
    deleteKindCluster(clusterName);

    if (registryContainer) {
      await registryContainer.stop();
    }
  }, 120000);

  it('installs the stack and bootstraps the Kafka topic', () => {
    const kafkaStatefulSet = kubectlGetJson<StatefulSetManifest>(namespace, 'statefulset', releaseKafka);
    const fluentBitDaemonSet = kubectlGetJson<DaemonSetManifest>(namespace, 'daemonset', releaseFluentBit);
    const logstashStatefulSet = kubectlGetJson<StatefulSetManifest>(namespace, 'statefulset', releaseLogstash);
    const elasticsearchDeployment = kubectlGetJson<DeploymentManifest>(namespace, 'deployment', 'elasticsearch');
    const kafkaService = kubectlGetJson<ServiceManifest>(namespace, 'service', releaseKafka);
    const logstashService = kubectlGetJson<ServiceManifest>(namespace, 'service', releaseLogstash);
    const fluentBitConfig = kubectlGetJson<ConfigMapManifest>(namespace, 'configmap', releaseFluentBit);
    const logstashConfig = kubectlGetJson<ConfigMapManifest>(namespace, 'configmap', `${releaseLogstash}-config`);

    expect(kafkaStatefulSet.spec?.replicas).toBe(1);
    expect(kafkaStatefulSet.status?.readyReplicas).toBe(1);
    expect(fluentBitDaemonSet.status?.desiredNumberScheduled).toBe(1);
    expect(fluentBitDaemonSet.status?.numberReady).toBe(1);
    expect(logstashStatefulSet.spec?.replicas).toBe(1);
    expect(logstashStatefulSet.status?.readyReplicas).toBe(1);
    expect(elasticsearchDeployment.status?.availableReplicas).toBe(1);
    expect(kafkaService.spec?.type).toBe('ClusterIP');
    expect(logstashService.spec?.type).toBe('ClusterIP');
    expect(fluentBitConfig.data?.['fluent-bit.conf']).toContain('Name tail');
    expect(fluentBitConfig.data?.['fluent-bit.conf']).toContain("Regex $kubernetes['namespace_name'] ^(observability)$");
    expect(logstashConfig.data?.['logstash.yml']).toContain('queue.type: persisted');
    expect(logstashConfig.data?.['weather-sim.conf']).toContain('observability_namespace');
    expect(logstashConfig.data?.['weather-sim.conf']).toContain('bootstrap_servers => "kafka:29092"');

    const topicList = kubectlExec(namespace, `${releaseKafka}-0`, ['bash', '-ec', '/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:29092 --list']);
    expect(topicList).toContain('weather-sim.logs');
  });

  it('captures a pod log in Kafka and indexes it into Elasticsearch', async () => {
    const logProducer = `
apiVersion: batch/v1
kind: Job
metadata:
  name: observability-log-producer
spec:
  backoffLimit: 0
  template:
    metadata:
      labels:
        app.kubernetes.io/name: observability-log-producer
    spec:
      restartPolicy: Never
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
        - key: node-role.kubernetes.io/master
          operator: Exists
          effect: NoSchedule
      containers:
        - name: producer
          image: ${values?.busybox}
          command:
            - /bin/sh
            - -ec
            - |
              printf '%s\n' '{"message":"observability-e2e","service":"weather-sim-api","level":"info"}'
              sleep 5
`;

    applyManifest(namespace, logProducer);
    kubectlWait('job', namespace, 'observability-log-producer', 'complete');

    const esPort = esForward?.localPort;

    if (!esPort) {
      throw new Error('Elasticsearch port-forward did not start.');
    }

    await waitForHttp(`http://127.0.0.1:${esPort}/weather-sim-logs-*/_search`, async (response) => {
      expect(response.ok).toBe(true);
      const body = (await response.json()) as SearchResponse;
      const hits = body.hits?.hits ?? [];
      expect((body.hits?.total?.value ?? 0)).toBeGreaterThan(0);
      expect(hits.length).toBeGreaterThan(0);
      const source = hits[0]._source ?? {};
      expect(String(source.message)).toBe('observability-e2e');
      expect(String(source.observability_namespace)).toBe('observability');
    }, 240000);
  });
});
