import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function uniqueItems(items) {
  return [...new Set((items || []).filter(Boolean))];
}

function normalizeDisplayPath(filePath) {
  return path.relative(process.cwd(), path.resolve(process.cwd(), filePath)).split(path.sep).join('/');
}

function trimOutput(text) {
  const lines = String(text || '').replace(/\r/g, '').trim().split('\n').filter(Boolean);
  return lines.slice(-8).join('\n');
}

const failures = [];

for (const filePath of uniqueItems(process.argv.slice(2))) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const displayPath = normalizeDisplayPath(filePath);

  if (!fs.existsSync(absolutePath)) {
    failures.push(`${displayPath}: missing file`);
    continue;
  }

  const result = spawnSync('node', ['--check', absolutePath], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 15000,
    maxBuffer: 65536,
  });

  if (result.error || result.status !== 0) {
    const details = trimOutput(result.stderr || result.stdout || result.error?.message || `exit ${result.status}`);
    failures.push(`${displayPath}: ${details || `exit ${result.status}`}`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.slice(0, 10).join('\n')}\n`);
  process.exit(1);
}
