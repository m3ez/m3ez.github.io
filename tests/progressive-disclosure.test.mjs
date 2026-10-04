import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const themeJs = readFileSync(new URL('../assets/portfolio-theme.js', import.meta.url), 'utf8');
const themeCss = readFileSync(new URL('../assets/portfolio-theme.css', import.meta.url), 'utf8');
const redesign = readFileSync(new URL('../assets/portfolio-redesign.js', import.meta.url), 'utf8');
const disclosure = readFileSync(new URL('../assets/progressive-disclosure.js', import.meta.url), 'utf8');

test('landing bootstrap collapses extended content before first paint', () => {
  assert.match(themeJs, /root\.dataset\.portfolioExpanded\s*=\s*landingHash \? 'false' : 'true'/);
  assert.match(themeJs, /initialHash\.startsWith\('#method-'\)/);
  assert.match(themeCss, /:root\[data-portfolio-expanded="false"\] #method ~ \*/);
  assert.match(themeCss, /:root\[data-portfolio-expanded="false"\] \.site-footer/);
});

test('mobile hides Method and moves Explore while desktop keeps the Research destination', () => {
  assert.doesNotMatch(themeCss, /data-portfolio-expanded="false"[^}]*#top/);
  assert.match(themeCss, /@media \(max-width: 760px\)\s*\{\s*:root\[data-portfolio-expanded="false"\] #method\s*\{\s*display:\s*none !important/s);
  assert.match(disclosure, /HINT_ID\s*=\s*'m3ez-explore-more-v1'/);
  assert.match(disclosure, /hint\.href\s*=\s*mobileLayout\.matches \? '#method' : '#research'/);
  assert.match(disclosure, /const parent = mobileLayout\.matches \? hero : method/);
  assert.match(disclosure, /parent\.appendChild\(hint\)/);
  assert.match(themeCss, /#m3ez-explore-more-v1\s*\{/);
  assert.match(themeCss, /:root\[data-portfolio-expanded="true"\] #m3ez-explore-more-v1/);
});

test('same-page destinations reveal once without replacing carousel behavior', () => {
  assert.match(disclosure, /document\.addEventListener\('click',[\s\S]*closest\('a\[href\^="#"\]'\)/);
  assert.match(disclosure, /extendedRoots\.some\(section => section === target \|\| section\.contains\(target\)\)/);
  assert.match(disclosure, /root\.dataset\.portfolioExpanded = EXPANDED/);
  assert.doesNotMatch(disclosure, /preventDefault/);
  assert.doesNotMatch(disclosure, /credential-carousel|ROTATION_MS|m3ez-credential-carousel-v1/);
});

test('deep links and hash changes reveal hidden destinations', () => {
  assert.match(disclosure, /const initialTarget = targetFromHash\(window\.location\.hash\)/);
  assert.match(disclosure, /expand\(\{ animate: false \}\)/);
  assert.match(disclosure, /window\.addEventListener\('hashchange'/);
});

test('redesign initializes disclosure after hero actions are mounted', () => {
  assert.match(redesign, /import \{ initializeProgressiveDisclosure \} from '\.\/progressive-disclosure\.js';/);
  assert.match(
    redesign,
    /renderHeroProofLinks\(\);\s*initializeProgressiveDisclosure\(\);/,
  );
});

test('reveal uses a short motion transition and respects reduced motion', () => {
  assert.match(themeCss, /@keyframes m3ez-extended-content-reveal/);
  assert.match(themeCss, /animation:\s*m3ez-extended-content-reveal 520ms cubic-bezier\(\.22, 1, \.36, 1\) both/);
  assert.match(themeCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?m3ez-extended-content-reveal/s);
});
