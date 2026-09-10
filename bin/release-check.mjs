#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const releasePackages = ['console', 'control-plane', 'mcp', 'workspace', 'workspace/desktop'];
export function checkRelease(root, tag) {
  if (!/^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(tag)) {
    throw new Error('Use a stable Semantic Version tag: vMAJOR.MINOR.PATCH');
  }
  const version = tag.slice(1);
  const read = (name) => readFileSync(path.join(root, name), 'utf8');
  for (const directory of releasePackages) {
    const manifest = JSON.parse(read(`${directory}/package.json`));
    const lock = JSON.parse(read(`${directory}/package-lock.json`));
    if ([manifest.version, lock.version, lock.packages?.['']?.version].some((value) => value !== version)) {
      throw new Error(`${directory}: package and lockfile versions must all be ${version}`);
    }
  }
  if (!read('README.md').includes(`Current release: **${tag}**`)) throw new Error('README current release is stale');
  const changelog = read('CHANGELOG.md');
  const heading = `## [${version}] - `;
  const releaseLine = changelog.split('\n').find((line) => line.startsWith(heading));
  if (!releaseLine || !/^\d{4}-\d{2}-\d{2}$/.test(releaseLine.slice(heading.length))) throw new Error('Missing dated changelog entry');
  const record = read(`wiki/releases/${tag}.md`);
  for (const heading of ['## Validation', '## Deployment and rollback', '## Staging evidence']) {
    if (!record.includes(heading)) throw new Error(`Release record missing ${heading}`);
  }
  return version;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    checkRelease(process.cwd(), process.argv[2] || '');
    console.log('release metadata: pass');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
