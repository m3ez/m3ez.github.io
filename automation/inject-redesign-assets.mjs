import { readFile, writeFile } from 'node:fs/promises';

const path = process.argv[2] ?? 'index.html';
const stylesheet = '<link rel="stylesheet" href="/assets/research-credentials.css"/>';
const script = '<script type="module" src="/assets/portfolio-redesign.js"></script>';

let html = await readFile(path, 'utf8');
// The exported homepage is enhanced by our modules. Hydrating the same DOM with
// the old React tree races those enhancements and can replace the entire page.
// Keep the exported HTML/CSS, but do not boot a second renderer on this page.
html = html
  .replace(/<script\b[^>]*src="\/_next\/[^\"]+"[^>]*><\/script>/g, '')
  .replace(/<script\b[^>]*>(?:\(self\.__next_f|self\.__next_f)[\s\S]*?<\/script>/g, '')
  .replace(/<link\b(?=[^>]*as="script")(?=[^>]*href="\/_next\/)[^>]*>/g, '');
if (!html.includes('/assets/research-credentials.css')) {
  if (!html.includes('</head>')) throw new Error('index.html has no </head>');
  html = html.replace('</head>', `${stylesheet}</head>`);
}
if (!html.includes('/assets/portfolio-redesign.js')) {
  if (!html.includes('</head>')) throw new Error('index.html has no </head>');
  html = html.replace('</head>', `${script}</head>`);
}
await writeFile(path, html, 'utf8');
