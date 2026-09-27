import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const interactions = readFileSync(new URL('../assets/portfolio-interactions.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/research-credentials.css', import.meta.url), 'utf8');

test('primary navigation tracks the current portfolio section accessibly', () => {
  assert.match(interactions, /const ACTIVE_SECTION_IDS = \['research', 'credentials', 'consulting', 'contact'\]/);
  assert.match(interactions, /function syncActiveSection\(\)/);
  assert.match(interactions, /requestAnimationFrame\(syncActiveSection\)/);
  assert.match(interactions, /link\.setAttribute\('aria-current', 'location'\)/);
  assert.match(interactions, /link\.removeAttribute\('aria-current'\)/);
  assert.match(interactions, /window\.addEventListener\('scroll', scheduleActiveSection, \{ passive: true \}\)/);
  assert.match(interactions, /window\.addEventListener\('resize', scheduleActiveSection\)/);
});

test('active navigation uses a restrained underline without layout movement', () => {
  assert.match(css, /\.site-header nav>a\[href\^="#"\]\{border-bottom:1px solid transparent;transition:border-color 140ms ease\}/);
  assert.match(css, /\.site-header nav>a\[aria-current="location"\]\{border-bottom-color:var\(--black\)\}/);
  assert.match(css, /\.mobile-nav-panel a\[aria-current="location"\]\{text-decoration:underline/);
});

test('interactive controls get short tactile press feedback', () => {
  assert.match(css, /@keyframes tactile-press\{to\{translate:1px 1px;box-shadow:none\}\}/);
  assert.match(css, /:where\(\.filter-button,\.credential-carousel-arrow,\.mobile-nav-toggle,#m3ez-back-to-top-v1,\.primary-action\):active\{animation:tactile-press 70ms ease-out forwards\}/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{[\s\S]*?:where\(\.filter-button,\.credential-carousel-arrow,\.mobile-nav-toggle,#m3ez-back-to-top-v1,\.primary-action\):active\{animation:none;translate:none\}/);
});
