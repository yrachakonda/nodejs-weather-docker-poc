import { buildOptions, runtimeConfig, setup } from './lib/config.js';
import { currentWeather, endpointThresholds, loginFlow, premiumForecast, systemHealth } from './lib/scenarios.js';

const profile = (__ENV.SOAK_PROFILE || 'local').toLowerCase();

const profileMap = {
  local: {
    duration: '10m',
    healthVus: 1,
    currentVus: 1,
    premiumVus: 1,
    loginIterations: 20
  },
  long: {
    duration: '30m',
    healthVus: 1,
    currentVus: 2,
    premiumVus: 1,
    loginIterations: 60
  }
};

const selectedProfile = profileMap[profile] || profileMap.local;

const scenarios = {
  health_soak: {
    exec: 'health',
    executor: 'constant-vus',
    vus: selectedProfile.healthVus,
    duration: selectedProfile.duration
  },
  current_soak: {
    exec: 'current',
    executor: 'constant-vus',
    vus: selectedProfile.currentVus,
    duration: selectedProfile.duration
  },
  premium_soak: {
    exec: 'premium',
    executor: 'constant-vus',
    vus: selectedProfile.premiumVus,
    duration: selectedProfile.duration
  }
};

if (runtimeConfig.includeLogin) {
  scenarios.login_soak = {
    exec: 'login',
    executor: 'shared-iterations',
    vus: 1,
    iterations: selectedProfile.loginIterations,
    maxDuration: selectedProfile.duration
  };
}

export { setup };

export const options = buildOptions({
  scenarios,
  thresholds: endpointThresholds({
    'http_req_duration{endpoint:system_health}': ['p(95)<400'],
    'http_req_duration{endpoint:weather_current}': ['p(95)<900'],
    'http_req_duration{endpoint:weather_premium_forecast}': ['p(95)<1200']
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
