import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../assets/portfolio-theme.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../assets/portfolio-theme.js', import.meta.url), 'utf8');

test('theme bootstrap mounts one decorative celestial mark in the hero', () => {
  assert.match(js, /CELESTIAL_ID\s*=\s*'m3ez-divider-celestial-v1'/);
  assert.match(js, /document\.getElementById\('top'\)/);
  assert.match(js, /document\.getElementById\(CELESTIAL_ID\)/);
  assert.match(js, /divider-celestial-sun/);
  assert.match(js, /divider-celestial-moon/);
  assert.match(js, /celestial\.setAttribute\('aria-hidden',\s*'true'\)/);
  assert.match(js, /hero\.appendChild\(celestial\)/);
});

test('sun is centered by default and moon becomes visible in dark mode', () => {
  const scene = css.match(/#m3ez-divider-celestial-v1\s*\{([^}]+)\}/)?.[1] ?? '';
  assert.match(scene, /position:\s*absolute/);
  assert.match(scene, /left:\s*50%/);
  assert.match(scene, /transform:\s*translateX\(-50%\)/);
  assert.match(css, /#m3ez-divider-celestial-v1 \.divider-celestial-sun\s*\{[^}]*opacity:\s*\.58/s);
  assert.match(css, /#m3ez-divider-celestial-v1 \.divider-celestial-moon\s*\{[^}]*opacity:\s*0/s);
  assert.match(css, /:root\[data-theme="dark"\] #m3ez-divider-celestial-v1 \.divider-celestial-sun\s*\{[^}]*opacity:\s*0/s);
  assert.match(css, /:root\[data-theme="dark"\] #m3ez-divider-celestial-v1 \.divider-celestial-moon\s*\{[^}]*opacity:\s*\.78/s);
});

test('theme switch animates the celestial icons but honors reduced motion', () => {
  assert.match(css, /transition:\s*\n\s*opacity 560ms ease,\s*\n\s*transform 620ms cubic-bezier\(\.22, \.61, \.36, 1\),\s*\n\s*filter 560ms ease/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?#m3ez-divider-celestial-v1 svg\s*\{\s*transition:\s*none;/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?#m3ez-divider-celestial-v1\s*\{[^}]*width:\s*18px[^}]*height:\s*18px/s);
  assert.match(css, /@media print[\s\S]*?#m3ez-divider-celestial-v1\s*\{\s*display:\s*none;/);
});
