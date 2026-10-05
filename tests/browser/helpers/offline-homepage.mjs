import { readFileSync } from 'node:fs';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const moduleCache = new Map();
const mime = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
function localPath(url, parent = root) {
  const path = resolve(url.startsWith('/') ? root : parent, url.replace(/^\//, '').split(/[?#]/)[0]);
  if (!path.startsWith(root.endsWith(sep) ? root : `${root}${sep}`)) throw new Error(`Non-local fixture asset: ${url}`);
  return path;
}
function inlineCss(path) {
  return readFileSync(path, 'utf8')
    .replace(/@import\s+url\(["']?([^"')]+)["']?\);/g, (_, url) => inlineCss(localPath(url, dirname(path))))
    .replace(/url\(["']?([^"')]+)["']?\)/g, (match, url) => {
      if (/^(?:data:|https?:|#)/.test(url)) return match;
      const asset = localPath(url, dirname(path));
      return `url("data:${mime[extname(asset)] ?? 'application/octet-stream'};base64,${readFileSync(asset).toString('base64')}")`;
    });
}
function moduleUrl(path) {
  if (moduleCache.has(path)) return moduleCache.get(path);
  const source = readFileSync(path, 'utf8').replace(/\bfrom\s+(['"])(\.[^'"]+)\1/g,
    (_, quote, url) => `from ${quote}${moduleUrl(localPath(url, dirname(path)))}${quote}`);
  const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  moduleCache.set(path, url);
  return url;
}

// Real exported HTML, CSS, module graph and JSON dataset, with local resources
// inlined for a network-free integration fixture. No production behavior is
// reimplemented: the only stub supplies the exact local JSON fetch response.
export async function loadOfflineHomepage(page, { palette = 'light', hash = '' } = {}) {
  let html = readFileSync(resolve(root, 'index.html'), 'utf8');
  html = html.replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*><\/script>/g, '')
    .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, tag => {
      const url = tag.match(/href="([^"]+)"/)?.[1];
      if (!url) throw new Error('Stylesheet without href');
      return `<style>${inlineCss(localPath(url))}</style>`;
    });
  await page.setContent(html);
  if (hash) await page.evaluate(value => { location.hash = value; }, hash);
  await page.addScriptTag({ content: readFileSync(resolve(root, 'assets/portfolio-theme.js'), 'utf8') });
  const dataset = readFileSync(resolve(root, 'data/wordfence-cves.json'), 'utf8');
  await page.evaluate(({ palette, dataset }) => {
    document.documentElement.dataset.theme = palette;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (url, options) => url === '/data/wordfence-cves.json'
      ? Promise.resolve(new Response(dataset, { status: 200, headers: { 'Content-Type': 'application/json' } }))
      : nativeFetch(url, options);
  }, { palette, dataset });
  await page.addScriptTag({ type: 'module', content: `import '${moduleUrl(resolve(root, 'assets/portfolio-redesign.js'))}';` });
  await page.waitForFunction(() => document.documentElement.dataset.m3ezProgressiveDisclosure === 'ready' &&
    document.querySelector('#m3ez-credential-carousel-v1'));
}
