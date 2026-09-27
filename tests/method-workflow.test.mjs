import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const section = html.match(/<section\b[^>]*id="method"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? '';
const interactions = readFileSync(new URL('../assets/portfolio-interactions.js', import.meta.url), 'utf8');
const redesign = readFileSync(new URL('../assets/portfolio-redesign.js', import.meta.url), 'utf8');
const labels = ['Scope', 'Map', 'Trace', 'Analyze', 'Exploit', 'Verify', 'Document', 'Report'];

test('Method contains the complete ordered workflow in static HTML', () => {
  assert.match(section, /<ol\b[^>]*class="method-workflow"/);
  assert.deepEqual([...section.matchAll(/<strong class="method-label">([^<]+)<\/strong>/g)].map(match => match[1]), labels);
  assert.equal((section.match(/class="method-detail"/g) ?? []).length, 8);
});

test('Method uses seven decorative connectors rather than interactive or live-status controls', () => {
  assert.equal((section.match(/class="method-connector" aria-hidden="true"/g) ?? []).length, 7);
  assert.doesNotMatch(section, /<button|<iframe|aria-live|tabindex|<canvas/i);
});

test('the previous text-only Method writer cannot overwrite the diagram', () => {
  assert.doesNotMatch(interactions, /const METHOD_LINE\s*=/);
  assert.match(redesign, /import \{ initializeMethodWorkflow \} from '\.\/method-workflow\.js';/);
  assert.match(redesign, /initializeMethodWorkflow\(\);/);
});


test('Method arrows use crisp SVG shafts and filled arrowheads in the static fallback', () => {
  assert.equal((section.match(/class="method-arrow"/g) ?? []).length, 7);
  assert.equal((section.match(/class="method-arrow-shaft"/g) ?? []).length, 7);
  assert.equal((section.match(/class="method-arrow-head"/g) ?? []).length, 7);
  assert.equal((section.match(/vector-effect="non-scaling-stroke"/g) ?? []).length, 7);
});
