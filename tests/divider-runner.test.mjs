import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const css = readFileSync(new URL('../assets/portfolio-theme.css', import.meta.url), 'utf8');
const spriteUrl = new URL('../assets/stickman-run-cycle.svg', import.meta.url);

test('runner is anchored to the hero divider immediately before Method', () => {
  assert.match(css, /#top\.hero:has\(\+\s*#method\)\s*\{[^}]*position:\s*relative/s);
  assert.match(css, /#top\.hero:has\(\+\s*#method\)::after\s*\{[^}]*position:\s*absolute[^}]*bottom:\s*0/s);
  assert.doesNotMatch(css, /body::before|m3ez-background-runner|\b(?:70|72|76|78)vh\b/);
});

test('runner is decorative, non-interactive and theme-aware', () => {
  assert.match(css, /#top\.hero:has\(\+\s*#method\)::after\s*\{[^}]*content:\s*""/s);
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /background:\s*var\(--black\)/);
  assert.match(css, /mask-image:\s*url\("\.\/stickman-run-cycle\.svg"\)/);
});

test('sixteen-pose gait and horizontal travel are separate animations', () => {
  assert.match(css, /m3ez-divider-stride[^;]*steps\(16\)/);
  assert.match(css, /@keyframes m3ez-divider-cross/);
  assert.match(css, /left:\s*calc\(100% - var\(--runner-width\)\)/);
  assert.match(css, /mask-position:\s*calc\(var\(--runner-width\) \* -16\) 0/);
});

test('motion preference and printing remove the decoration', () => {
  for (const query of ['prefers-reduced-motion: reduce', 'print']) {
    const start = css.indexOf(`@media ${query === 'print' ? query : `(${query})`}`, css.indexOf('/* Playful divider runner'));
    assert.notEqual(start, -1, query);
    assert.match(css.slice(start), /#top\.hero:has\(\+\s*#method\)::after\s*\{[^}]*content:\s*none;[^}]*animation:\s*none/s);
  }
});

test('sprite contains sixteen distinct articulated poses and no active content', () => {
  assert.ok(existsSync(spriteUrl), 'run-cycle SVG must exist');
  const svg = readFileSync(spriteUrl, 'utf8');
  assert.match(svg, /viewBox="0 0 640 48"/);
  assert.doesNotMatch(svg, /<script|<foreignObject|\bon\w+=|\bhref=/i);
  const frames = [...svg.matchAll(/<g data-frame="(\d+)"[^>]*>([\s\S]*?)<\/g>/g)];
  assert.equal(frames.length, 16);
  assert.equal(new Set(frames.map(([, , pose]) => pose)).size, 16);
  frames.forEach(([_, number, pose], i) => {
    assert.equal(Number(number), i);
    assert.equal((pose.match(/<circle /g) || []).length, 1);
    for (const limb of ['far-arm', 'near-arm', 'far-leg', 'near-leg']) {
      const path = pose.match(new RegExp(`<path data-limb="${limb}"[^>]*d="([^"]+)"`));
      assert.ok(path, `${limb} exists in frame ${i}`);
      assert.ok((path[1].match(/L/g) || []).length >= 2, `${limb} bends in frame ${i}`);
      const values = path[1].match(/-?\d+(?:\.\d+)?/g).map(Number);
      for (let n = 0; n < values.length; n += 2) {
        assert.ok(values[n] >= 1 && values[n] <= 39, `${limb} x stays in frame`);
        assert.ok(values[n + 1] >= 1 && values[n + 1] <= 47, `${limb} never penetrates divider`);
      }
    }
  });
});
