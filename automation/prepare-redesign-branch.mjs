import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, ['automation/classify-wordfence-cves.mjs', 'data/wordfence-cves.json']);
run(process.execPath, ['automation/inject-redesign-assets.mjs', 'index.html']);
