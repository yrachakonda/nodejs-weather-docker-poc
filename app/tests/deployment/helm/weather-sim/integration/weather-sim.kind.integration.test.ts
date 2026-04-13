import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  buildAndPushFixtureImage,
  buildWeatherSimValues,
  checkPrerequisites,
  createKindCluster,
  createNamespace,
  createSessionSecret,
  createTempWorkspace,
  deleteKindCluster,
  helmUpgradeInstall,
  kubectlGetJson,
  kubectlGetJsonList,
  kubectlRolloutStatus,
  kubectlWaitForDeployment,
  loadImageIntoKind,
  registryEndpoint,
  repullImage,
  startPortForward,
  startRegistryContainer,
  waitForHttp,
  writeJsonFile
} from '../kind-fixtures/harness';
import type { StartedTestContainer } from 'testcontainers';

type DeploymentManifest = {
  spec: {
    replicas?: number;
  };
  status?: {
    availableReplicas?: number;
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

type IngressManifest = {
  spec?: {
    rules?: Array<{
      host?: string;
    }>;
  };
};

type HpaManifest = {
  spec?: {
    minReplicas?: number;
    maxReplicas?: number;
  };
};

type PodList = {
  items: Array<{
    status?: {
      phase?: string;
      containerStatuses?: Array<{
        ready?: boolean;
        image?: string;
        name?: string;
      }>;
    };
  }>;
};

function countReadyPodsWithImage(pods: PodList, imageTagSuffix: string): number {
  return pods.items.filter((pod) =>
    pod.status?.containerStatuses?.some((status) => status.ready && status.image?.includes(imageTagSuffix))
  ).length;
}

const missingPrerequisites = checkPrerequisites();

if (missingPrerequisites.length > 0) {
  console.warn(
    `Skipping weather-sim KinD integration tests because the following prerequisites are missing: ${missingPrerequisites.join(', ')}`
  );
}

const suite = missingPrerequisites.length > 0 ? describe.skip : describe.sequential;

const runId = randomUUID().slice(0, 8);
const clusterName = `ws-${runId}`;
const namespace = `ws-${runId}`;
const releaseName = `ws-${runId}`;
const ingressHost = `weather-sim-${runId}.local.test`;
const sessionSecretName = 'weather-sim-session-secret';
const appVersionV1 = 'kind-v1';
const appVersionV2 = 'kind-v2';

suite('weather-sim Helm chart in KinD', () => {
  let registryContainer: StartedTestContainer | undefined;
  let workspace: ReturnType<typeof createTempWorkspace> | undefined;
  let registryHost = '';
  let valuesV1Path = '';
  let valuesV2Path = '';

  beforeAll(async () => {
    workspace = createTempWorkspace(`weather-sim-${runId}-`);

    registryContainer = await startRegistryContainer();
    registryHost = registryEndpoint(registryContainer);

    const apiImageV1 = buildAndPushFixtureImage({
      registryHost,
      role: 'api',
      version: appVersionV1,
      port: 8080
    });
    const webImageV1 = buildAndPushFixtureImage({
      registryHost,
      role: 'web',
      version: appVersionV1,
      port: 80
    });
    const apiImageV2 = buildAndPushFixtureImage({
      registryHost,
      role: 'api',
      version: appVersionV2,
      port: 8080
    });
    const webImageV2 = buildAndPushFixtureImage({
      registryHost,
      role: 'web',
      version: appVersionV2,
      port: 80
    });

    repullImage(apiImageV1);
    repullImage(webImageV1);
    repullImage(apiImageV2);
    repullImage(webImageV2);

    createKindCluster(clusterName);

    loadImageIntoKind(clusterName, apiImageV1);
    loadImageIntoKind(clusterName, webImageV1);
    loadImageIntoKind(clusterName, apiImageV2);
    loadImageIntoKind(clusterName, webImageV2);

    createNamespace(namespace);
    createSessionSecret(namespace, sessionSecretName);

    valuesV1Path = writeJsonFile(
      workspace.directory,
      'values.v1.json',
      buildWeatherSimValues({
        registryHost,
        version: appVersionV1,
        replicaCount: 1,
        ingressHost
      })
    );

    valuesV2Path = writeJsonFile(
      workspace.directory,
      'values.v2.json',
      buildWeatherSimValues({
        registryHost,
        version: appVersionV2,
        replicaCount: 2,
        ingressHost
      })
    );

    helmUpgradeInstall({
      releaseName,
      namespace,
      valuesFile: valuesV1Path
    });

    kubectlWaitForDeployment(namespace, 'weather-sim-api');
    kubectlWaitForDeployment(namespace, 'weather-sim-web');
  }, 600_000);

  afterAll(async () => {
    deleteKindCluster(clusterName);

    if (registryContainer) {
      await registryContainer.stop();
    }

    workspace?.cleanup();
  }, 120_000);

  it('installs chart resources with KinD-safe overrides and serves healthy endpoints', async () => {
    const apiDeployment = kubectlGetJson<DeploymentManifest>(namespace, 'deployment', 'weather-sim-api');
    const webDeployment = kubectlGetJson<DeploymentManifest>(namespace, 'deployment', 'weather-sim-web');
    const configMap = kubectlGetJson<ConfigMapManifest>(namespace, 'configmap', 'weather-sim-config');
    const apiService = kubectlGetJson<ServiceManifest>(namespace, 'service', 'weather-sim-api');
    const webService = kubectlGetJson<ServiceManifest>(namespace, 'service', 'weather-sim-web');
    const ingress = kubectlGetJson<IngressManifest>(namespace, 'ingress', 'weather-sim');
    const hpa = kubectlGetJson<HpaManifest>(namespace, 'horizontalpodautoscaler', 'weather-sim-api');
    const pdb = kubectlGetJson<Record<string, unknown>>(namespace, 'poddisruptionbudget', 'weather-sim-api');
    const apiPods = kubectlGetJsonList<PodList>(namespace, ['get', 'pods', '-l', 'app=weather-sim-api']);
    const webPods = kubectlGetJsonList<PodList>(namespace, ['get', 'pods', '-l', 'app=weather-sim-web']);

    expect(apiDeployment.spec.replicas).toBe(1);
    expect(apiDeployment.status?.availableReplicas).toBe(1);
    expect(webDeployment.spec.replicas).toBe(1);
    expect(webDeployment.status?.availableReplicas).toBe(1);
    expect(configMap.data?.APP_VERSION).toBe(appVersionV1);
    expect(apiService.spec.type).toBe('ClusterIP');
    expect(webService.spec.type).toBe('ClusterIP');
    expect(ingress.spec?.rules?.[0]?.host).toBe(ingressHost);
    expect(hpa.spec?.minReplicas).toBe(2);
    expect(hpa.spec?.maxReplicas).toBe(5);
    expect(pdb).toBeDefined();
    expect(apiPods.items).toHaveLength(1);
    expect(webPods.items).toHaveLength(1);
    expect(apiPods.items[0].status?.containerStatuses?.[0].ready).toBe(true);
    expect(webPods.items[0].status?.containerStatuses?.[0].ready).toBe(true);
    expect(apiPods.items[0].status?.containerStatuses?.[0].image).toContain(':kind-v1');
    expect(webPods.items[0].status?.containerStatuses?.[0].image).toContain(':kind-v1');

    const apiForward = await startPortForward({
      namespace,
      resource: 'svc/weather-sim-api',
      remotePort: 8080
    });
    const webForward = await startPortForward({
      namespace,
      resource: 'svc/weather-sim-web',
      remotePort: 80
    });

    try {
      await waitForHttp(`http://127.0.0.1:${apiForward.localPort}/api/v1/system/ready`, async (response) => {
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ status: 'ready' });
      });

      await waitForHttp(`http://127.0.0.1:${apiForward.localPort}/api/v1/system/version`, async (response) => {
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ version: appVersionV1 });
      });

      await waitForHttp(`http://127.0.0.1:${webForward.localPort}/`, async (response) => {
        const body = await response.text();
        expect(response.status).toBe(200);
        expect(body).toContain('weather-sim');
        expect(body).toContain(`version:${appVersionV1}`);
      });
    } finally {
      await apiForward.stop();
      await webForward.stop();
    }
  });

  it('upgrades the release to the second fixture image set and keeps the workloads healthy', async () => {
    helmUpgradeInstall({
      releaseName,
      namespace,
      valuesFile: valuesV2Path
    });

    kubectlRolloutStatus(namespace, 'weather-sim-api');
    kubectlRolloutStatus(namespace, 'weather-sim-web');
    kubectlWaitForDeployment(namespace, 'weather-sim-api');
    kubectlWaitForDeployment(namespace, 'weather-sim-web');

    const apiDeployment = kubectlGetJson<DeploymentManifest>(namespace, 'deployment', 'weather-sim-api');
    const webDeployment = kubectlGetJson<DeploymentManifest>(namespace, 'deployment', 'weather-sim-web');
    const configMap = kubectlGetJson<ConfigMapManifest>(namespace, 'configmap', 'weather-sim-config');
    const apiPods = kubectlGetJsonList<PodList>(namespace, ['get', 'pods', '-l', 'app=weather-sim-api']);
    const webPods = kubectlGetJsonList<PodList>(namespace, ['get', 'pods', '-l', 'app=weather-sim-web']);

    expect(apiDeployment.spec.replicas).toBe(2);
    expect(apiDeployment.status?.availableReplicas).toBe(2);
    expect(webDeployment.spec.replicas).toBe(2);
    expect(webDeployment.status?.availableReplicas).toBe(2);
    expect(configMap.data?.APP_VERSION).toBe(appVersionV2);
    expect(apiPods.items.length).toBeGreaterThanOrEqual(2);
    expect(webPods.items.length).toBeGreaterThanOrEqual(2);
    expect(countReadyPodsWithImage(apiPods, ':kind-v2')).toBe(2);
    expect(countReadyPodsWithImage(webPods, ':kind-v2')).toBe(2);

    const apiForward = await startPortForward({
      namespace,
      resource: 'svc/weather-sim-api',
      remotePort: 8080
    });
    const webForward = await startPortForward({
      namespace,
      resource: 'svc/weather-sim-web',
      remotePort: 80
    });

    try {
      await waitForHttp(`http://127.0.0.1:${apiForward.localPort}/api/v1/system/version`, async (response) => {
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ version: appVersionV2 });
      });

      await waitForHttp(`http://127.0.0.1:${webForward.localPort}/`, async (response) => {
        const body = await response.text();
        expect(response.status).toBe(200);
        expect(body).toContain(`version:${appVersionV2}`);
      });
    } finally {
      await apiForward.stop();
      await webForward.stop();
    }
  });
});
