import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const css = readFileSync(new URL('../assets/portfolio-theme.css', import.meta.url), 'utf8');
const sceneURL = new URL('../assets/divider-scene.svg', import.meta.url);
const sceneBlock = css.match(/#top\.hero:has\(\+ #method\)::before\s*\{([^}]+)\}/)?.[1] ?? '';

test('mountains stay on the existing divider above Method without adding a line', () => {
  assert.ok(sceneBlock, 'scenery pseudo-element exists');
  for (const rule of ['position: absolute', 'bottom: 0', 'left: 0', 'right: 0', 'pointer-events: none']) {
    assert.ok(sceneBlock.includes(rule), rule);
  }
  assert.doesNotMatch(sceneBlock, /\bborder\s*:|\bposition:\s*fixed|\b(?:margin|padding):/);
});

test('external SVG alpha is tinted by the current theme, not hard-coded artwork colors', () => {
  assert.match(sceneBlock, /background:\s*var\(--black\)/);
  assert.match(sceneBlock, /mask-image:\s*url\("\.\/divider-scene\.svg"\)/);
  assert.match(sceneBlock, /mask-mode:\s*alpha/);
  assert.match(sceneBlock, /mask-size:\s*100% 100%/);
});

test('three low-opacity gradient ridges and sparse grass are passive local SVG', () => {
  assert.ok(existsSync(sceneURL), 'divider-scene.svg exists');
  const svg = readFileSync(sceneURL, 'utf8');
  assert.match(svg, /viewBox="0 0 1440 64"/);
  assert.match(svg, /preserveAspectRatio="none"/);
  assert.equal((svg.match(/data-ridge="/g) ?? []).length, 3);
  assert.equal((svg.match(/<linearGradient /g) ?? []).length, 3);
  assert.match(svg, /data-detail="grass"/);
  const alphas = [...svg.matchAll(/stop-opacity="([\d.]+)"/g)].map(([, n]) => Number(n));
  assert.ok(alphas.length >= 9);
  assert.ok(alphas.every(a => a >= 0 && a <= .055), 'each ridge remains very faint');
  assert.doesNotMatch(svg, /<script|<foreignObject|<image|<animate|<filter|\bon\w+=|\bhref=/i);
  assert.doesNotMatch(svg, /<line\b|data-detail="(?:ground|horizon)"/);
});

test('scene stays static, has a mobile height, and is removed for print', () => {
  assert.doesNotMatch(sceneBlock, /\banimation\s*:|\btransition\s*:/);
  assert.match(css, /@media \(max-width: 760px\)\s*\{\s*#top\.hero:has\(\+ #method\)::before\s*\{\s*height:\s*30px/s);
  assert.match(css, /@media print\s*\{\s*#top\.hero:has\(\+ #method\)::before\s*\{\s*content:\s*none/s);
});

test('the backpack walker gait and reduced-motion opt-out remain independent', () => {
  assert.match(css, /m3ez-divider-walk[^;]*steps\(16\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*#top\.hero:has\(\+ #method\)::after\s*\{\s*content:\s*none;\s*animation:\s*none/s);
  const addition = css.slice(css.indexOf('/* Soft mountain strip'));
  assert.doesNotMatch(addition, /#m3ez-theme-toggle|#m3ez-back-to-top|\.site-header|#top\.hero\s*>\s*\*/);
});
