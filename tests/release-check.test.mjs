import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkRelease, releasePackages } from '../bin/release-check.mjs';
function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'neural-release-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (name, value) => {
    mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    writeFileSync(path.join(root, name), typeof value === 'string' ? value : JSON.stringify(value));
  };
  for (const dir of releasePackages) {
    write(`${dir}/package.json`, { version: '0.4.0' });
    write(`${dir}/package-lock.json`, { version: '0.4.0', packages: { '': { version: '0.4.0' } } });
  }
  write('README.md', 'Current release: **v0.4.0**');
  write('CHANGELOG.md', '## [Unreleased]\n\n## [0.4.0] - 2026-09-11\n\nRelease changes.');
  write('wiki/releases/v0.4.0.md', '# v0.4.0\n## Validation\nPassed\n## Deployment and rollback\nReviewed\n## Staging evidence\nRecorded');
  return { root, write };
}
test('accepts consistent release metadata', (t) => {
  const { root } = fixture(t);
  assert.equal(checkRelease(root, 'v0.4.0'), '0.4.0');
});
test('rejects unsafe and prerelease tags', (t) => {
  const { root } = fixture(t);
  for (const tag of ['../v0.4.0', 'v0.4.0-rc.1', '0.4.0', 'v00.4.0', 'v0.4.0\n']) assert.throws(() => checkRelease(root, tag));
});
test('rejects stale lockfile root version', (t) => {
  const { root, write } = fixture(t);
  write('mcp/package-lock.json', { version: '0.4.0', packages: { '': { version: '0.3.2' } } });
  assert.throws(() => checkRelease(root, 'v0.4.0'), /mcp/);
});
test('requires release notes and staging evidence', (t) => {
  const { root, write } = fixture(t);
  write('wiki/releases/v0.4.0.md', '## Validation\n## Deployment and rollback');
  assert.throws(() => checkRelease(root, 'v0.4.0'), /Staging evidence/);
});
test('rejects stale README and undated changelog', (t) => {
  const { root, write } = fixture(t);
  write('README.md', 'Current release: **v0.3.2**');
  assert.throws(() => checkRelease(root, 'v0.4.0'), /README/);
  write('README.md', 'Current release: **v0.4.0**');
  write('CHANGELOG.md', '## [0.4.0]');
  assert.throws(() => checkRelease(root, 'v0.4.0'), /changelog/);
});
