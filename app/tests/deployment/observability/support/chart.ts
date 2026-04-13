import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(currentDir, '../../../../');
export const sourceChartDir = path.resolve(repoRoot, 'deployment/observability-stack');
const sourceDeploymentDir = path.resolve(repoRoot, 'deployment');
const componentCharts = ['elasticsearch', 'kibana', 'kafka', 'fluent-bit', 'logstash'] as const;

export function createTempWorkspace(prefix: string): { directory: string; cleanup: () => void } {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));

  return {
    directory,
    cleanup: () => fs.rmSync(directory, { recursive: true, force: true })
  };
}

export function writeJsonFile(directory: string, fileName: string, value: unknown): string {
  const filePath = path.join(directory, fileName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return filePath;
}

export function runCommand(
  command: string,
  args: string[],
  options: Parameters<typeof spawnSync>[2] = {}
): { stdout: string; stderr: string } {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  });

  if (result.error) {
    throw new Error(`Failed to run ${command}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed: ${command} ${args.join(' ')}`,
        result.stdout ? `stdout:\n${result.stdout}` : '',
        result.stderr ? `stderr:\n${result.stderr}` : ''
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  return {
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? '')
  };
}

export function runCommandAllowFailure(
  command: string,
  args: string[],
  options: Parameters<typeof spawnSync>[2] = {}
): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  });

  return {
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? ''),
    status: result.status
  };
}

export function checkPrerequisites(): string[] {
  const checks: Array<[string, string[]]> = [
    ['docker', ['info']],
    ['kind', ['version']],
    ['kubectl', ['version', '--client']],
    ['helm', ['version', '--short']]
  ];

  const missing: string[] = [];

  for (const [command, args] of checks) {
    try {
      runCommand(command, args);
    } catch {
      missing.push(command);
    }
  }

  return missing;
}

function copyDirectory(source: string, target: string): void {
  fs.cpSync(source, target, { recursive: true });
}

function copyObservabilityWorkspace(workspaceRoot: string): string {
  const deploymentTargetDir = path.join(workspaceRoot, 'deployment');
  const chartTargetDir = path.join(deploymentTargetDir, 'observability-stack');

  fs.rmSync(deploymentTargetDir, { recursive: true, force: true });
  fs.mkdirSync(deploymentTargetDir, { recursive: true });
  copyDirectory(sourceChartDir, chartTargetDir);

  for (const chartName of componentCharts) {
    copyDirectory(path.join(sourceDeploymentDir, chartName), path.join(deploymentTargetDir, chartName));
  }

  return chartTargetDir;
}

export function materializeObservabilityWorkspace(workspaceRoot: string): string {
  return copyObservabilityWorkspace(workspaceRoot);
}

export function prepareObservabilityWorkspace(options: {
  workspace: string;
  registryHost: string;
  version: string;
  persistenceEnabled?: boolean;
  appNamespace?: string;
  clusterName?: string;
  kafkaUiEnabled?: boolean;
}): string {
  const chartPath = copyObservabilityWorkspace(options.workspace);
  dependencyBuildChart(chartPath);
  return chartPath;
}

