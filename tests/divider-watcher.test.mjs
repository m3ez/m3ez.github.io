import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const css = readFileSync(new URL('../assets/portfolio-theme.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../assets/portfolio-theme.js', import.meta.url), 'utf8');
const sitterURL = new URL('../assets/stickman-sitting.svg', import.meta.url);

test('theme bootstrap mounts one decorative seated watcher in the hero', () => {
  assert.match(js, /WATCHER_ID\s*=\s*'m3ez-divider-watcher-v1'/);
  assert.match(js, /function mountDividerWatcher\(\)/);
  assert.match(js, /watcher\.setAttribute\('aria-hidden',\s*'true'\)/);
  assert.match(js, /divider-watcher-pose/);
  assert.match(js, /hero\.appendChild\(watcher\)/);
  assert.match(js, /mountDividerWatcher\(\)/);
});

test('watcher sits on the left ridge and only appears with the moon', () => {
  const block = css.match(/#m3ez-divider-watcher-v1\s*\{([^}]+)\}/)?.[1] ?? '';
  assert.match(block, /position:\s*absolute/);
  assert.match(block, /left:\s*27\.65%/);
  assert.match(block, /bottom:\s*18px/);
  assert.match(block, /width:\s*34px/);
  assert.match(block, /height:\s*40\.8px/);
  assert.match(block, /opacity:\s*0/);
  assert.match(block, /pointer-events:\s*none/);
  assert.match(css, /:root\[data-theme="dark"\] #m3ez-divider-watcher-v1\s*\{[^}]*opacity:\s*\.36[^}]*translate3d\(-50%, 0, 0\)/s);
  assert.match(css, /mask-image:\s*url\("\.\/stickman-sitting\.svg"\)/);
});

test('seated pose is a passive articulated SVG facing right toward the moon', () => {
  assert.ok(existsSync(sitterURL), 'stickman-sitting.svg exists');
  const svg = readFileSync(sitterURL, 'utf8');
  assert.match(svg, /viewBox="0 0 40 48"/);
  assert.equal((svg.match(/data-head=/g) ?? []).length, 1);
  assert.equal((svg.match(/data-limb=/g) ?? []).length, 4);
  assert.match(svg, /data-gaze="true"/);
  assert.match(svg, /data-eye="true"/);
  assert.doesNotMatch(svg, /<script|<foreignObject|<image|<animate|<filter|\bon\w+=|\bhref=/i);
});

test('watcher motion is subtle, responsive, reduced-motion safe, and absent in print', () => {
  assert.match(css, /m3ez-watcher-breathe 5\.4s ease-in-out 1s infinite alternate/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?#m3ez-divider-watcher-v1\s*\{[^}]*bottom:\s*7px[^}]*width:\s*24px[^}]*height:\s*28\.8px/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?#m3ez-divider-watcher-v1\s*\{\s*transition:\s*none;/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?divider-watcher-pose\s*\{\s*animation:\s*none;/s);
  assert.match(css, /@media print[\s\S]*?#m3ez-divider-watcher-v1\s*\{\s*display:\s*none;/s);
});
