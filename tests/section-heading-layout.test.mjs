import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../assets/research-credentials.css', import.meta.url), 'utf8');
const marker = '/* Editorial section heading system. */';
const editorialStart = css.indexOf(marker);
const editorial = editorialStart >= 0 ? css.slice(editorialStart) : '';

test('section headings use one numbered editorial rail', () => {
  assert.ok(editorialStart >= 0, 'editorial heading CSS block should exist');
  assert.match(editorial, /#content\{counter-reset:portfolio-section\}/);
  assert.match(editorial, /#content \.trace-section>\.section-heading\{[\s\S]*?grid-template-columns:3\.25rem minmax\(0,1fr\)/);
  assert.match(editorial, /counter\(portfolio-section,decimal-leading-zero\)/);
  assert.match(editorial, />\.section-heading>h2\{[\s\S]*?grid-column:2;[\s\S]*?grid-row:1/);
  assert.match(editorial, />\.section-heading>p,[\s\S]*?>\.section-heading>\.consulting-intro\{[\s\S]*?grid-column:2;[\s\S]*?grid-row:2/);
  assert.match(editorial, /border-bottom:\.5px solid var\(--line\)/);
});

test('credentials metadata stays inside the shared heading content column', () => {
  assert.match(editorial, /#credentials>\.section-heading>\.credential-total\{[\s\S]*?grid-column:2;[\s\S]*?grid-row:1/);
  assert.match(editorial, /#credentials>\.section-heading>h2\{padding-right:9rem\}/);
});

test('consulting subsection headings are quiet mono labels with a hairline', () => {
  assert.match(editorial, /\.consulting-subsection-heading\{[\s\S]*?grid-template-columns:1fr/);
  assert.match(editorial, /\.consulting-subsection-heading h3\{[\s\S]*?text-transform:uppercase/);
  assert.match(editorial, /\.consulting-subsection-heading h3::after\{[\s\S]*?height:1px;[\s\S]*?background:var\(--line\)/);
});

test('mobile keeps the section number in a narrow rail and stacks credential metadata', () => {
  assert.match(editorial, /@media \(max-width:760px\)\{[\s\S]*?grid-template-columns:2\.35rem minmax\(0,1fr\)/);
  assert.match(editorial, /#credentials>\.section-heading>\.credential-total\{[\s\S]*?grid-column:2;[\s\S]*?grid-row:3/);
});
