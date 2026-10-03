import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const js = await readFile(new URL('../assets/portfolio-theme.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../assets/portfolio-theme.css', import.meta.url), 'utf8');

test('cyber background is a dedicated decorative canvas', () => {
  assert.match(js, /const BACKGROUND_ID = 'm3ez-cyber-background-v1'/);
  assert.match(js, /canvas\.setAttribute\('aria-hidden', 'true'\)/);
  assert.match(js, /document\.body\.prepend\(canvas\)/);
  assert.match(css, /#m3ez-cyber-background-v1\s*\{[^}]*position:\s*fixed[^}]*z-index:\s*0[^}]*pointer-events:\s*none/s);
});

test('page content stays above the background without changing the hero scene', () => {
  assert.match(css, /main,\s*\.site-footer\s*\{[^}]*position:\s*relative[^}]*z-index:\s*1/s);
  assert.match(css, /\.site-header\s*\{[^}]*z-index:\s*20/s);
  assert.doesNotMatch(css, /#m3ez-cyber-background-v1[^}]*background-image/);
});

test('background is sparse, interactive only visually, and motion-safe', () => {
  assert.match(js, /const labels = \['443', 'TLS', 'GET', 'SSH', 'CVE', 'AUTH', '0x7f'\]/);
  assert.match(js, /pointerActive/);
  assert.match(js, /function drawDotGrid/);
  assert.match(js, /function drawCrosshair/);
  assert.match(js, /function accent/);
  assert.match(js, /route:\/\/trust-boundary/);
  assert.match(js, /const cycle = 7200/);
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(css, /@media print\s*\{\s*#m3ez-cyber-background-v1\s*\{\s*display:\s*none/s);
});
