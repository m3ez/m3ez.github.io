import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../assets/research-credentials.css', import.meta.url), 'utf8');
const marker = '/* Editorial section heading system. */';
const editorialStart = css.indexOf(marker);
const editorial = editorialStart >= 0 ? css.slice(editorialStart) : '';

test('section headings use one clean editorial content axis', () => {
  assert.ok(editorialStart >= 0, 'editorial heading CSS block should exist');
  assert.doesNotMatch(editorial, /counter-reset|counter-increment|decimal-leading-zero/);
  assert.match(editorial, /#content \.trace-section>\.section-heading\{[\s\S]*?grid-template-columns:minmax\(0,1fr\)/);
  assert.match(editorial, />\.section-heading>h2\{[\s\S]*?grid-column:1;[\s\S]*?grid-row:1/);
  assert.match(editorial, />\.section-heading>p,[\s\S]*?>\.section-heading>\.consulting-intro\{[\s\S]*?grid-column:1;[\s\S]*?grid-row:2/);
  assert.match(editorial, /border-bottom:\.5px solid var\(--line\)/);
});

test('credentials metadata stays inside the shared heading axis', () => {
  assert.match(editorial, /#credentials>\.section-heading>\.credential-total\{[\s\S]*?grid-column:1;[\s\S]*?grid-row:1/);
  assert.match(editorial, /#credentials>\.section-heading>h2\{padding-right:9rem\}/);
});

test('consulting subsection headings remain quiet mono labels with a hairline', () => {
  assert.match(editorial, /\.consulting-subsection-heading\{[\s\S]*?grid-template-columns:1fr/);
  assert.match(editorial, /\.consulting-subsection-heading h3\{[\s\S]*?text-transform:uppercase/);
  assert.match(editorial, /\.consulting-subsection-heading h3::after\{[\s\S]*?height:1px;[\s\S]*?background:var\(--line\)/);
});

test('mobile keeps the same single-axis heading layout and stacks credential metadata', () => {
  assert.match(editorial, /@media \(max-width:760px\)\{[\s\S]*?grid-template-columns:minmax\(0,1fr\)/);
  assert.match(editorial, /#credentials>\.section-heading>\.credential-total\{[\s\S]*?grid-column:1;[\s\S]*?grid-row:3/);
});


test('research keeps only the shared heading divider', () => {
  assert.match(css, /\.cve-ledger>section\.research-index-v2\{border-top:0;margin-top:0;padding-top:0\}/);
});


test('section intros use available desktop width without forced nowrap', () => {
  assert.match(editorial, />\.section-heading>p,[\s\S]*?>\.section-heading>\.consulting-intro\{[\s\S]*?max-width:none/);
  assert.doesNotMatch(editorial, /white-space:nowrap/);
  assert.match(editorial, /#consulting \.consulting-intro\{max-width:none\}/);
});


test('consulting intro clears inherited paragraph width', () => {
  assert.match(editorial, /#consulting \.consulting-intro p\{max-width:none;color:var\(--muted\)\}/);
});


test('copy measures stay fluid and object-scoped', () => {
  assert.match(css, /#consulting \.consulting-intro\{min-width:0;max-width:none\}/);
  assert.match(css, /\.consulting-subsection-heading p\{max-width:none;/);
  assert.match(css, /\.consulting-service dd\{[^}]*width:100%;[^}]*max-width:none/);
  assert.match(css, /\.consulting-service \.capability-output span\{[^}]*flex:1 1 0;[^}]*max-width:none/);
  assert.match(css, /\.credential-proof\{max-width:min\(100%,24ch\)/);
});


test('consulting privacy note aligns to the right', () => {
  assert.match(css, /\.consulting-privacy\{[^}]*text-align:right/);
});


test('scope keeps one bottom divider', () => {
  assert.match(css, /\.consulting-scope\{[^}]*border-bottom:0/);
  assert.match(css, /\.consulting-scope-grid\{[^}]*border-bottom:\.5px solid var\(--line\)/);
});


test('consulting focus detail spans available width', () => {
  assert.match(editorial, /\.consulting-subsection-heading p\{[\s\S]*?width:100%;[\s\S]*?min-width:0;[\s\S]*?max-width:none;[\s\S]*?justify-self:stretch/);
  assert.doesNotMatch(editorial, /\.consulting-subsection-heading p\{[^}]*white-space:nowrap/);
});


test('consulting service content expands responsively', () => {
  assert.match(css, /\.consulting-service-list>\.consulting-service\{[^}]*grid-template-columns:6\.25rem minmax\(0,1fr\)/);
  assert.match(css, /\.consulting-service dd\{[^}]*width:100%;[^}]*max-width:none/);
  assert.match(css, /\.consulting-service \.capability-output span\{[^}]*flex:1 1 0;[^}]*max-width:none/);
  assert.match(css, /@media \(max-width:760px\)\{[\s\S]*?\.consulting-service-list>\.consulting-service\{grid-template-columns:1fr/);
});


test('consulting service copy uses the full content column', () => {
  assert.match(css, /\.consulting-service dd\{[^}]*width:100%;[^}]*min-width:0;[^}]*max-width:none/);
  assert.match(css, /\.consulting-service \.capability-output span\{[^}]*flex:1 1 0;[^}]*min-width:0;[^}]*max-width:none/);
});


test('consulting service node sits before the title text', () => {
  assert.match(css, /\.consulting-service dt\{[^}]*display:flex;[^}]*gap:\.5rem/);
  assert.match(css, /\.consulting-service dt::before\{[^}]*position:static;[^}]*flex:0 0 auto/);
  assert.doesNotMatch(css, /\.consulting-service dt::before\{[^}]*left:-/);
});


test('consulting title node has a slow reduced-motion-safe heartbeat', () => {
  assert.match(css, /\.consulting-service dt::before\{[^}]*animation:consulting-node-heartbeat 3\.6s ease-in-out infinite/);
  assert.match(css, /@keyframes consulting-node-heartbeat\{[\s\S]*?5%\{transform:scale\(1\.32\)[\s\S]*?14%\{transform:scale\(1\.18\)/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{[^}]*\.consulting-service dt::before\{animation:none;transform:none;box-shadow:none\}/);
});


test('consulting node scales with title cap height', () => {
  assert.match(css, /\.consulting-service dt::before\{[^}]*align-self:center;[^}]*width:\.72em;height:\.72em/);
  assert.doesNotMatch(css, /\.consulting-service dt::before\{[^}]*width:7px;height:7px/);
});


test('consulting step labels align with the title node row', () => {
  assert.match(css, /\.consulting-service::before\{[^}]*grid-column:1;[^}]*grid-row:1;[^}]*align-self:center;[^}]*justify-self:center;[^}]*text-align:center/);
  assert.doesNotMatch(css, /\.consulting-service::before\{[^}]*grid-row:1 \/ span 3/);
  assert.match(css, /@media \(max-width:760px\)\{[\s\S]*?\.consulting-service::before\{[^}]*grid-row:auto;[^}]*align-self:start/);
});


test('consulting step label gets desktop optical centering', () => {
  assert.match(css, /\.consulting-service::before\{[^}]*transform:translateY\(1\.5px\)/);
  assert.match(css, /@media \(max-width:760px\)\{[\s\S]*?\.consulting-service::before\{[^}]*transform:none/);
});
