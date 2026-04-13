import { describe, expect, it } from 'vitest';
import { buildImageTag, buildWeatherSimValues } from '../kind-fixtures/harness';

describe('weather-sim chart harness helpers', () => {
  it('builds registry-backed image references', () => {
    expect(buildImageTag('localhost:5000', 'api', 'v1')).toBe('localhost:5000/weather-sim-api:v1');
    expect(buildImageTag('localhost:5000', 'web', 'v2')).toBe('localhost:5000/weather-sim-web:v2');
  });

  it('builds KinD-safe Helm overrides', () => {
    const values = buildWeatherSimValues({
      registryHost: 'localhost:5000',
      version: 'v1',
      replicaCount: 1,
      ingressHost: 'weather-sim.local.test'
    });

    expect(values).toMatchObject({
      replicaCount: 1,
      image: {
        api: 'localhost:5000/weather-sim-api:v1',
        web: 'localhost:5000/weather-sim-web:v1'
      },
      service: {
        apiType: 'ClusterIP'
      },
      env: {
        APP_VERSION: 'v1',
        CORS_ORIGIN: 'http://weather-sim.local.test'
      },
      fluentBitSidecar: {
        enabled: false
      },
      ingress: {
        enabled: true,
        className: 'nginx',
        host: 'weather-sim.local.test'
      }
    });
  });
});
