import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const root = new URL('../', import.meta.url);
const sprite = new URL('assets/cat-walk-cycle.svg', root);
const readSprite = () => {
  assert.ok(existsSync(sprite), 'The articulated 64-pose cat sprite must exist');
  return readFileSync(sprite, 'utf8');
};
const frames = () => [...readSprite().matchAll(/<g data-frame="(\d+)"[^>]*>([\s\S]*?)<\/g>/g)].map(m => m[2]);
const legs = frame => [...frame.matchAll(/<path data-limb="([^"]+)" data-contact="([^"]+)"[^>]*d="([^"]+)"/g)].map(m => ({ name: m[1], contact: m[2] === 'true', points: m[3].match(/-?\d+(?:\.\d+)?/g).map(Number) }));

test('cat has 64 unique passive poses rather than a rigid two-pose swing', () => {
  const svg = readSprite();
  assert.match(svg, /viewBox="0 0 2816 28"/);
  assert.equal(frames().length, 64);
  assert.equal(new Set(frames()).size, 64);
  assert.doesNotMatch(svg, /<script|<foreignObject|<image|<animate|\bon\w+=|\bhref=/i);
});

test('all four legs articulate at a knee instead of rotating one straight piece', () => {
  for (const frame of frames()) {
    const joints = legs(frame);
    assert.equal(joints.length, 4);
    for (const leg of joints) assert.equal(leg.points.length, 10, 'root, elbow/stifle, wrist/hock, heel, and toe');
  }
  const kneeAngles = frames().map(f => {
    const p = legs(f).find(l => l.name === 'front-near').points;
    return Math.atan2(p[3] - p[1], p[2] - p[0]) - Math.atan2(p[5] - p[3], p[4] - p[2]);
  });
  assert.ok(Math.max(...kneeAngles) - Math.min(...kneeAngles) > .35, 'knee bends through the stride');
});

test('contact paws stay on the ground and recovery paws visibly lift', () => {
  const all = frames().flatMap(legs);
  for (const leg of all.filter(l => l.contact)) assert.ok(Math.abs(leg.points.at(-1) - 26.8) <= .01);
  assert.ok(all.some(l => !l.contact && l.points.at(-1) < 25), 'swing clears the divider');
  for (const frame of frames()) assert.ok(legs(frame).filter(l => l.contact).length >= 2, 'always supported, not hopping');
});

test('joint motion stays continuous across every pose including the loop boundary', () => {
  const all = frames().map(legs);
  for (let i = 0; i < all.length; i++) {
    const next = all[(i + 1) % all.length];
    for (let limb = 0; limb < 4; limb++) for (let j = 0; j < 10; j += 2) {
      const a = all[i][limb].points, b = next[limb].points;
      assert.ok(Math.hypot(a[j] - b[j], a[j+1] - b[j+1]) < 1.8, `no joint jump at frame ${i}`);
    }
  }
});

test('each pose has a broad rounded belly, cheeks, and a smoothly changing tail', () => {
  for (const frame of frames()) {
    assert.match(frame, /data-body="true"/);
    assert.match(frame, /data-head="true"/);
    assert.match(frame, /data-tail="true"/);
  }
  assert.equal(new Set(frames().map(f => f.match(/data-tail="true"[^>]*d="([^"]+)"/)[1])).size, 64);
});

test('the checked-in SVG exactly matches its development-only generator', () => {
  readSprite();
  const stdout = execFileSync(process.execPath, [new URL('automation/generate-cat-walk.mjs', root).pathname, '--stdout'], { encoding: 'utf8' });
  assert.equal(stdout, readSprite());
});
