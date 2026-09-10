import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, ['automation/classify-wordfence-cves.mjs', 'data/wordfence-cves.json']);
run(process.execPath, ['automation/inject-redesign-assets.mjs', 'index.html']);

const workflowPath = '.github/workflows/update-wordfence-cves.yml';
let workflow = await readFile(workflowPath, 'utf8');
const classifierLine = '          node automation/classify-wordfence-cves.mjs data/wordfence-cves.json\n';
if (!workflow.includes(classifierLine.trim())) {
  const needle = '            --output data/wordfence-cves.json\n';
  if (!workflow.includes(needle)) throw new Error('Unable to locate Wordfence output command');
  workflow = workflow.replace(needle, `${needle}${classifierLine}`);
  await writeFile(workflowPath, workflow, 'utf8');
}
