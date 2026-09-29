import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const section = html.match(/<section\b[^>]*id="method"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? '';
const interactions = readFileSync(new URL('../assets/portfolio-interactions.js', import.meta.url), 'utf8');
const redesign = readFileSync(new URL('../assets/portfolio-redesign.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/research-credentials.css', import.meta.url), 'utf8');
const methodCss = css.slice(css.indexOf('/* Method:'));
const labels = ['Scope', 'Map', 'Trace', 'Analyze', 'Exploit', 'Verify', 'Document', 'Report'];

test('Method preserves all eight ordered stages in semantic static HTML', () => {
  assert.match(section, /<div class="method-workflow"/);
  assert.deepEqual([...section.matchAll(/<strong class="method-label">([^<]+)<\/strong>/g)].map(match => match[1]), labels);
  assert.equal((section.match(/class="method-detail"/g) ?? []).length, 8);
  assert.deepEqual([...section.matchAll(/<ol class="method-strip"[^>]*start="(\d+)"/g)].map(match => +match[1]), [1, 4, 7]);
});

test('Discover Test Deliver phases group the approved stages in order', () => {
  assert.deepEqual([...section.matchAll(/<h3 class="method-phase-title"[^>]*>([^<]+)<\/h3>/g)].map(match => match[1]), ['Discover', 'Test', 'Deliver']);
  const groups = [...section.matchAll(/<ol class="method-strip"[^>]*>([\s\S]*?)<\/ol>/g)].map(match => [...match[1].matchAll(/class="method-label">([^<]+)</g)].map(m => m[1]));
  assert.deepEqual(groups, [labels.slice(0, 3), labels.slice(3, 6), labels.slice(6)]);
});

test('Option 1 restores decorative mono numbers and square markers without node boxes', () => {
  assert.deepEqual([...section.matchAll(/class="method-step" aria-hidden="true">([^<]+)</g)].map(m => m[1]), ['01','02','03','04','05','06','07','08']);
  assert.equal((section.match(/class="method-marker"/g) ?? []).length, 8);
  assert.match(methodCss, /\.method-node\{[^}]*border:0[^}]*background:transparent/);
  assert.doesNotMatch(methodCss, /method-segment-flow|method-segment-edge/);
});

test('Option 1 has seven decorative signal tracks and no interactive/live-status nodes', () => {
  assert.equal((section.match(/class="method-signal"/g) ?? []).length, 7);
  assert.equal((section.match(/class="method-track" aria-hidden="true"/g) ?? []).length, 8);
  assert.doesNotMatch(section, /<button|<iframe|aria-live|tabindex|<canvas/i);
  assert.doesNotMatch(section, /class="method-(?:connector|arrow|pulse)"/);
});

test('Verify returns to Analyze through the labelled static dashed feedback path', () => {
  assert.match(section, /class="method-feedback" data-from="method-verify" data-to="method-analyze"/);
  assert.match(section, /Iterate if not reproducible/);
  assert.equal((section.match(/class="method-feedback-path"/g) ?? []).length, 2);
  assert.equal((section.match(/stroke-dasharray="3 4"/g) ?? []).length, 2);
});

test('the previous text-only Method writer cannot overwrite the diagram', () => {
  assert.doesNotMatch(interactions, /const METHOD_LINE\s*=/);
  assert.match(redesign, /import \{ initializeMethodWorkflow \} from '\.\/method-workflow\.js';/);
  assert.match(redesign, /initializeMethodWorkflow\(\);/);
});

test('Option 1 inherits the site palette instead of defining a separate dark theme', () => {
  for (const [local, shared] of [['bg', 'paper'], ['ink', 'ink'], ['muted', 'muted'], ['line', 'line']]) {
    assert.ok(methodCss.includes(`--method-${local}:var(--${shared})`), `${local} must follow the site's ${shared} token`);
  }
  assert.doesNotMatch(methodCss, /#[0-9a-f]{3,8}\b|\brgba?\(/i, 'Method colors must use shared tokens, including animation keyframes');
  assert.match(methodCss, /\.method-node-final \.method-marker\{[^}]*background:var\(--method-ink\)/);
  assert.doesNotMatch(methodCss, /\.method-node-final\{[^}]*background:var\(--black\)/);
});

test('motion loops on tracks and markers, with vertical travel and reduced-motion fallback', () => {
  assert.match(methodCss, /method-signal-travel[^;]*linear infinite/);
  assert.match(methodCss, /method-signal-down/);
  assert.match(methodCss, /prefers-reduced-motion:reduce/);
  assert.match(methodCss, /\.method-signal\{[^}]*animation:none!important/);
});


test('Method appears once directly after the hero and before Research in static HTML', () => {
  assert.equal((html.match(/id="method"/g) ?? []).length, 1);
  const start = html.indexOf('<section class="trace-section method-section" id="method"');
  const end = html.indexOf('</section>', start) + '</section>'.length;
  const hero = html.indexOf('id="top"');
  const research = html.indexOf('<section class="trace-section" id="research"');
  assert.ok(hero < start && start < research, 'Method must introduce Research, not remain near Contact');
  assert.equal(html.slice(end, research).trim(), '', 'Research follows Method directly without duplicate or spacer sections');
  assert.equal(html.indexOf('</section>', hero) + '</section>'.length, start,
    'Method follows the hero without depending on a JavaScript reorder');
});


test('Method ends with one shared-theme divider without adding a card frame', () => {
  assert.match(methodCss, /#method\.method-section\{[^}]*border:0;[^}]*border-bottom:1px solid var\(--line\)/,
    'Method needs a single bottom divider in the shared line color');
  assert.match(methodCss, /#method \+ #research\{[^}]*border-top:0/,
    'Research must not duplicate the Method divider on mobile');
});
