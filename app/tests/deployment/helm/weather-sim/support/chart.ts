import { execFileSync } from 'node:child_process';
import path from 'node:path';

const chartDir = path.resolve(__dirname, '../../../../../deployment/weather-sim/charts');

function normalize(output: string): string {
  return output.replace(/\r\n/g, '\n');
}

function runCommand(command: string, args: string[], input?: string): string {
  return execFileSync(command, args, {
    cwd: chartDir,
    encoding: 'utf8',
    input,
    maxBuffer: 10 * 1024 * 1024
  });
}

export function renderChart(options: {
  valuesFiles?: string[];
  set?: string[];
  releaseName?: string;
  namespace?: string;
} = {}): string {
  const args = ['template', options.releaseName ?? 'weather-sim', chartDir];

  for (const valuesFile of options.valuesFiles ?? []) {
    args.push('-f', path.resolve(chartDir, valuesFile));
  }

  for (const setValue of options.set ?? []) {
    args.push('--set', setValue);
  }

  if (options.namespace) {
    args.push('--namespace', options.namespace);
  }

  return normalize(runCommand('helm', args));
}

export function lintChart(options: {
  valuesFiles?: string[];
  set?: string[];
  namespace?: string;
} = {}): void {
  const args = ['lint', chartDir];

  for (const valuesFile of options.valuesFiles ?? []) {
    args.push('-f', path.resolve(chartDir, valuesFile));
  }

  for (const setValue of options.set ?? []) {
    args.push('--set', setValue);
  }

  if (options.namespace) {
    args.push('--namespace', options.namespace);
  }

  runCommand('helm', args);
}

export function splitManifests(rendered: string): string[] {
  return normalize(rendered)
    .split(/^---\s*$/m)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

export function findManifest(rendered: string, kind: string, name: string): string {
  const manifest = splitManifests(rendered).find((chunk) => {
    return chunk.includes(`kind: ${kind}`) && chunk.includes(`name: ${name}`);
  });

  if (!manifest) {
    throw new Error(`Could not find ${kind}/${name} in rendered manifests.`);
  }

  return manifest;
}

export function countOccurrences(rendered: string, needle: RegExp): number {
  const matches = normalize(rendered).match(needle);
  return matches?.length ?? 0;
}
