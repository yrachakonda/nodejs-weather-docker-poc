import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import {
  buildObservabilityValues,
  checkPrerequisites,
  createTempWorkspace,
  dependencyBuildChart,
  materializeObservabilityWorkspace,
  runCommand,
  runCommandAllowFailure,
  writeJsonFile
} from '../support/chart';

export type ObservabilityRole = 'elasticsearch' | 'kibana' | 'kafka' | 'fluent-bit' | 'logstash' | 'kafka-ui';
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const fixtureDockerfilePath = path.join(currentDir, 'Dockerfile');
const fixtureWorkspacePath = currentDir;
const kafkaSourceImage = 'apache/kafka:4.0.2';

export {
  buildObservabilityValues,
  checkPrerequisites,
  createTempWorkspace,
  dependencyBuildChart,
  materializeObservabilityWorkspace,
  runCommand,
  runCommandAllowFailure,
  writeJsonFile
} from '../support/chart';

export interface ObservabilityPortForwardHandle {
  localPort: number;
  stop: () => Promise<void>;
}

export function buildImageTag(registryHost: string, component: ObservabilityRole, version: string): string {
  return `${registryHost}/observability-fixtures/${component}:${version}`;
}

export function buildAndPushFixtureImage(options: {
  registryHost: string;
  role: ObservabilityRole;
  version: string;
  port: number;
}): string {
  const imageTag = buildImageTag(options.registryHost, options.role, options.version);

  if (options.role === 'kafka') {
    runCommand('docker', ['pull', kafkaSourceImage]);
    runCommand('docker', ['tag', kafkaSourceImage, imageTag]);
    runCommand('docker', ['push', imageTag]);
    return imageTag;
  }

  runCommand('docker', [
    'build',
    '-f',
    fixtureDockerfilePath,
    '--build-arg',
    `APP_ROLE=${options.role}`,
    '--build-arg',
    `APP_VERSION=${options.version}`,
    '--build-arg',
    `PORT=${options.port}`,
    '-t',
    imageTag,
    fixtureWorkspacePath
  ]);

  runCommand('docker', ['push', imageTag]);

  return imageTag;
}

export function repullImage(imageTag: string): void {
  runCommandAllowFailure('docker', ['image', 'rm', '--force', imageTag]);
  runCommand('docker', ['pull', imageTag]);
}

export async function startRegistryContainer(): Promise<StartedTestContainer> {
  return await new GenericContainer('registry:2')
    .withExposedPorts(5000)
    .withEnvironment({
      REGISTRY_STORAGE_DELETE_ENABLED: 'true'
    })
    .start();
}

export function registryEndpoint(registry: StartedTestContainer): string {
  return `${registry.getHost()}:${registry.getMappedPort(5000)}`;
}

export function createKindCluster(clusterName: string): void {
  runCommand('kind', ['create', 'cluster', '--name', clusterName, '--wait', '5m']);
  const kubeconfigPath = path.join(os.tmpdir(), `kind-${clusterName}.kubeconfig`);
  runCommand('kind', ['export', 'kubeconfig', '--name', clusterName, '--kubeconfig', kubeconfigPath]);
  process.env.KUBECONFIG = kubeconfigPath;
}

export function deleteKindCluster(clusterName: string): void {
  runCommandAllowFailure('kind', ['delete', 'cluster', '--name', clusterName]);
}

export function loadImageIntoKind(clusterName: string, imageTag: string): void {
  runCommand('kind', ['load', 'docker-image', '--name', clusterName, imageTag]);
}

export function helmUpgradeInstall(options: {
  releaseName: string;
  namespace: string;
  chartPath: string;
  valuesFile: string;
}): void {
  dependencyBuildChart(options.chartPath);

  runCommand('helm', [
    'upgrade',
    '--install',
    options.releaseName,
    options.chartPath,
    '--namespace',
    options.namespace,
    '--create-namespace',
    '--values',
    options.valuesFile,
    '--wait',
    '--timeout',
    '15m'
  ]);
}

export function kubectlWaitForWorkload(namespace: string, kind: 'deployment' | 'statefulset' | 'daemonset', name: string): void {
  runCommand('kubectl', [
    '--namespace',
    namespace,
    'rollout',
    'status',
    `${kind}/${name}`,
    '--timeout=15m'
  ]);
}

export function kubectlWaitForJob(namespace: string, name: string): void {
  const jobLookup = runCommandAllowFailure('kubectl', ['--namespace', namespace, 'get', 'job', name]);

  if (jobLookup.status !== 0 && /notfound|not found/i.test(jobLookup.stderr)) {
    return;
  }

  if (jobLookup.status !== 0) {
    throw new Error(
      [`Command failed: kubectl --namespace ${namespace} get job ${name}`, jobLookup.stdout, jobLookup.stderr]
        .filter(Boolean)
        .join('\n')
    );
  }

  runCommand('kubectl', [
    '--namespace',
    namespace,
    'wait',
    '--for=condition=complete',
    `job/${name}`,
    '--timeout=15m'
  ]);
}

export function kubectlGetJson<T>(namespace: string, kind: string, name: string): T {
  const result = runCommand('kubectl', ['-n', namespace, 'get', kind, name, '-o', 'json']);
  return JSON.parse(result.stdout) as T;
}

export function kubectlGetJsonList<T>(namespace: string, args: string[]): T {
  const result = runCommand('kubectl', ['-n', namespace, ...args, '-o', 'json']);
  return JSON.parse(result.stdout) as T;
}

export function kubectlExec(namespace: string, podName: string, args: string[]): string {
  return runCommand('kubectl', ['-n', namespace, 'exec', podName, '--', ...args]).stdout;
}

export function createNamespace(namespace: string): void {
  runCommandAllowFailure('kubectl', ['delete', 'namespace', namespace, '--ignore-not-found=true']);
  runCommand('kubectl', ['create', 'namespace', namespace]);
}

export async function getFreePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = net.createServer();

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Failed to allocate a free port')));
        return;
      }

      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

export async function startPortForward(options: {
  namespace: string;
  resource: string;
  remotePort: number;
  localPort?: number;
}): Promise<ObservabilityPortForwardHandle> {
  const localPort = options.localPort ?? (await getFreePort());
  const child = spawn(
    'kubectl',
    [
      '--namespace',
      options.namespace,
      'port-forward',
      '--address',
      '127.0.0.1',
      options.resource,
      `${localPort}:${options.remotePort}`
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

  const ready = new Promise<void>((resolve, reject) => {
    const onOutput = (chunk: Buffer) => {
      const output = chunk.toString('utf8');

      if (output.includes('Forwarding from 127.0.0.1') || output.includes('Handling connection for')) {
        resolve();
      }

      if (/error|failed|unable/i.test(output)) {
        reject(new Error(output.trim()));
      }
    };

    child.stdout.on('data', onOutput);
    child.stderr.on('data', onOutput);
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`kubectl port-forward exited with code ${code ?? 'unknown'}`));
      }
    });
  });

  await ready;

  return {
    localPort,
    stop: async () => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }

      await new Promise<void>((resolve) => {
        if (child.exitCode !== null) {
          resolve();
          return;
        }

        child.once('exit', () => resolve());
        setTimeout(() => resolve(), 2000);
      });
    }
  };
}

export async function waitForHttp(
  url: string,
  validator: (response: Response) => Promise<void> | void,
  timeoutMs = 30_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      await validator(response);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(`Timed out waiting for ${url}: ${String(lastError)}`);
}
