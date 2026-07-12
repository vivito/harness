import fs from 'node:fs';
import path from 'node:path';

function uniqueItems(items) {
  return [...new Set((items || []).filter(Boolean))];
}

function normalizeDisplayPath(filePath) {
  return path.relative(process.cwd(), path.resolve(process.cwd(), filePath)).split(path.sep).join('/');
}

const failures = [];

for (const filePath of uniqueItems(process.argv.slice(2))) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const displayPath = normalizeDisplayPath(filePath);

  if (!fs.existsSync(absolutePath)) {
    failures.push(`${displayPath}: missing file`);
    continue;
  }

  try {
    JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    failures.push(`${displayPath}: ${String(error?.message || error).trim()}`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.slice(0, 10).join('\n')}\n`);
  process.exit(1);
}
