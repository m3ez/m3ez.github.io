import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const motionUrl = new URL('../assets/scroll-motion.js', import.meta.url);
const motion = existsSync(motionUrl) ? readFileSync(motionUrl, 'utf8') : '';
const redesign = readFileSync(new URL('../assets/portfolio-redesign.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/research-credentials.css', import.meta.url), 'utf8');

test('scroll motion targets small elements instead of whole sections', () => {
  assert.match(redesign, /renderCredentials\(\);\s*initializeScrollMotion\(\);\s*void renderResearch\(\);/);
  assert.match(motion, /#research > \.section-heading/);
  assert.match(motion, /#recognition > \.section-heading/);
  assert.match(motion, /#credentials > \.section-heading/);
  assert.match(motion, /#method > h2/);
  assert.match(motion, /#method > \.method-line/);
  assert.match(motion, /#contact > \.section-heading/);
  assert.match(motion, /#contact > \.contact-actions/);
  assert.match(motion, /#contact > \.references/);
  assert.match(motion, /\.research-stat/);
  assert.match(motion, /\.credential-grid-item/);
  assert.match(motion, /target\.classList\.add\('scroll-reveal-item'\)/);
  assert.doesNotMatch(motion, /section\.classList\.add\('scroll-reveal'/);
});

test('scroll motion triggers as elements enter the viewport', () => {
  assert.match(motion, /new IntersectionObserver/);
  assert.match(motion, /threshold: 0\.08/);
  assert.match(motion, /rootMargin: '0px 0px 0px 0px'/);
  assert.match(motion, /observer\.unobserve\(entry\.target\)/);
  assert.match(motion, /prefers-reduced-motion: reduce/);
});

test('scroll progress keeps the lightweight requestAnimationFrame path', () => {
  assert.match(motion, /m3ez-scroll-progress-v1/);
  assert.match(motion, /document\.documentElement\.scrollHeight - window\.innerHeight/);
  assert.match(motion, /progress\.style\.transform = `scaleX\(\$\{ratio\}\)`/);
  assert.match(motion, /requestAnimationFrame\(syncProgress\)/);
  assert.match(motion, /\{ passive: true \}/);
});

test('reveal items visibly fade and lift into place', () => {
  const rule = css.match(/\.scroll-reveal-item\{([^}]*)\}/)?.[1] ?? '';
  assert.match(rule, /opacity:\.35/);
  assert.match(rule, /transform:translateY\(6px\)/);
  assert.match(rule, /transition:opacity 300ms/);
  assert.match(rule, /transform 300ms/);
  assert.match(rule, /transition-delay:var\(--reveal-delay,0ms\)/);
  assert.match(css, /\.scroll-reveal-item\.is-visible\{opacity:1;transform:none\}/);
  assert.doesNotMatch(css, /\.scroll-reveal\{opacity:/);
});

test('stagger is 25ms and capped at 100ms', () => {
  assert.match(motion, /Math\.min\(index \* 25, 100\)/);
  assert.match(motion, /--reveal-delay/);
  assert.doesNotMatch(css, /transition-delay:(?:125|150|200|250|300|350)ms/);
});

test('scroll CSS keeps anchor offsets and reduced-motion fallback', () => {
  assert.match(css, /html\{scroll-behavior:smooth;scroll-padding-top:4\.5rem\}/);
  assert.match(css, /#research,#recognition,#consulting,#credentials,#method,#contact\{scroll-margin-top:4\.5rem\}/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{[\s\S]*?html\{scroll-behavior:auto\}/);
  assert.match(css, /\.scroll-reveal-item\{opacity:1;transform:none;transition:none\}/);
});

test('only CVE rows added by Show more receive a fade-only animation', () => {
  assert.match(redesign, /function renderResearchRows\(container, items, animateFrom = items\.length\)/);
  assert.match(redesign, /if \(index >= animateFrom\) row\.classList\.add\('cve-row-enter'\)/);
  assert.match(redesign, /const revealFrom = rows\.querySelectorAll\('\.cve-row-v2'\)\.length/);
  assert.match(redesign, /refresh\(revealFrom\)/);
  assert.match(css, /\.cve-row-enter\{animation:cve-row-enter 120ms/);
  assert.match(css, /@keyframes cve-row-enter\{from\{opacity:\.9\}to\{opacity:1\}\}/);
  assert.doesNotMatch(css, /@keyframes cve-row-enter\{[^}]*transform:/);
});


test('desktop wheel input gets real requestAnimationFrame inertial scrolling', () => {
  assert.match(motion, /const DESKTOP_SCROLL_MEDIA = '\(pointer: fine\) and \(hover: hover\)'/);
  assert.match(motion, /function initializeInertialScroll\(reducedMotion\)/);
  assert.match(motion, /window\.addEventListener\('wheel', onWheel, \{ passive: false \}\)/);
  assert.match(motion, /event\.preventDefault\(\)/);
  assert.match(motion, /requestAnimationFrame\(step\)/);
  assert.match(motion, /currentY \+= \(targetY - currentY\) \* 0\.18/);
  assert.match(motion, /window\.scrollTo\(\{ top: currentY, behavior: 'instant' \}\)/);
  assert.match(motion, /targetY = Math\.min\(maxScroll\(\), Math\.max\(0, targetY \+ delta\)\)/);
});

test('inertial scrolling preserves native touch, zoom, nested scroll, and reduced-motion behavior', () => {
  assert.match(motion, /desktopInput\.matches && !reducedMotion\.matches/);
  assert.match(motion, /if \(event\.ctrlKey \|\| event\.metaKey\) return/);
  assert.match(motion, /function canNestedScrollerConsume\(target, delta\)/);
  assert.match(motion, /canNestedScrollerConsume\(event\.target, delta\)/);
  assert.match(motion, /function cancelInertia\(\)/);
  assert.match(motion, /touchstart/);
  assert.match(motion, /keydown/);
  assert.match(motion, /m3ezInertialScroll/);
});
