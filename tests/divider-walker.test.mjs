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

test('walker uses the backpack walking sprite and keeps the R-key toggle', () => {
  assert.match(css, /mask-image:\s*url\("\.\/stickman-walk-cycle\.svg\?v=20261003-2"\)/);
  assert.match(css, /:root\[data-divider-walker="active"\]/);
  assert.match(js, /event\.key\.toLowerCase\(\) !== 'r'/);
  assert.match(js, /root\.dataset\.dividerWalker = root\.dataset\.dividerWalker === 'active' \? 'inactive' : 'active'/);
  assert.doesNotMatch(css, /stickman-run-cycle\.svg/);
});

test('32 frames smooth the gait without speeding it up', () => {
  assert.match(css, /--walker-crossing:\s*48s/);
  assert.match(css, /--walker-cycle:\s*1\.52s/);
  assert.match(css, /--walker-crossing:\s*24s/);
  assert.match(css, /--walker-cycle:\s*1\.46s/);
  assert.match(css, /m3ez-divider-walk var\(--walker-cycle\) steps\(32\) infinite/);
  assert.match(css, /mask-size:\s*calc\(var\(--walker-width\) \* 32\) 100%/);
  assert.match(css, /mask-position:\s*calc\(var\(--walker-width\) \* -32\) 0/);
});

test('motion preference and printing remove the walker', () => {
  for (const query of ['prefers-reduced-motion: reduce', 'print']) {
    const start = css.indexOf(`@media ${query === 'print' ? query : `(${query})`}`, css.indexOf('/* Minimal divider walker'));
    assert.notEqual(start, -1, query);
    assert.match(css.slice(start), /#top\.hero:has\(\+\s*#method\)::after\s*\{[^}]*content:\s*none;[^}]*animation:\s*none/s);
  }
});

test('sprite has 32 coordinated poses and all body parts share the gait phase', () => {
  assert.ok(existsSync(spriteUrl), 'walk-cycle SVG must exist');
  const svg = readFileSync(spriteUrl, 'utf8');
  assert.match(svg, /viewBox="0 0 1280 48"/);
  assert.doesNotMatch(svg, /<script|<foreignObject|<image|<animate|<filter|\bon\w+=|\bhref=/i);

  const frames = [...svg.matchAll(/<g data-frame="(\d+)" data-phase="([^"]+)"[^>]*>([\s\S]*?)<\/g>/g)];
  assert.equal(frames.length, 32);
  assert.equal(new Set(frames.map(([, , , pose]) => pose)).size, 32);

  frames.forEach(([_, number, phase, pose], i) => {
    assert.equal(Number(number), i);
    assert.ok(Math.abs(Number(phase) - i / 32) < .01);
    assert.equal((pose.match(/data-head=/g) || []).length, 1);
    assert.equal((pose.match(/data-backpack=/g) || []).length, 1);
    assert.equal((pose.match(/data-strap=/g) || []).length, 1);
    for (const limb of ['far-arm', 'near-arm', 'far-leg', 'near-leg']) {
      assert.match(pose, new RegExp(`data-limb="${limb}"`), `${limb} exists in frame ${i}`);
    }
  });
});

test('leg flexion changes by phase instead of staying bent or staying rigid', () => {
  const svg = readFileSync(spriteUrl, 'utf8');
  const flex = [...svg.matchAll(/data-limb="near-leg"[^>]*data-knee-flex="([^"]+)"/g)].map(([, value]) => Number(value));
  assert.equal(flex.length, 32);
  assert.ok(Math.min(...flex) <= 7, 'stance can approach extension');
  assert.ok(Math.max(...flex) >= 55, 'swing has real knee flexion');
  assert.ok(new Set(flex.map(v => Math.round(v))).size >= 12, 'knee flex changes smoothly across the cycle');
});

test('arm swing opposes the matching leg at contact', () => {
  const svg = readFileSync(spriteUrl, 'utf8');
  const frame0 = svg.match(/<g data-frame="0"[^>]*>([\s\S]*?)<\/g>/)?.[1] ?? '';
  const nearLeg = frame0.match(/data-limb="near-leg"[^>]*d="M([^"]+)"/)?.[1] ?? '';
  const nearArm = frame0.match(/data-limb="near-arm"[^>]*d="M([^"]+)"/)?.[1] ?? '';
  const nums = value => value.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const leg = nums(nearLeg);
  const arm = nums(nearArm);
  assert.ok(leg[4] > leg[0], 'contact leg reaches forward');
  assert.ok(arm[4] < arm[0], 'same-side arm reaches backward');
});
