import { describe, expect, it } from 'vitest';
import { countOccurrences, findManifest, lintChart, renderChart } from '../support/chart';

const variants = [
  {
    label: 'base values',
    valuesFile: 'values.yaml',
    apiServiceType: 'LoadBalancer',
    apiAnnotations: true
  },
  {
    label: 'local values',
    valuesFile: 'values-local.yaml',
    apiServiceType: 'ClusterIP',
    apiAnnotations: false
  },
  {
    label: 'dev values',
    valuesFile: 'values-dev.yaml',
    apiServiceType: 'LoadBalancer',
    apiAnnotations: true
  },
  {
    label: 'poc values',
    valuesFile: 'values-poc.yaml',
    apiServiceType: 'LoadBalancer',
    apiAnnotations: true
  },
  {
    label: 'qa values',
    valuesFile: 'values-qa.yaml',
    apiServiceType: 'LoadBalancer',
    apiAnnotations: true
  }
] as const;

describe.each(variants)('weather-sim chart with $label', ({ valuesFile, apiServiceType, apiAnnotations }) => {
  it('passes helm lint and preserves the expected rendered resource mix', () => {
    lintChart({ valuesFiles: [valuesFile] });
    const rendered = renderChart({ valuesFiles: [valuesFile] });

    expect(countOccurrences(rendered, /^kind:\s*Deployment$/gm)).toBe(2);
    expect(countOccurrences(rendered, /^kind:\s*Service$/gm)).toBe(2);
    expect(countOccurrences(rendered, /^kind:\s*ConfigMap$/gm)).toBe(2);
    expect(countOccurrences(rendered, /^kind:\s*HorizontalPodAutoscaler$/gm)).toBe(1);
    expect(countOccurrences(rendered, /^kind:\s*PodDisruptionBudget$/gm)).toBe(1);
    expect(countOccurrences(rendered, /^kind:\s*Ingress$/gm)).toBe(1);

    expect(rendered).toContain('# Source: weather-sim/templates/configmap.yaml');
    expect(rendered).toContain('# Source: weather-sim/templates/fluent-bit-configmap.yaml');
    expect(rendered).toContain('# Source: weather-sim/templates/api-deployment.yaml');
    expect(rendered).toContain('# Source: weather-sim/templates/web-deployment.yaml');
    expect(rendered).toContain('# Source: weather-sim/templates/services.yaml');
    expect(rendered).toContain('# Source: weather-sim/templates/hpa.yaml');
    expect(rendered).toContain('# Source: weather-sim/templates/pdb.yaml');
    expect(rendered).toContain('# Source: weather-sim/templates/ingress.yaml');

    const configMap = findManifest(rendered, 'ConfigMap', 'weather-sim-config');
    expect(configMap).toContain('NODE_ENV: "production"');
    expect(configMap).toContain('API_PORT: "8080"');
    expect(configMap).toContain('REDIS_URL: "redis://redis-master:6379"');
    expect(configMap).toContain('CORS_ORIGIN: "https://weather-poc.example.com"');
    expect(configMap).toContain('LOG_LEVEL: "info"');
    expect(configMap).toContain('APP_VERSION: "1.0.0"');
    expect(configMap).toContain('RATE_LIMIT_WINDOW_MS: "60000"');
    expect(configMap).toContain('RATE_LIMIT_MAX: "100"');

    const fluentBitConfig = findManifest(rendered, 'ConfigMap', 'weather-sim-fluent-bit-config');
    expect(fluentBitConfig).toContain('Name json');
    expect(fluentBitConfig).toContain('Path /var/log/weather-sim/api.log');
    expect(fluentBitConfig).toContain('Path /var/log/nginx/*.log');
    expect(fluentBitConfig).toContain('Brokers kafka.observability.svc.cluster.local:29092');
    expect(fluentBitConfig).toContain('Topics weather-sim.logs');

    const apiDeployment = findManifest(rendered, 'Deployment', 'weather-sim-api');
    expect(apiDeployment).toContain('replicas: 2');
    expect(apiDeployment).toContain('image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/weather-sim-api:latest');
    expect(apiDeployment).toContain('name: fluent-bit');
    expect(apiDeployment).toContain('node dist/index.js 2>&1 | tee -a /var/log/weather-sim/api.log');
    expect(apiDeployment).toContain('mountPath: /var/log/weather-sim');
    expect(apiDeployment).toContain('name: weather-sim-fluent-bit-config');
    expect(apiDeployment).toContain('/fluent-bit/etc/fluent-bit-api.conf');
    expect(apiDeployment).toContain('ports: [{ containerPort: 8080 }]');
    expect(apiDeployment).toContain('envFrom: [{ configMapRef: { name: weather-sim-config } }]');
    expect(apiDeployment).toContain('name: SESSION_SECRET');
    expect(apiDeployment).toContain('name: weather-sim-session-secret');
    expect(apiDeployment).toContain('key: SESSION_SECRET');
    expect(apiDeployment).toContain('livenessProbe: { httpGet: { path: /api/v1/system/live, port: 8080 } }');
    expect(apiDeployment).toContain('readinessProbe: { httpGet: { path: /api/v1/system/ready, port: 8080 } }');

    const webDeployment = findManifest(rendered, 'Deployment', 'weather-sim-web');
    expect(webDeployment).toContain('replicas: 2');
    expect(webDeployment).toContain('image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/weather-sim-web:latest');
    expect(webDeployment).toContain('ports: [{ containerPort: 80 }]');
    expect(webDeployment).toContain('name: fluent-bit');
    expect(webDeployment).toContain('mountPath: /var/log/nginx');
    expect(webDeployment).toContain('/fluent-bit/etc/fluent-bit-web.conf');

    const apiService = findManifest(rendered, 'Service', 'weather-sim-api');
    expect(apiService).toContain(`type: ${apiServiceType}`);
    expect(apiService).toContain('port: 8080');
    expect(apiService).toContain('targetPort: 8080');
    expect(apiService).toContain('protocol: TCP');

    if (apiAnnotations) {
      expect(apiService).toContain('annotations:');
      expect(apiService).toContain('service.beta.kubernetes.io/aws-load-balancer-scheme: internal');
      expect(apiService).toContain('service.beta.kubernetes.io/aws-load-balancer-type: external');
      expect(apiService).toContain('service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: ip');
      expect(apiService).toContain('service.beta.kubernetes.io/aws-load-balancer-healthcheck-protocol: HTTP');
      expect(apiService).toContain('service.beta.kubernetes.io/aws-load-balancer-healthcheck-path: /api/v1/system/ready');
      expect(apiService).toContain('service.beta.kubernetes.io/aws-load-balancer-healthcheck-port: "8080"');
    } else {
      expect(apiService).not.toContain('annotations:');
    }

    const webService = findManifest(rendered, 'Service', 'weather-sim-web');
    expect(webService).toContain('type: ClusterIP');
    expect(webService).toContain('port: 80');
    expect(webService).toContain('targetPort: 80');

    const hpa = findManifest(rendered, 'HorizontalPodAutoscaler', 'weather-sim-api');
    expect(hpa).toContain('scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: weather-sim-api }');
    expect(hpa).toContain('minReplicas: 2');
    expect(hpa).toContain('maxReplicas: 5');
    expect(hpa).toContain('averageUtilization: 70');

    const pdb = findManifest(rendered, 'PodDisruptionBudget', 'weather-sim-api');
    expect(pdb).toContain('minAvailable: 1');
    expect(pdb).toContain('app: weather-sim-api');

    const ingress = findManifest(rendered, 'Ingress', 'weather-sim');
    expect(ingress).toContain('ingressClassName: nginx');
    expect(ingress).toContain('host: weather-poc.example.com');
    expect(ingress).toContain('service:');
    expect(ingress).toContain('name: weather-sim-web');
    expect(ingress).toContain('number: 80');
  });
});

describe('weather-sim chart ingress toggle', () => {
  it('omits the ingress manifest when ingress.enabled is false', () => {
    lintChart({
      valuesFiles: ['values-local.yaml'],
      set: ['ingress.enabled=false']
    });

    const rendered = renderChart({
      valuesFiles: ['values-local.yaml'],
      set: ['ingress.enabled=false']
    });

    expect(countOccurrences(rendered, /^kind:\s*Ingress$/gm)).toBe(0);
    expect(countOccurrences(rendered, /^kind:\s*Deployment$/gm)).toBe(2);
    expect(countOccurrences(rendered, /^kind:\s*Service$/gm)).toBe(2);
    expect(countOccurrences(rendered, /^kind:\s*ConfigMap$/gm)).toBe(2);
    expect(countOccurrences(rendered, /^kind:\s*HorizontalPodAutoscaler$/gm)).toBe(1);
    expect(countOccurrences(rendered, /^kind:\s*PodDisruptionBudget$/gm)).toBe(1);
  });
});
