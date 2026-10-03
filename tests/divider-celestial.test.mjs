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
  assert.match(css, /#m3ez-divider-celestial-v1 \.divider-celestial-moon\s*\{[^}]*opacity:\s*0[^}]*translateY\(12px\)/s);
  assert.match(css, /:root\[data-theme="dark"\] #m3ez-divider-celestial-v1 \.divider-celestial-sun\s*\{[^}]*opacity:\s*0[^}]*translateY\(12px\)/s);
  assert.match(css, /:root\[data-theme="dark"\] #m3ez-divider-celestial-v1 \.divider-celestial-moon\s*\{[^}]*opacity:\s*\.78/s);
});

test('theme switch animates the celestial icons but honors reduced motion', () => {
  assert.match(css, /transition:\s*\n\s*opacity 520ms cubic-bezier\(\.4, 0, \.2, 1\),\s*\n\s*transform 760ms cubic-bezier\(\.22, 1, \.36, 1\),\s*\n\s*filter 620ms ease/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?#m3ez-divider-celestial-v1 svg\s*\{\s*transition:\s*none;/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?#m3ez-divider-celestial-v1\s*\{[^}]*width:\s*18px[^}]*height:\s*18px/s);
  assert.match(css, /@media print[\s\S]*?#m3ez-divider-celestial-v1\s*\{\s*display:\s*none;/);
});


test('three decorative clouds stay local to the divider and drift subtly', () => {
  assert.match(js, /CLOUDS_ID\s*=\s*'m3ez-divider-clouds-v1'/);
  assert.match(js, /divider-cloud-1/);
  assert.match(js, /divider-cloud-2/);
  assert.match(js, /divider-cloud-3/);
  assert.match(js, /clouds\.setAttribute\('aria-hidden',\s*'true'\)/);
  assert.match(js, /hero\.appendChild\(clouds\)/);

  const layer = css.match(/#m3ez-divider-clouds-v1\s*\{([^}]+)\}/)?.[1] ?? '';
  assert.match(layer, /position:\s*absolute/);
  assert.match(layer, /bottom:\s*0/);
  assert.match(layer, /height:\s*64px/);
  assert.match(layer, /pointer-events:\s*none/);
  assert.match(css, /m3ez-cloud-drift-a 11s ease-in-out infinite alternate/);
  assert.match(css, /m3ez-cloud-drift-b 14s ease-in-out -4s infinite alternate/);
  assert.match(css, /m3ez-cloud-drift-c 9s ease-in-out -2s infinite alternate/);
  assert.match(css, /translate3d\(-6px, 0, 0\)/);
  assert.match(css, /translate3d\(10px, -1px, 0\)/);
});

test('cloud motion respects reduced-motion and mobile keeps the scene sparse', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?#m3ez-divider-clouds-v1 svg\s*\{[^}]*animation:\s*none[^}]*transform:\s*none/s);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?#m3ez-divider-clouds-v1 \.divider-cloud-3\s*\{\s*display:\s*none;/s);
  assert.match(css, /@media print[\s\S]*?#m3ez-divider-clouds-v1\s*\{\s*display:\s*none;/s);
});
