import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../assets/research-credentials.css', import.meta.url), 'utf8');

test('tablet layout keeps the landing page single-column and controls horizontally scrollable', () => {
  assert.match(css, /@media \(max-width:760px\)\{[\s\S]*?\.section-heading,.method-section,.balanced-sections,.disclosure-list\{[^}]*grid-template-columns:1fr/);
  assert.match(css, /@media \(max-width:760px\)\{[\s\S]*?\.filter-row\{[^}]*flex-wrap:nowrap[^}]*overflow-x:auto/);
  assert.match(css, /@media \(max-width:760px\)\{[\s\S]*?\.filter-button\{[^}]*flex:0 0 auto[^}]*min-height:44px/);
  assert.match(css, /@media \(max-width:760px\)\{[\s\S]*?\.site-footer\{[^}]*flex-direction:column/);
});

test('mobile CVE rows use ID severity score on the first line and summary below', () => {
  assert.match(css, /@media \(max-width:760px\)\{[\s\S]*?\.cve-row-v2\{[^}]*grid-template-columns:minmax\(0,1fr\) auto auto/);
  assert.match(css, /@media \(max-width:760px\)\{[\s\S]*?\.cve-id-v2\{[^}]*grid-column:1[^}]*grid-row:1/);
  assert.match(css, /@media \(max-width:760px\)\{[\s\S]*?\.severity-chip\{[^}]*grid-column:2[^}]*grid-row:1/);
  assert.match(css, /@media \(max-width:760px\)\{[\s\S]*?\.cve-score-v2\{[^}]*grid-column:3[^}]*grid-row:1/);
  assert.match(css, /@media \(max-width:760px\)\{[\s\S]*?\.cve-summary-v2\{[^}]*grid-column:1\/-1[^}]*grid-row:2/);
});

test('phone layout uses one credential card per row and full-width primary actions', () => {
  assert.match(css, /@media \(max-width:560px\)\{[\s\S]*?\.credential-grid-v2\{[^}]*grid-template-columns:1fr/);
  assert.match(css, /@media \(max-width:560px\)\{[\s\S]*?\.proof-links\{[^}]*display:grid[^}]*grid-template-columns:1fr/);
  assert.match(css, /@media \(max-width:560px\)\{[\s\S]*?\.primary-action\{[^}]*width:100%[^}]*justify-content:center/);
  assert.match(css, /@media \(max-width:560px\)\{[\s\S]*?#m3ez-credential-carousel-v1 \.credential-carousel-stage\{[^}]*height:/);
});
