import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function printUsage() {
  console.error(`Usage:
  npm run test:e2e:remote -- --base-url https://web.example.com --api-base-url https://api.example.com/api/v1

Accepted inputs:
  --base-url <url>         Remote frontend URL. Falls back to PLAYWRIGHT_BASE_URL.
  --api-base-url <url>     Remote API base URL. Falls back to PLAYWRIGHT_API_BASE_URL.
  --ignore-https-errors    Sets PLAYWRIGHT_IGNORE_HTTPS_ERRORS=true for self-signed targets.

Any other Playwright args are forwarded as-is.`);
}

function normalizeBaseUrl(value, flagName) {
  if (!value) {
    throw new Error(`Missing required ${flagName}. Pass the flag or set the matching PLAYWRIGHT_* environment variable.`);
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid ${flagName}: "${value}"`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${flagName} must use http or https.`);
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
  return parsed.toString().replace(/\/$/, '');
}

const args = process.argv.slice(2);
const forwardedArgs = [];
let baseUrl = process.env.PLAYWRIGHT_BASE_URL;
let apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL;
let ignoreHttpsErrors = process.env.PLAYWRIGHT_IGNORE_HTTPS_ERRORS;

for (let index = 0; index < args.length; index += 1) {
  const current = args[index];

  if (current === '--base-url') {
    baseUrl = args[index + 1];
    index += 1;
    continue;
  }

  if (current === '--api-base-url') {
    apiBaseUrl = args[index + 1];
    index += 1;
    continue;
  }

  if (current === '--ignore-https-errors') {
    ignoreHttpsErrors = 'true';
    continue;
  }

  if (current === '--help' || current === '-h') {
    printUsage();
    process.exit(0);
  }

  forwardedArgs.push(current);
}

try {
  baseUrl = normalizeBaseUrl(baseUrl, '--base-url / PLAYWRIGHT_BASE_URL');
  apiBaseUrl = normalizeBaseUrl(apiBaseUrl, '--api-base-url / PLAYWRIGHT_API_BASE_URL');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  printUsage();
  process.exit(1);
}

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const playwrightCliPath = path.resolve(currentDirPath, '../node_modules/playwright/cli.js');

const child = spawn(
  process.execPath,
  [playwrightCliPath, 'test', ...forwardedArgs],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYWRIGHT_BASE_URL: baseUrl,
      PLAYWRIGHT_API_BASE_URL: apiBaseUrl,
      ...(ignoreHttpsErrors ? { PLAYWRIGHT_IGNORE_HTTPS_ERRORS: ignoreHttpsErrors } : {})
    }
  }
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
