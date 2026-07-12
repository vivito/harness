import { readStdin, parseHookInput } from './harness-lib.mjs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const raw = await readStdin();
const payload = raw.trim() ? JSON.parse(raw) : {};
const { isClaude } = parseHookInput(payload);

if (isClaude) {
  process.exit(0);
}

const scriptPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'stop-verify.mjs');
const result = spawnSync('node', [scriptPath, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || 'Verification hook failed.');
  process.exit(result.status || 1);
}

const text = (result.stdout || '').trim();
if (text) {
  process.stdout.write(text);
}
