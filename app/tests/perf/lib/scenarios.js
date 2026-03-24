import http from 'k6/http';
import { check, sleep } from 'k6';

function authHeaders(config) {
  return {
    'x-api-key': config.apiKey
  };
}

export function systemHealth(config) {
  const response = http.get(`${config.baseUrl}/system/health`, {
    tags: { endpoint: 'system_health' }
  });

  check(response, {
    'health returns 200': (res) => res.status === 200,
    'health status is healthy': (res) => res.json('status') === 'healthy'
  });

  sleep(1);
}

export function currentWeather(config) {
  const response = http.get(`${config.baseUrl}/weather/current?location=${encodeURIComponent(config.location)}`, {
    headers: authHeaders(config),
    tags: { endpoint: 'weather_current' }
  });

  check(response, {
    'current weather returns 200': (res) => res.status === 200,
    'current weather payload exists': (res) => Boolean(res.json('data.location'))
  });

  sleep(1);
}

export function premiumForecast(config) {
  const response = http.get(`${config.baseUrl}/weather/premium-forecast?location=${encodeURIComponent(config.location)}`, {
    headers: authHeaders(config),
    tags: { endpoint: 'weather_premium_forecast' }
  });

  check(response, {
    'premium forecast returns 200': (res) => res.status === 200,
    'premium forecast returns an array': (res) => Array.isArray(res.json('data')),
    'premium forecast returns at least one day': (res) => (res.json('data') || []).length > 0
  });

  sleep(1);
}

export function loginFlow(config) {
  const loginResponse = http.post(
    `${config.baseUrl}/auth/login`,
    JSON.stringify({
      username: config.username,
      password: config.password
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'auth_login' }
    }
  );

  check(loginResponse, {
    'login returns 200': (res) => res.status === 200,
    'login returns expected user': (res) => res.json('user.username') === config.username
  });

  const meResponse = http.get(`${config.baseUrl}/auth/me`, {
    tags: { endpoint: 'auth_me' }
  });

  check(meResponse, {
    'auth/me returns 200 after login': (res) => res.status === 200,
    'auth/me reports the same user': (res) => res.json('user.username') === config.username
  });

  sleep(1);
}

export function endpointThresholds(overrides = {}) {
  return {
    'http_req_duration{endpoint:system_health}': ['p(95)<300'],
    'http_req_duration{endpoint:weather_current}': ['p(95)<750'],
    'http_req_duration{endpoint:weather_premium_forecast}': ['p(95)<1000'],
    'http_req_duration{endpoint:auth_login}': ['p(95)<800'],
    'http_req_duration{endpoint:auth_me}': ['p(95)<500'],
    ...overrides
  };
}
