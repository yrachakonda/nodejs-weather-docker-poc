import { buildOptions, runtimeConfig, setup } from './lib/config.js';
import { currentWeather, endpointThresholds, loginFlow, premiumForecast, systemHealth } from './lib/scenarios.js';

const scenarios = {
  health_baseline: {
    exec: 'health',
    executor: 'constant-vus',
    vus: 1,
    duration: '30s'
  },
  current_baseline: {
    exec: 'current',
    executor: 'constant-vus',
    vus: 1,
    duration: '30s'
  },
  premium_baseline: {
    exec: 'premium',
    executor: 'constant-vus',
    vus: 1,
    duration: '30s'
  }
};

if (runtimeConfig.includeLogin) {
  scenarios.login_baseline = {
    exec: 'login',
    executor: 'constant-vus',
    vus: 1,
    duration: '20s',
    startTime: '5s'
  };
}

export { setup };

export const options = buildOptions({
  scenarios,
  thresholds: endpointThresholds({
    'http_req_duration{endpoint:system_health}': ['p(95)<250'],
    'http_req_duration{endpoint:weather_current}': ['p(95)<500'],
    'http_req_duration{endpoint:weather_premium_forecast}': ['p(95)<750']
  })
});

export function health(config) {
  systemHealth(config);
}

export function current(config) {
  currentWeather(config);
}

export function premium(config) {
  premiumForecast(config);
}

export function login(config) {
  loginFlow(config);
}
