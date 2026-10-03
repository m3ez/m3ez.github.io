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
  assert.match(css, /#m3ez-divider-celestial-v1 \.divider-celestial-sun\s*\{[^}]*opacity:\s*\.34/s);
  assert.match(css, /#m3ez-divider-celestial-v1 \.divider-celestial-moon\s*\{[^}]*opacity:\s*0[^}]*translateY\(12px\)/s);
  assert.match(css, /:root\[data-theme="dark"\] #m3ez-divider-celestial-v1 \.divider-celestial-sun\s*\{[^}]*opacity:\s*0[^}]*translateY\(12px\)/s);
  assert.match(css, /:root\[data-theme="dark"\] #m3ez-divider-celestial-v1 \.divider-celestial-moon\s*\{[^}]*opacity:\s*\.48/s);
});

test('theme switch animates the celestial icons but honors reduced motion', () => {
  assert.match(css, /transition:\s*\n\s*opacity 520ms cubic-bezier\(\.4, 0, \.2, 1\),\s*\n\s*transform 760ms cubic-bezier\(\.22, 1, \.36, 1\),\s*\n\s*filter 620ms ease/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?#m3ez-divider-celestial-v1 svg\s*\{\s*transition:\s*none;/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?#m3ez-divider-celestial-v1\s*\{[^}]*width:\s*24px[^}]*height:\s*24px/s);
  assert.match(css, /@media print[\s\S]*?#m3ez-divider-celestial-v1\s*\{\s*display:\s*none;/);
});


test('day and night clouds use different silhouettes close to the celestial mark', () => {
  assert.match(js, /CLOUDS_ID\s*=\s*'m3ez-divider-clouds-v1'/);
  assert.match(js, /divider-cloud-day-1/);
  assert.match(js, /divider-cloud-day-2/);
  assert.match(js, /divider-cloud-night-1/);
  assert.match(js, /divider-cloud-night-2/);
  assert.match(js, /const dayCloud = .*fill="currentColor"/s);
  assert.match(js, /const nightCloud = .*fill="none".*stroke="currentColor"/s);
  assert.match(js, /clouds\.setAttribute\('aria-hidden',\s*'true'\)/);
  assert.match(js, /hero\.appendChild\(clouds\)/);

  const layer = css.match(/#m3ez-divider-clouds-v1\s*\{([^}]+)\}/)?.[1] ?? '';
  assert.match(layer, /position:\s*absolute/);
  assert.match(layer, /bottom:\s*0/);
  assert.match(layer, /height:\s*64px/);
  assert.match(layer, /pointer-events:\s*none/);
  assert.match(css, /divider-cloud-day-1[^}]*left:\s*44%/s);
  assert.match(css, /divider-cloud-day-2[^}]*left:\s*53%/s);
  assert.match(css, /divider-cloud-night-1[^}]*left:\s*45\.5%/s);
  assert.match(css, /divider-cloud-night-2[^}]*left:\s*54%/s);
});

test('cloud sets cross-fade and slide when the theme changes', () => {
  assert.match(css, /#m3ez-divider-clouds-v1 svg\s*\{[^}]*transition:\s*\n\s*opacity 680ms cubic-bezier\(\.4, 0, \.2, 1\),\s*\n\s*transform 820ms cubic-bezier\(\.22, 1, \.36, 1\)/s);
  assert.match(css, /\.divider-cloud-day\s*\{[^}]*opacity:\s*\.055[^}]*translate3d\(0, 0, 0\)/s);
  assert.match(css, /\.divider-cloud-night\s*\{[^}]*opacity:\s*0[^}]*translate3d\(5px, 4px, 0\)/s);
  assert.match(css, /:root\[data-theme="dark"\] #m3ez-divider-clouds-v1 \.divider-cloud-day\s*\{[^}]*opacity:\s*0[^}]*translate3d\(-5px, 4px, 0\)/s);
  assert.match(css, /:root\[data-theme="dark"\] #m3ez-divider-clouds-v1 \.divider-cloud-night\s*\{[^}]*opacity:\s*\.11[^}]*translate3d\(0, 0, 0\)/s);
});

test('day and night clouds drift independently while respecting reduced motion', () => {
  assert.match(css, /m3ez-cloud-day-a 12s ease-in-out infinite alternate/);
  assert.match(css, /m3ez-cloud-day-b 15s ease-in-out -5s infinite alternate/);
  assert.match(css, /m3ez-cloud-night-a 16s ease-in-out -3s infinite alternate/);
  assert.match(css, /m3ez-cloud-night-b 13s ease-in-out -7s infinite alternate/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?#m3ez-divider-clouds-v1 svg\s*\{\s*transition:\s*none;/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?#m3ez-divider-clouds-v1 \.divider-cloud-drift\s*\{[^}]*animation:\s*none[^}]*transform:\s*none/s);
  assert.match(css, /@media print[\s\S]*?#m3ez-divider-clouds-v1\s*\{\s*display:\s*none;/s);
});


test('cloud SVG canvases stay transparent and use tight viewBoxes', () => {
  assert.match(js, /divider-cloud-day-1[^>]*viewBox="2 7 40 19"/);
  assert.match(js, /divider-cloud-day-2[^>]*viewBox="2 7 40 19"/);
  assert.match(js, /divider-cloud-night-1[^>]*viewBox="2 8 40 12"/);
  assert.match(js, /divider-cloud-night-2[^>]*viewBox="2 8 40 12"/);
  assert.match(css, /#m3ez-divider-clouds-v1 svg\s*\{[^}]*background:\s*transparent[^}]*overflow:\s*visible/s);
  assert.match(css, /#m3ez-divider-celestial-v1 svg\s*\{[^}]*background:\s*transparent[^}]*overflow:\s*visible/s);
});
