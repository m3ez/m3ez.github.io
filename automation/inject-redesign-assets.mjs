import { readFile, writeFile } from 'node:fs/promises';

const path = process.argv[2] ?? 'index.html';
const stylesheet = '<link rel="stylesheet" href="/assets/research-credentials.css"/>';
const script = '<script type="module" src="/assets/portfolio-redesign.js"></script>';

let html = await readFile(path, 'utf8');
if (!html.includes('/assets/research-credentials.css')) {
  if (!html.includes('</head>')) throw new Error('index.html has no </head>');
  html = html.replace('</head>', `${stylesheet}${script}</head>`);
}
await writeFile(path, html, 'utf8');
