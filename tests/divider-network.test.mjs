import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const js = read('../assets/divider-network.js');
const css = read('../assets/divider-network.css');
const entry = read('../assets/portfolio-redesign.js');

test('the real enhancement entry initializes the network without blocking research data', () => {
  assert.match(entry, /import \{ initializeDividerNetwork \} from '\.\/divider-network\.js'/);
  assert.match(entry, /initializeDividerNetwork\(\);[\s\S]*void renderResearch\(\)/);
  assert.match(js, /new URL\('\.\/divider-network\.css', import\.meta\.url\)/);
  assert.match(js, /stylesheet\.addEventListener\('load', start, \{ once: true \}\)/);
  assert.match(js, /getElementById\('m3ez-edge-network-styles'\)/);
});

test('geometry is measured from real visible borders and randomizes only once per load', () => {
  assert.match(js, /getBoundingClientRect\(\)/);
  assert.match(js, /s\.borderBottomStyle !== 'solid'/);
  assert.match(js, /Math\.abs\(r\.left - left\) > 1/);
  assert.match(js, /Math\.round\(r\.bottom\)-source\.actualWidth\/2/);
  assert.match(js, /ResizeObserver\(scheduleLayout\)/);
  assert.match(js, /'data-portfolio-expanded'/);
  assert.doesNotMatch(js, /setInterval|setTimeout|<canvas|\.png|\.jpg|data:image|https?:\/\/(?!www\.w3\.org)/);
});

test('desktop-only wings never paint a panel or intercept input', () => {
  assert.match(css, /min-width: 1280px/);
  assert.match(js, /MIN_SPACE = 72/);
  assert.match(css, /--edge-max-width: 380/);
  assert.match(css, /pointer-events: none/);
  assert.match(css, /background: transparent/);
  assert.match(css, /contain: layout paint/);
  assert.match(js, /setAttribute\('aria-hidden', 'true'\)/);
  assert.doesNotMatch(css, /(?:^|\n)(?:body|html|main|\.site-header)\s*\{/);
});

test('smooth strokes and static accessible fallbacks are preserved', () => {
  assert.match(css, /stroke-linecap: round/);
  assert.match(css, /stroke-linejoin: round/);
  assert.match(css, /vector-effect: non-scaling-stroke/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /forced-colors: active/);
  assert.match(css, /print/);
  assert.match(css, /\[data-offscreen="true"\]/);
  assert.match(js, /document\.hidden/);
});
