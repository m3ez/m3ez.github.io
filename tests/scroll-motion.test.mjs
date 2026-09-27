import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const motionUrl = new URL('../assets/scroll-motion.js', import.meta.url);
const motion = existsSync(motionUrl) ? readFileSync(motionUrl, 'utf8') : '';
const redesign = readFileSync(new URL('../assets/portfolio-redesign.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/research-credentials.css', import.meta.url), 'utf8');

test('scroll motion reveals portfolio sections once with reduced-motion fallback', () => {
  assert.match(redesign, /import \{ initializeScrollMotion \} from '\.\/scroll-motion\.js';/);
  assert.match(redesign, /renderCredentials\(\);\s*initializeScrollMotion\(\);\s*void renderResearch\(\);/);
  assert.match(motion, /#research, #recognition, #credentials, #method, #contact/);
  assert.match(motion, /new IntersectionObserver/);
  assert.match(motion, /observer\.unobserve\(entry\.target\)/);
  assert.match(motion, /prefers-reduced-motion: reduce/);
  assert.match(motion, /section\.classList\.add\('scroll-reveal'/);
  assert.match(motion, /section\.classList\.add\('is-visible'/);
});

test('scroll progress uses a lightweight requestAnimationFrame scroll listener', () => {
  assert.match(motion, /m3ez-scroll-progress-v1/);
  assert.match(motion, /document\.documentElement\.scrollHeight - window\.innerHeight/);
  assert.match(motion, /progress\.style\.transform = `scaleX\(\$\{ratio\}\)`/);
  assert.match(motion, /requestAnimationFrame\(syncProgress\)/);
  assert.match(motion, /\{ passive: true \}/);
});

test('section reveal is opacity-only and avoids moving large page regions', () => {
  const revealRule = css.match(/\.scroll-reveal\{([^}]*)\}/)?.[1] ?? '';
  const visibleRule = css.match(/\.scroll-reveal\.is-visible\{([^}]*)\}/)?.[1] ?? '';

  assert.match(revealRule, /opacity:0/);
  assert.match(revealRule, /transition:opacity 260ms/);
  assert.doesNotMatch(revealRule, /transform:/);
  assert.match(visibleRule, /opacity:1/);
  assert.doesNotMatch(visibleRule, /transform:/);
});

test('card and stat stagger stays short and capped for smooth scrolling', () => {
  assert.match(css, /\.scroll-reveal \.credential-grid-item,[\s\S]*?transform:translateY\(4px\);transition:opacity 220ms/);
  assert.match(css, /transition-delay:25ms/);
  assert.match(css, /transition-delay:50ms/);
  assert.match(css, /transition-delay:75ms/);
  assert.match(css, /transition-delay:100ms/);
  assert.match(css, /transition-delay:125ms/);
  assert.match(css, /\.credential-grid-item:nth-child\(n\+6\)\{transition-delay:125ms\}/);
  assert.doesNotMatch(css, /transition-delay:(?:150|200|250|300|350)ms/);
});

test('scroll CSS keeps anchor offsets and reduced-motion fallback', () => {
  assert.match(css, /html\{scroll-behavior:smooth;scroll-padding-top:4\.5rem\}/);
  assert.match(css, /#research,#recognition,#credentials,#method,#contact\{scroll-margin-top:4\.5rem\}/);
  assert.doesNotMatch(css, /\.scroll-reveal[^\n]*\.cve-row-v2/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{[\s\S]*?html\{scroll-behavior:auto\}/);
});

test('only CVE rows added by Show more receive the short entry animation', () => {
  assert.match(redesign, /function renderResearchRows\(container, items, animateFrom = items\.length\)/);
  assert.match(redesign, /if \(index >= animateFrom\) row\.classList\.add\('cve-row-enter'\)/);
  assert.match(redesign, /const revealFrom = rows\.querySelectorAll\('\.cve-row-v2'\)\.length/);
  assert.match(redesign, /refresh\(revealFrom\)/);
  assert.match(css, /\.cve-row-enter\{animation:cve-row-enter 140ms/);
  assert.match(css, /@keyframes cve-row-enter\{from\{opacity:0;transform:translateY\(3px\)\}to\{opacity:1;transform:none\}\}/);
});
