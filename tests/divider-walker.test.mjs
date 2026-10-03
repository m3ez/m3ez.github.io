import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const css = readFileSync(new URL('../assets/portfolio-theme.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../assets/portfolio-theme.js', import.meta.url), 'utf8');
const spriteUrl = new URL('../assets/stickman-walk-cycle.svg', import.meta.url);

test('walker is anchored to the hero divider immediately before Method', () => {
  assert.match(css, /#top\.hero:has\(\+\s*#method\)\s*\{[^}]*position:\s*relative/s);
  assert.match(css, /#top\.hero:has\(\+\s*#method\)::after\s*\{[^}]*position:\s*absolute[^}]*bottom:\s*0/s);
  assert.doesNotMatch(css, /body::before|m3ez-background-runner|\b(?:70|72|76|78)vh\b/);
});

test('walker uses the new backpack walking sprite and keeps the R-key toggle', () => {
  assert.match(css, /mask-image:\s*url\("\.\/stickman-walk-cycle\.svg"\)/);
  assert.match(css, /:root\[data-divider-walker="active"\]/);
  assert.match(js, /event\.key\.toLowerCase\(\) !== 'r'/);
  assert.match(js, /root\.dataset\.dividerWalker = root\.dataset\.dividerWalker === 'active' \? 'inactive' : 'active'/);
  assert.doesNotMatch(css, /stickman-run-cycle\.svg/);
});

test('walking cadence is slower than the old running animation', () => {
  assert.match(css, /--walker-crossing:\s*36s/);
  assert.match(css, /--walker-cycle:\s*1\.2s/);
  assert.match(css, /m3ez-divider-walk-cross var\(--walker-crossing\) linear infinite/);
  assert.match(css, /m3ez-divider-walk var\(--walker-cycle\) steps\(16\) infinite/);
  assert.match(css, /left:\s*calc\(100% - var\(--walker-width\)\)/);
  assert.match(css, /mask-position:\s*calc\(var\(--walker-width\) \* -16\) 0/);
});

test('motion preference and printing remove the walker', () => {
  for (const query of ['prefers-reduced-motion: reduce', 'print']) {
    const start = css.indexOf(`@media ${query === 'print' ? query : `(${query})`}`, css.indexOf('/* Minimal divider walker'));
    assert.notEqual(start, -1, query);
    assert.match(css.slice(start), /#top\.hero:has\(\+\s*#method\)::after\s*\{[^}]*content:\s*none;[^}]*animation:\s*none/s);
  }
});

test('sprite contains sixteen distinct walking poses with a backpack', () => {
  assert.ok(existsSync(spriteUrl), 'walk-cycle SVG must exist');
  const svg = readFileSync(spriteUrl, 'utf8');
  assert.match(svg, /viewBox="0 0 640 48"/);
  assert.doesNotMatch(svg, /<script|<foreignObject|<image|<animate|<filter|\bon\w+=|\bhref=/i);
  const frames = [...svg.matchAll(/<g data-frame="(\d+)"[^>]*>([\s\S]*?)<\/g>/g)];
  assert.equal(frames.length, 16);
  assert.equal(new Set(frames.map(([, , pose]) => pose)).size, 16);

  frames.forEach(([_, number, pose], i) => {
    assert.equal(Number(number), i);
    assert.equal((pose.match(/data-head=/g) || []).length, 1);
    assert.equal((pose.match(/data-backpack=/g) || []).length, 1);
    assert.equal((pose.match(/data-strap=/g) || []).length, 1);
    for (const limb of ['far-arm', 'near-arm', 'far-leg', 'near-leg']) {
      const path = pose.match(new RegExp(`<path data-limb="${limb}"[^>]*d="([^"]+)"`));
      assert.ok(path, `${limb} exists in frame ${i}`);
      assert.ok((path[1].match(/L/g) || []).length >= 2, `${limb} articulates in frame ${i}`);
    }
  });
});
