import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { buildFluentBitValues, buildImageRef, buildKafkaValues, buildLogstashValues, buildRegistryImage } from '../support/values';

export type K8sResourceKind = 'deployment' | 'statefulset' | 'daemonset' | 'service' | 'configmap' | 'job';

function runCommand(command: string, args: string[], options?: { input?: string }): string {
  return execFileSync(command, args, {
    encoding: 'utf8',
    input: options?.input,
    maxBuffer: 20 * 1024 * 1024
  });
}

export function checkPrerequisites(): string[] {
  const required = ['docker', 'kind', 'kubectl', 'helm'];
  const missing: string[] = [];

  for (const command of required) {
    try {
      runCommand('where.exe', [command]);
    } catch {
      missing.push(command);
    }
  }

  return missing;
}

export function createTempWorkspace(prefix: string): { directory: string; cleanup: () => void } {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return {
    directory,
    cleanup: () => fs.rmSync(directory, { recursive: true, force: true })
  };
}

export function writeJsonFile(directory: string, fileName: string, value: unknown): string {
  const filePath = path.join(directory, fileName);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return filePath;
}

export function chartPath(chart: 'kafka' | 'fluent-bit' | 'logstash'): string {
  return path.resolve(__dirname, '../../../../../deployment', chart);
}

export function startRegistryContainer(): Promise<StartedTestContainer> {
  return new GenericContainer('registry:2').withExposedPorts(5000).start();
}

export function registryEndpoint(container: StartedTestContainer): string {
  return `${container.getHost()}:${container.getMappedPort(5000)}`;
}

export function mirrorImage(sourceImage: string, registryHost: string, imageName: string, tag: string): string {
  const targetImage = buildImageRef(`${registryHost}/${imageName}`, tag);
  runCommand('docker', ['pull', sourceImage]);
  runCommand('docker', ['tag', sourceImage, targetImage]);
  runCommand('docker', ['push', targetImage]);
  return targetImage;
}

export function createKindCluster(clusterName: string): void {
  runCommand('kind', ['create', 'cluster', '--name', clusterName, '--wait', '300s']);
}

export function deleteKindCluster(clusterName: string): void {
  runCommand('kind', ['delete', 'cluster', '--name', clusterName]);
}

export function loadImageIntoKind(clusterName: string, image: string): void {
  const archiveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'observability-image-'));
  const archivePath = path.join(archiveDir, `${image.replace(/[^a-zA-Z0-9._-]+/g, '_')}.tar`);

  try {
    runCommand('docker', ['save', '-o', archivePath, image]);
    runCommand('kind', ['load', 'image-archive', archivePath, '--name', clusterName]);
  } finally {
    fs.rmSync(archiveDir, { recursive: true, force: true });
  }
}

export function createNamespace(namespace: string): void {
  runCommand('kubectl', ['apply', '-f', '-'], {
    input: `apiVersion: v1
kind: Namespace
metadata:
  name: ${namespace}
`
  });
}

export function helmUpgradeInstall(options: {
  releaseName: string;
  namespace: string;
  chart: 'kafka' | 'fluent-bit' | 'logstash';
  values: Record<string, unknown>;
}): void {
  const workspace = createTempWorkspace(`${options.releaseName}-values-`);
  const valuesFile = writeJsonFile(workspace.directory, 'values.json', options.values);

  try {
      runCommand('helm', [
      'upgrade',
      '--install',
      options.releaseName,
      chartPath(options.chart),
      '--namespace',
      options.namespace,
      '--create-namespace',
      '--timeout',
      '20m',
      '-f',
      valuesFile
    ]);
  } finally {
    workspace.cleanup();
  }
}

export function kubectlWait(kind: K8sResourceKind, namespace: string, name: string, condition = 'available'): void {
  runCommand('kubectl', ['-n', namespace, 'wait', `--for=condition=${condition}`, `${kind}/${name}`, '--timeout=300s']);
}

