import { readFile, writeFile } from 'node:fs/promises';
import { normalizeWordfenceDocument } from '../assets/research-data.js';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node automation/classify-wordfence-cves.mjs <data/wordfence-cves.json>');
  process.exitCode = 2;
} else {
  try {
    const current = JSON.parse(await readFile(inputPath, 'utf8'));
    const normalized = normalizeWordfenceDocument(current);
    await writeFile(inputPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  } catch (error) {
    console.error(`Wordfence classifier failed: ${error.message}`);
    process.exitCode = 1;
  }
}
