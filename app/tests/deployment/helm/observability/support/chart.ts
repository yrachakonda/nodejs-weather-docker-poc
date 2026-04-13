import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type ObservabilityChart = 'kafka' | 'fluent-bit' | 'logstash';

const chartDirs: Record<ObservabilityChart, string> = {
  kafka: path.resolve(__dirname, '../../../../../deployment/kafka'),
  'fluent-bit': path.resolve(__dirname, '../../../../../deployment/fluent-bit'),
  logstash: path.resolve(__dirname, '../../../../../deployment/logstash')
};

function normalize(output: string): string {
  return output.replace(/\r\n/g, '\n');
}

function runHelm(chartDir: string, args: string[], input?: string): string {
  return execFileSync('helm', args, {
    cwd: chartDir,
    encoding: 'utf8',
    input,
    maxBuffer: 20 * 1024 * 1024
  });
}

function createValuesFile(chartName: ObservabilityChart, values: Record<string, unknown>): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `observability-${chartName}-`));
  const filePath = path.join(directory, 'values.json');
  fs.writeFileSync(filePath, `${JSON.stringify(values, null, 2)}\n`, 'utf8');
  return filePath;
}

export function renderChart(options: {
  chart: ObservabilityChart;
  releaseName?: string;
  namespace?: string;
  values?: Record<string, unknown>;
  valuesFiles?: string[];
  set?: string[];
}): string {
  const chartDir = chartDirs[options.chart];
  const args = ['template', options.releaseName ?? options.chart, chartDir];

  if (options.namespace) {
    args.push('--namespace', options.namespace);
  }

  for (const valuesFile of options.valuesFiles ?? []) {
    args.push('-f', path.resolve(chartDir, valuesFile));
  }

  if (options.values) {
    args.push('-f', createValuesFile(options.chart, options.values));
  }

  for (const setValue of options.set ?? []) {
    args.push('--set', setValue);
  }

  return normalize(runHelm(chartDir, args));
}

export function lintChart(options: {
  chart: ObservabilityChart;
  namespace?: string;
  values?: Record<string, unknown>;
  valuesFiles?: string[];
  set?: string[];
}): void {
  const chartDir = chartDirs[options.chart];
  const args = ['lint', chartDir];

  if (options.namespace) {
    args.push('--namespace', options.namespace);
  }

  for (const valuesFile of options.valuesFiles ?? []) {
    args.push('-f', path.resolve(chartDir, valuesFile));
  }

  if (options.values) {
    args.push('-f', createValuesFile(options.chart, options.values));
  }

  for (const setValue of options.set ?? []) {
    args.push('--set', setValue);
  }

  runHelm(chartDir, args);
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
