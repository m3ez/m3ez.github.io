import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const section = html.match(/<section\b[^>]*id="method"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? '';
const interactions = readFileSync(new URL('../assets/portfolio-interactions.js', import.meta.url), 'utf8');
const redesign = readFileSync(new URL('../assets/portfolio-redesign.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/research-credentials.css', import.meta.url), 'utf8');
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

test('segmented nodes restore small mono numbers and mark Report as the endpoint', () => {
  assert.deepEqual([...section.matchAll(/class="method-step" aria-hidden="true">(\d+)</g)].map(match => match[1]), ['01','02','03','04','05','06','07','08']);
  assert.equal((section.match(/method-node-final/g) ?? []).length, 1);
  assert.match(section, /class="method-node method-node-final"[^>]*>[\s\S]*?class="method-label">Report</);
  assert.match(css, /\.method-node-final\{[^}]*background:var\(--black\)/);
});

test('the main strip has no inter-node arrows or loose data particles', () => {
  assert.doesNotMatch(section, /class="method-(?:connector|arrow|pulse)"/);
  assert.doesNotMatch(section, /<button|<iframe|aria-live|tabindex|<canvas/i);
});

test('Verify returns to Analyze through a labelled decorative dashed feedback path', () => {
  assert.match(section, /class="method-feedback" data-from="method-verify" data-to="method-analyze"/);
  assert.match(section, /Iterate if not reproducible/);
  assert.equal((section.match(/class="method-feedback-path"/g) ?? []).length, 2);
  assert.equal((section.match(/stroke-dasharray="3 4"/g) ?? []).length, 2);
  assert.equal((section.match(/aria-hidden="true" focusable="false"/g) ?? []).length, 2);
});

test('the previous text-only Method writer cannot overwrite the diagram', () => {
  assert.doesNotMatch(interactions, /const METHOD_LINE\s*=/);
  assert.match(redesign, /import \{ initializeMethodWorkflow \} from '\.\/method-workflow\.js';/);
  assert.match(redesign, /initializeMethodWorkflow\(\);/);
});

test('motion is scoped to node highlights and respects reduced motion', () => {
  const methodCss = css.slice(css.indexOf('/* Method:'));
  assert.match(methodCss, /linear infinite/);
  assert.match(methodCss, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(methodCss, /method-arrow-flow|method-pulse-flow/);
});
