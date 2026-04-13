import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const chartPath = path.resolve(currentDir, '../../../../../deployment/weather-sim/charts');
export const fixtureDockerfilePath = path.resolve(currentDir, 'Dockerfile');
export const fixtureWorkspacePath = currentDir;

export type WeatherSimRole = 'api' | 'web';

export interface WeatherSimValuesInput {
  registryHost: string;
  version: string;
  replicaCount: number;
  ingressHost: string;
}

export interface PortForwardHandle {
  localPort: number;
  stop: () => Promise<void>;
}

export function buildImageTag(registryHost: string, role: WeatherSimRole, version: string): string {
  return `${registryHost}/weather-sim-${role}:${version}`;
}

export function buildWeatherSimValues(input: WeatherSimValuesInput): Record<string, unknown> {
  return {
    replicaCount: input.replicaCount,
    image: {
      api: buildImageTag(input.registryHost, 'api', input.version),
      web: buildImageTag(input.registryHost, 'web', input.version)
    },
    service: {
      apiType: 'ClusterIP'
    },
    env: {
      APP_VERSION: input.version,
      CORS_ORIGIN: `http://${input.ingressHost}`
    },
    fluentBitSidecar: {
      enabled: false
    },
    ingress: {
      enabled: true,
      className: 'nginx',
      host: input.ingressHost
    }
  };
}

export function writeJsonFile(directory: string, fileName: string, value: unknown): string {
  const filePath = path.join(directory, fileName);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
  return filePath;
}

export function createTempWorkspace(prefix: string): { directory: string; cleanup: () => void } {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return {
    directory,
    cleanup: () => fs.rmSync(directory, { recursive: true, force: true })
  };
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
    } catch (error) {
      missing.push(command);
    }
  }

  return missing;
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

export function buildAndPushFixtureImage(options: {
  registryHost: string;
  role: WeatherSimRole;
  version: string;
  port: number;
}): string {
  const imageTag = buildImageTag(options.registryHost, options.role, options.version);

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

export function createKindCluster(clusterName: string): void {
  runCommand('kind', ['create', 'cluster', '--name', clusterName, '--wait', '5m']);
}

export function deleteKindCluster(clusterName: string): void {
  runCommandAllowFailure('kind', ['delete', 'cluster', '--name', clusterName]);
}

export function loadImageIntoKind(clusterName: string, imageTag: string): void {
  runCommand('kind', ['load', 'docker-image', '--name', clusterName, imageTag]);
}

export function createNamespace(namespace: string): void {
  runCommandAllowFailure('kubectl', ['delete', 'namespace', namespace, '--ignore-not-found=true']);
  runCommand('kubectl', ['create', 'namespace', namespace]);
}

export function createSessionSecret(namespace: string, secretName: string): void {
  runCommand('kubectl', [
    'create',
    'secret',
    'generic',
    secretName,
    '--namespace',
    namespace,
    '--from-literal=SESSION_SECRET=kind-integration-secret'
  ]);
}

export function helmUpgradeInstall(options: {
  releaseName: string;
  namespace: string;
  valuesFile: string;
}): void {
  runCommand('helm', [
    'upgrade',
    '--install',
    options.releaseName,
    chartPath,
    '--namespace',
    options.namespace,
    '--create-namespace',
    '--values',
    options.valuesFile,
    '--wait',
    '--timeout',
    '5m'
  ]);
}

export function kubectlWaitForDeployment(namespace: string, deploymentName: string): void {
  runCommand('kubectl', [
    '--namespace',
    namespace,
    'wait',
    '--for=condition=available',
    `deployment/${deploymentName}`,
    '--timeout=5m'
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

export function kubectlRolloutStatus(namespace: string, deploymentName: string): void {
  runCommand('kubectl', [
    '--namespace',
    namespace,
    'rollout',
    'status',
    `deployment/${deploymentName}`,
    '--timeout=5m'
  ]);
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
}): Promise<PortForwardHandle> {
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
