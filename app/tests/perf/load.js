import { buildOptions, runtimeConfig, setup } from './lib/config.js';
import { currentWeather, endpointThresholds, loginFlow, premiumForecast, systemHealth } from './lib/scenarios.js';

const profile = (__ENV.LOAD_PROFILE || 'local').toLowerCase();

const profileMap = {
  local: {
    healthVus: 1,
    currentVus: 3,
    premiumVus: 2,
    loginVus: 1,
    duration: '1m'
  },
  heavier: {
    healthVus: 2,
    currentVus: 6,
    premiumVus: 4,
    loginVus: 2,
    duration: '2m'
  }
};

const selectedProfile = profileMap[profile] || profileMap.local;

const scenarios = {
  health_load: {
    exec: 'health',
    executor: 'constant-vus',
    vus: selectedProfile.healthVus,
    duration: selectedProfile.duration
  },
  current_load: {
    exec: 'current',
    executor: 'constant-vus',
    vus: selectedProfile.currentVus,
    duration: selectedProfile.duration
  },
  premium_load: {
    exec: 'premium',
    executor: 'constant-vus',
    vus: selectedProfile.premiumVus,
    duration: selectedProfile.duration
  }
};

if (runtimeConfig.includeLogin) {
  scenarios.login_load = {
    exec: 'login',
    executor: 'constant-vus',
    vus: selectedProfile.loginVus,
    duration: selectedProfile.duration,
    startTime: '10s'
  };
}

export { setup };

export const options = buildOptions({
  scenarios,
  thresholds: endpointThresholds()
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