export function buildObservabilityValues(input: {
  registryHost: string;
  version: string;
  persistenceEnabled?: boolean;
  appNamespace?: string;
  clusterName?: string;
  kafkaUiEnabled?: boolean;
}): Record<string, unknown> {
  const persistenceEnabled = input.persistenceEnabled ?? true;
  const appNamespace = input.appNamespace ?? 'weather-sim';
  const clusterName = input.clusterName ?? 'weather-sim-observability';
  const imagePrefix = `${input.registryHost}/observability-fixtures`;
  const kafkaUiEnabled = input.kafkaUiEnabled ?? true;

  return {
    global: {
      namespace: 'observability',
      clusterName,
      appNamespace,
      kafkaTopic: 'weather-sim.logs',
      kafkaBootstrapServers: 'kafka:29092',
      elasticsearchHost: 'http://elasticsearch:9200'
    },
    elasticsearch: {
      enabled: true,
      fullnameOverride: 'elasticsearch',
      image: {
        repository: `${imagePrefix}/elasticsearch`,
        tag: input.version,
        pullPolicy: 'IfNotPresent'
      },
      extraEnv: [
        {
          name: 'PORT',
          value: '9200'
        },
        {
          name: 'CLUSTER_NAME',
          value: clusterName
        }
      ],
      service: {
        type: 'ClusterIP',
        httpPort: 9200,
        transportPort: 9300
      },
      elasticsearch: {
        clusterName,
        networkHost: '0.0.0.0',
        discoveryType: 'single-node',
        httpPort: 9200,
        security: {
          enabled: false,
          enrollmentEnabled: false
        },
        javaOpts: '-Xms256m -Xmx256m'
      },
      persistence: {
        enabled: persistenceEnabled,
        storageClass: '',
        size: '8Gi'
      },
      podSecurityContext: {
        fsGroup: 1000,
        fsGroupChangePolicy: 'OnRootMismatch'
      },
      containerSecurityContext: {
        allowPrivilegeEscalation: false,
        capabilities: {
          drop: ['ALL']
        },
        runAsNonRoot: true,
        runAsUser: 1000,
        runAsGroup: 0
      },
      resources: {
        requests: {
          cpu: '250m',
          memory: '1Gi'
        },
        limits: {
          cpu: '1',
          memory: '2Gi'
        }
      }
    },
    kibana: {
      enabled: true,
      fullnameOverride: 'kibana',
      image: {
        repository: `${imagePrefix}/kibana`,
        tag: input.version,
        pullPolicy: 'IfNotPresent'
      },
      extraEnv: [
        {
          name: 'PORT',
          value: '5601'
        },
        {
          name: 'PUBLIC_BASE_URL',
          value: 'http://kibana:5601'
        },
        {
          name: 'ELASTICSEARCH_HOSTS',
          value: 'http://elasticsearch:9200'
        }
      ],
      service: {
        type: 'ClusterIP',
        port: 5601
      },
      kibana: {
        serverHost: '0.0.0.0',
        publicBaseUrl: 'http://kibana:5601',
        telemetryEnabled: false
      },
      elasticsearch: {
        hosts: ['http://elasticsearch:9200']
      },
      podSecurityContext: {
        fsGroup: 1000,
        fsGroupChangePolicy: 'OnRootMismatch'
      },
      containerSecurityContext: {
        allowPrivilegeEscalation: false,
        capabilities: {
          drop: ['ALL']
        },
        runAsNonRoot: true,
        runAsUser: 1000,
        runAsGroup: 1000,
        readOnlyRootFilesystem: true
      },
      resources: {
        requests: {
          cpu: '100m',
          memory: '256Mi'
        },
        limits: {
          cpu: '500m',
          memory: '768Mi'
        }
      }
    },
    kafka: {
      enabled: true,
      fullnameOverride: 'kafka',
      image: {
        repository: `${imagePrefix}/kafka`,
        tag: input.version,
        pullPolicy: 'IfNotPresent'
      },
      service: {
        type: 'ClusterIP',
        port: 29092,
        controllerPort: 9093
      },
      storage: {
        size: '10Gi',
        accessModes: ['ReadWriteOnce'],
        storageClassName: ''
      },
      kraft: {
        clusterId: 'MkU3OEVBNTcwNTJENDM2Qk',
        nodeId: 1,
        processRoles: 'broker,controller',
        controllerListenerNames: 'CONTROLLER',
        interBrokerListenerName: 'PLAINTEXT',
        listenerSecurityProtocolMap: 'CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT',
        listeners: {
          broker: 'PLAINTEXT://:29092',
          controller: 'CONTROLLER://:9093'
        },
        advertisedListeners: {
          broker: 'PLAINTEXT://kafka:29092'
        },
        logDirs: '/var/lib/kafka/data',
        autoCreateTopicsEnable: 'false',
        numPartitions: '3',
        defaultReplicationFactor: '1',
        offsetsTopicReplicationFactor: '1',
        transactionStateLogReplicationFactor: '1',
        transactionStateLogMinIsr: '1',
        minInSyncReplicas: '1',
        groupInitialRebalanceDelayMs: '0',
        logRetentionHours: '72',
        logSegmentBytes: '1073741824',
        heapOpts: '-Xms512m -Xmx512m'
      },
      topicInit: {
        enabled: true,
        image: {
          repository: `${imagePrefix}/kafka`,
          tag: input.version,
          pullPolicy: 'IfNotPresent'
        },
        topics: [
          {
            name: 'weather-sim.logs',
            partitions: 3,
            replicationFactor: 1,
            config: {
              'retention.ms': '259200000',
              'segment.bytes': '1073741824'
            }
          }
        ]
      },
      ui: {
        enabled: kafkaUiEnabled,
        image: {
          repository: `${imagePrefix}/kafka-ui`,
          tag: input.version,
          pullPolicy: 'IfNotPresent'
        },
        service: {
          type: 'ClusterIP',
          port: 8080
        },
        clusterName,
        bootstrapServers: 'kafka:29092',
        tolerations: [
          {
            key: 'node-role.kubernetes.io/control-plane',
            operator: 'Exists',
            effect: 'NoSchedule'
          },
          {
            key: 'node-role.kubernetes.io/master',
            operator: 'Exists',
            effect: 'NoSchedule'
          }
        ],
        resources: {
          requests: {
            cpu: '50m',
            memory: '128Mi'
          },
          limits: {
            cpu: '250m',
            memory: '256Mi'
          }
        }
      },
      podSecurityContext: {
        fsGroup: 1000,
        seccompProfile: {
          type: 'RuntimeDefault'
        }
      },
      containerSecurityContext: {
        allowPrivilegeEscalation: false,
        capabilities: {
          drop: ['ALL']
        }
      },
      resources: {
        requests: {
          cpu: '250m',
          memory: '512Mi'
        },
        limits: {
          cpu: '1',
          memory: '1Gi'
        }
      },
      tolerations: [
        {
          key: 'node-role.kubernetes.io/control-plane',
          operator: 'Exists',
          effect: 'NoSchedule'
        },
        {
          key: 'node-role.kubernetes.io/master',
          operator: 'Exists',
          effect: 'NoSchedule'
        }
      ]
    },
    fluentBit: {
      enabled: true,
      fullnameOverride: 'fluent-bit',
      image: {
        repository: `${imagePrefix}/fluent-bit`,
        tag: input.version,
        pullPolicy: 'IfNotPresent'
      },
      command: ['node', '/app/server.mjs'],
      config: {
        profile: 'kubernetes',
        clusterName,
        namespaceFilter: {
          enabled: true,
          namespaces: ['observability']
        },
        forward: {
          tag: 'weather-sim.*',
          listen: '0.0.0.0',
          port: 24224
        }
      },
      kafka: {
        brokers: 'kafka:29092',
        topic: 'weather-sim.logs',
        format: 'json',
        requiredAcks: '1'
      },
      serviceAccount: {
        create: true,
        name: '',
        automountToken: true
      },
      rbac: {
        create: true
      },
      service: {
        enabled: true,
        type: 'ClusterIP',
        ports: {
          metrics: 2020,
          forward: 24224
        }
      },
      extraEnv: [
        {
          name: 'PORT',
          value: '2020'
        },
        {
          name: 'APP_NAMESPACE',
          value: 'observability'
        },
        {
          name: 'CLUSTER_NAME',
          value: clusterName
        },
        {
          name: 'KAFKA_TOPIC',
          value: 'weather-sim.logs'
        },
        {
          name: 'KAFKA_BOOTSTRAP_SERVERS',
          value: 'kafka:29092'
        }
      ],
      podSecurityContext: {
        seccompProfile: {
          type: 'RuntimeDefault'
        }
      },
      containerSecurityContext: {
        allowPrivilegeEscalation: false,
        capabilities: {
          drop: ['ALL']
        }
      },
      resources: {
        requests: {
          cpu: '100m',
          memory: '128Mi'
        },
        limits: {
          cpu: '250m',
          memory: '256Mi'
        }
      },
      hostPaths: {
        containers: '/var/log/containers',
        pods: '/var/log/pods',
        dockerContainers: '/var/lib/docker/containers'
      },
      tolerations: [
        {
          key: 'node-role.kubernetes.io/control-plane',
          operator: 'Exists',
          effect: 'NoSchedule'
        },
        {
          key: 'node-role.kubernetes.io/master',
          operator: 'Exists',
          effect: 'NoSchedule'
        }
      ]
    },
    logstash: {
      enabled: true,
      fullnameOverride: 'logstash',
      image: {
        repository: `${imagePrefix}/logstash`,
        tag: input.version,
        pullPolicy: 'IfNotPresent'
      },
      command: ['node', '/app/server.mjs'],
      extraEnv: [
        {
          name: 'PORT',
          value: '9600'
        },
        {
          name: 'KAFKA_TOPIC',
          value: 'weather-sim.logs'
        },
        {
          name: 'KAFKA_BOOTSTRAP_SERVERS',
          value: 'kafka:29092'
        },
        {
          name: 'ELASTICSEARCH_HOSTS',
          value: 'http://elasticsearch:9200'
        }
      ],
      replicaCount: 1,
      logstash: {
        javaOpts: '-Xms256m -Xmx256m',
        ecsCompatibility: 'disabled',
        httpHost: '0.0.0.0',
        queue: {
          type: 'persisted',
          maxBytes: '1gb'
        },
        path: {
          data: '/usr/share/logstash/data',
          queue: '/usr/share/logstash/data/queue'
        }
      },
      kafka: {
        bootstrapServers: 'kafka:29092',
        topics: ['weather-sim.logs'],
        groupId: 'weather-sim-logstash',
        codec: 'json',
        autoOffsetReset: 'earliest'
      },
      elasticsearch: {
        hosts: ['http://elasticsearch:9200'],
        index: 'weather-sim-logs-%{+YYYY.MM.dd}'
      },
      observabilityNamespace: 'observability',
      service: {
        type: 'ClusterIP',
        port: 9600
      },
      serviceAccount: {
        create: false
      },
      persistence: {
        enabled: persistenceEnabled,
        size: '10Gi',
        accessModes: ['ReadWriteOnce'],
        storageClassName: ''
      },
      podSecurityContext: {
        fsGroup: 1000,
        seccompProfile: {
          type: 'RuntimeDefault'
        }
      },
      containerSecurityContext: {
        allowPrivilegeEscalation: false,
        capabilities: {
          drop: ['ALL']
        }
      },
      resources: {
        requests: {
          cpu: '250m',
          memory: '512Mi'
        },
        limits: {
          cpu: '1',
          memory: '1Gi'
        }
      },
      tolerations: [
        {
          key: 'node-role.kubernetes.io/control-plane',
          operator: 'Exists',
          effect: 'NoSchedule'
        },
        {
          key: 'node-role.kubernetes.io/master',
          operator: 'Exists',
          effect: 'NoSchedule'
        }
      ]
    }
  };
}

