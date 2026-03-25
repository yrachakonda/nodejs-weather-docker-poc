import { buildOptions, runtimeConfig, setup } from './lib/config.js';
import { currentWeather, endpointThresholds, loginFlow, premiumForecast, systemHealth } from './lib/scenarios.js';

const profile = (__ENV.STRESS_PROFILE || 'local').toLowerCase();

const stageMap = {
  local: {
    health: [
      { duration: '30s', target: 1 },
      { duration: '30s', target: 3 },
      { duration: '30s', target: 5 },
      { duration: '20s', target: 0 }
    ],
    current: [
      { duration: '30s', target: 2 },
      { duration: '30s', target: 6 },
      { duration: '30s', target: 10 },
      { duration: '20s', target: 0 }
    ],
    premium: [
      { duration: '30s', target: 1 },
      { duration: '30s', target: 4 },
      { duration: '30s', target: 6 },
      { duration: '20s', target: 0 }
    ],
    login: [
      { duration: '30s', target: 1 },
      { duration: '30s', target: 2 },
      { duration: '20s', target: 0 }
    ]
  },
  heavier: {
    health: [
      { duration: '30s', target: 2 },
      { duration: '45s', target: 5 },
      { duration: '45s', target: 8 },
      { duration: '30s', target: 0 }
    ],
    current: [
      { duration: '30s', target: 4 },
      { duration: '45s', target: 10 },
      { duration: '45s', target: 16 },
      { duration: '30s', target: 0 }
    ],
    premium: [
      { duration: '30s', target: 3 },
      { duration: '45s', target: 8 },
      { duration: '45s', target: 12 },
      { duration: '30s', target: 0 }
    ],
    login: [
      { duration: '30s', target: 1 },
      { duration: '45s', target: 3 },
      { duration: '30s', target: 0 }
    ]
  }
};

const selectedProfile = stageMap[profile] || stageMap.local;

const scenarios = {
  health_stress: {
    exec: 'health',
    executor: 'ramping-vus',
    startVUs: 0,
    stages: selectedProfile.health
  },
  current_stress: {
    exec: 'current',
    executor: 'ramping-vus',
    startVUs: 0,
    stages: selectedProfile.current
  },
  premium_stress: {
    exec: 'premium',
    executor: 'ramping-vus',
    startVUs: 0,
    stages: selectedProfile.premium
  }
};

if (runtimeConfig.includeLogin) {
  scenarios.login_stress = {
    exec: 'login',
    executor: 'ramping-vus',
    startVUs: 0,
    stages: selectedProfile.login
  };
}

export { setup };

export const options = buildOptions({
  scenarios,
  thresholds: endpointThresholds({
    'http_req_duration{endpoint:system_health}': ['p(95)<500'],
    'http_req_duration{endpoint:weather_current}': ['p(95)<1200'],
    'http_req_duration{endpoint:weather_premium_forecast}': ['p(95)<1500'],
    'http_req_duration{endpoint:auth_login}': ['p(95)<1200'],
    'http_req_duration{endpoint:auth_me}': ['p(95)<800']
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
