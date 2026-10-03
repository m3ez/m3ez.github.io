import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../assets/portfolio-theme.css', import.meta.url), 'utf8');

test('minimal cyber background uses section-local monochrome tokens', () => {
  assert.match(css, /--cyber-grid-line:\s*rgba\(0, 0, 0, \.032\)/);
  assert.match(css, /:root\[data-theme="dark"\][\s\S]*?--cyber-grid-line:\s*rgba\(255, 255, 255, \.038\)/);
  assert.match(css, /#method,[\s\S]*?#research,[\s\S]*?#recognition,[\s\S]*?#consulting\s*\{[\s\S]*?background-color:\s*var\(--paper\)/);
});

test('method gets a faint technical grid while hero remains untouched', () => {
  assert.match(css, /#method\s*\{[\s\S]*?64px 64px,[\s\S]*?64px 64px;/);
  assert.doesNotMatch(css, /#top\.hero[^{]*\{[^}]*background-image:/s);
});

test('research gets sparse signal points, traces and one slow scan pulse', () => {
  assert.match(css, /#research\s*\{[\s\S]*?radial-gradient\(circle at 13% 16%/);
  assert.match(css, /linear-gradient\(90deg, transparent 0 15%, var\(--cyber-trace\) 15% 26%, transparent 26% 100%\)/);
  assert.match(css, /#research::before\s*\{[\s\S]*?animation:\s*m3ez-cyber-scan 18s/);
  assert.match(css, /@keyframes m3ez-cyber-scan/);
  assert.match(css, /#research > \*\s*\{[\s\S]*?z-index:\s*1/);
});

test('recognition and consulting stay restrained while credentials and contact remain clean', () => {
  assert.match(css, /#recognition\s*\{[\s\S]*?128px 128px/);
  assert.match(css, /#consulting\s*\{[\s\S]*?var\(--cyber-trace\)/);
  assert.match(css, /#credentials,[\s\S]*?#contact\s*\{\s*background-image:\s*none;/);
});

test('cyber background respects mobile, reduced motion and print', () => {
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?#method\s*\{[\s\S]*?48px 48px/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?#research::before\s*\{[\s\S]*?animation:\s*none;[\s\S]*?display:\s*none;/);
  assert.match(css, /@media print[\s\S]*?#method,[\s\S]*?#contact\s*\{[\s\S]*?background-image:\s*none !important;/);
});