export function kubectlRolloutStatus(kind: Exclude<K8sResourceKind, 'configmap' | 'job' | 'service'>, namespace: string, name: string): void {
  runCommand('kubectl', ['-n', namespace, 'rollout', 'status', `${kind}/${name}`, '--timeout=300s']);
}

export function kubectlGetJson<T>(namespace: string, kind: K8sResourceKind, name: string): T {
  const output = runCommand('kubectl', ['-n', namespace, 'get', kind, name, '-o', 'json']);
  return JSON.parse(output) as T;
}

export function kubectlExec(namespace: string, podName: string, args: string[]): string {
  return runCommand('kubectl', ['-n', namespace, 'exec', podName, '--', ...args]);
}

export function applyManifest(namespace: string, manifest: string): void {
  runCommand('kubectl', ['-n', namespace, 'apply', '-f', '-'], { input: manifest });
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (typeof address === 'object' && address && 'port' in address) {
        const { port } = address;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error('Could not allocate a free port.')));
      }
    });
  });
}

export async function startPortForward(options: {
  namespace: string;
  resource: string;
  remotePort: number;
}): Promise<{ localPort: number; stop: () => void }> {
  const localPort = await findFreePort();
  const child = spawn('kubectl', ['-n', options.namespace, 'port-forward', options.resource, `${localPort}:${options.remotePort}`], {
    stdio: 'ignore',
    windowsHide: true
  });

  return {
    localPort,
    stop: () => {
      if (!child.killed) {
        child.kill();
      }
    }
  };
}

export async function waitForHttp(
  url: string,
  assertion: (response: Response) => void | Promise<void>,
  timeoutMs = 120000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      await assertion(response);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Timed out waiting for ${url}`);
}

export function buildTestValues(options: {
  registryHost: string;
  namespace: string;
  usePublicImages?: boolean;
}): {
  kafka: Record<string, unknown>;
  fluentBit: Record<string, unknown>;
  logstash: Record<string, unknown>;
  elasticsearch: Record<string, unknown>;
  busybox: string;
} {
  if (options.usePublicImages) {
    return {
      kafka: {
        image: {
          repository: 'apache/kafka',
          tag: '4.0.2'
        },
        topicInit: {
          enabled: true,
          image: {
            repository: 'apache/kafka',
            tag: '4.0.2'
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
          enabled: false,
          image: {
            repository: 'ghcr.io/kafbat/kafka-ui',
            tag: 'v1.4.2'
          },
          bootstrapServers: 'kafka:29092',
          clusterName: `${options.namespace}-local`
        }
      },
      fluentBit: {
        image: {
          repository: 'cr.fluentbit.io/fluent/fluent-bit',
          tag: '5.0.0'
        },
        config: {
          profile: 'kubernetes',
          clusterName: `${options.namespace}-local`,
          namespaceFilter: {
            enabled: true,
            namespaces: [options.namespace]
          }
        },
        kafka: {
          brokers: 'kafka:29092',
          topic: 'weather-sim.logs',
          format: 'json',
          requiredAcks: '1'
        }
      },
      logstash: {
        image: {
          repository: 'docker.elastic.co/logstash/logstash',
          tag: '9.3.2'
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
        observabilityNamespace: options.namespace,
        persistence: {
          enabled: true,
          size: '5Gi'
        }
      },
      elasticsearch: {
        image: {
          repository: 'docker.elastic.co/elasticsearch/elasticsearch',
          tag: '9.3.2'
        }
      },
      busybox: 'busybox:1.36'
    };
  }

  return {
    kafka: buildKafkaValues({ registryHost: options.registryHost, namespace: options.namespace, uiEnabled: false }),
    fluentBit: buildFluentBitValues({ registryHost: options.registryHost, namespace: options.namespace }),
    logstash: buildLogstashValues({ registryHost: options.registryHost, namespace: options.namespace }),
    elasticsearch: {
      image: buildRegistryImage(options.registryHost, 'elasticsearch', '9.3.2')
    },
    busybox: buildImageRef(`${options.registryHost}/busybox`, '1.36')
  };
}
