import http from 'k6/http';
import { check, fail } from 'k6';

const truthyValues = new Set(['1', 'true', 'yes', 'on']);

function toBoolean(value) {
  return truthyValues.has(String(value || '').toLowerCase());
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

export const runtimeConfig = {
  baseUrl: trimTrailingSlash(__ENV.BASE_URL || 'http://localhost:8080/api/v1'),
  location: __ENV.LOCATION || 'seattle',
  apiKey: __ENV.API_KEY || 'poc-premium-key-001',
  username: __ENV.USERNAME || 'premiumuser',
  password: __ENV.PASSWORD || 'premium-pass',
  includeLogin: toBoolean(__ENV.PERF_INCLUDE_LOGIN)
};

export function buildOptions({ scenarios, thresholds }) {
  return {
    scenarios,
    thresholds: {
      checks: ['rate>0.99'],
      http_req_failed: ['rate<0.01'],
      ...thresholds
    },
    summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max']
  };
}

export function setup() {
  const response = http.get(`${runtimeConfig.baseUrl}/system/health`, {
    tags: { endpoint: 'system_health', phase: 'setup' }
  });

  const healthy = check(response, {
    'setup health responds with 200': (res) => res.status === 200
  });

  if (!healthy) {
    fail(`Expected ${runtimeConfig.baseUrl}/system/health to return 200 before the perf run starts.`);
  }

  return runtimeConfig;
}
