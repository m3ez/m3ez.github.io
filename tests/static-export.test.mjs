import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const injector = fileURLToPath(new URL('../automation/inject-redesign-assets.mjs', import.meta.url));

test('preparing an export removes competing hydration and preserves content and metadata', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-export-'));
  const path = join(directory, 'index.html');
  try {
    await writeFile(path, `<!doctype html><html><head>
<link rel="stylesheet" href="/_next/static/site.css"/>
<link rel="canonical" href="https://m3ez.github.io/"/>
<link rel="icon" href="/favicon.ico"/>
<link rel="preload" as="script" href="/_next/static/runtime.js"/>
<script src="/_next/static/runtime.js" async=""></script>
</head><body><main><h1>Portfolio</h1><a href="#contact">Contact</a></main>
<script>(self.__next_f=self.__next_f||[]).push([0])</script>
<script>self.__next_f.push([1,"exported tree"])</script>
</body></html>`);
    execFileSync(process.execPath, [injector, path]);
    const html = await readFile(path, 'utf8');
    assert.doesNotMatch(html, /runtime\.js|self\.__next_f/);
    assert.ok(html.includes('<main><h1>Portfolio</h1><a href="#contact">Contact</a></main>'));
    assert.ok(html.includes('href="/_next/static/site.css"'));
    assert.ok(html.includes('href="/favicon.ico"'));
    assert.ok(html.includes('href="https://m3ez.github.io/"'));
    assert.ok(html.includes('src="/assets/portfolio-redesign.js"'));
    assert.ok(html.includes('href="/assets/research-credentials.css"'));
    execFileSync(process.execPath, [injector, path]);
    assert.equal(await readFile(path, 'utf8'), html);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('preparing an export with an existing stylesheet still installs its interaction module', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-export-'));
  const path = join(directory, 'index.html');
  try {
    await writeFile(path, '<html><head><link rel="stylesheet" href="/assets/research-credentials.css"/></head><body></body></html>');
    execFileSync(process.execPath, [injector, path]);
    const html = await readFile(path, 'utf8');
    assert.equal(html.match(/src="\/assets\/portfolio-redesign.js"/g)?.length, 1);
    assert.equal(html.match(/href="\/assets\/research-credentials.css"/g)?.length, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
