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

test('back-to-top is icon-only while retaining its scroll-visibility rules', () => {
  const section = interactions.slice(interactions.indexOf('const MARKER = "m3ez-back-to-top-v1";'));
  const styles = section.match(/const css = `([\s\S]*?)`;/)?.[1];
  assert.ok(styles, 'back-to-top owns its injected stylesheet');
  const button = styles.match(/#\$\{MARKER\}\{([^}]+)\}/)?.[1];
  assert.ok(button);
  assert.match(button, /border:0;/, 'back-to-top must not have a border');
  assert.match(button, /background:transparent;/);
  assert.match(button, /box-shadow:none;/);
  assert.match(button, /color:var\(--black\);/);
  assert.match(button, /width:44px;height:44px;/);
  assert.match(button, /opacity:0;visibility:hidden;pointer-events:none;/);
  assert.match(button, /transition:opacity 120ms ease(?:;|$)/);
  assert.match(styles, /#\$\{MARKER\}\.is-visible\{opacity:1;visibility:visible;pointer-events:auto\}/);
  assert.match(styles, /#\$\{MARKER\}\.is-visible:hover\{opacity:\.65\}/);
  assert.match(styles, /#\$\{MARKER\}:focus-visible\{outline:2px solid var\(--black\);outline-offset:3px\}/);
  assert.doesNotMatch(styles, /background:var\(--(?:paper|black)\)/);
  assert.match(section, /const SHOW_AFTER = 200;/);
  assert.match(section, /button\.tabIndex = visible \? 0 : -1;/);
  assert.match(section, /behavior: reducedMotion\.matches \? "auto" : "smooth"/);
});