export function dependencyBuildChart(chartPath: string): void {
  runCommand('helm', ['dependency', 'build', chartPath]);
}

export function renderChart(options: {
  chartPath?: string;
  valuesFiles?: string[];
  set?: string[];
  releaseName?: string;
  namespace?: string;
} = {}): string {
  const chartPath = options.chartPath ?? sourceChartDir;
  dependencyBuildChart(chartPath);

  const args = ['template', options.releaseName ?? 'observability-stack', chartPath];

  for (const valuesFile of options.valuesFiles ?? []) {
    args.push('-f', path.resolve(valuesFile));
  }

  for (const setValue of options.set ?? []) {
    args.push('--set', setValue);
  }

  if (options.namespace) {
    args.push('--namespace', options.namespace);
  }

  return normalize(runCommand('helm', args).stdout);
}

export function lintChart(options: {
  chartPath?: string;
  valuesFiles?: string[];
  set?: string[];
  namespace?: string;
} = {}): void {
  const chartPath = options.chartPath ?? sourceChartDir;
  dependencyBuildChart(chartPath);

  const args = ['lint', chartPath];

  for (const valuesFile of options.valuesFiles ?? []) {
    args.push('-f', path.resolve(valuesFile));
  }

  for (const setValue of options.set ?? []) {
    args.push('--set', setValue);
  }

  if (options.namespace) {
    args.push('--namespace', options.namespace);
  }

  runCommand('helm', args);
}

export function splitManifests(rendered: string): string[] {
  return normalize(rendered)
    .split(/^---\s*$/m)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

export function findManifest(rendered: string, kind: string, name: string): string {
  const manifest = splitManifests(rendered).find((chunk) => {
    const kindPattern = new RegExp(`^kind:\\s*${kind}\\s*$`, 'm');
    const namePattern = new RegExp(`^\\s*name:\\s*${name}\\s*$`, 'm');
    return kindPattern.test(chunk) && namePattern.test(chunk);
  });

  if (!manifest) {
    throw new Error(`Could not find ${kind}/${name} in rendered manifests.`);
  }

  return manifest;
}

export function countOccurrences(rendered: string, needle: RegExp): number {
  const matches = normalize(rendered).match(needle);
  return matches?.length ?? 0;
}

function normalize(output: string): string {
  return output.replace(/\r\n/g, '\n');
}
