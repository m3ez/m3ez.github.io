import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../assets/portfolio-theme.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../assets/portfolio-theme.js', import.meta.url), 'utf8');

test('theme bootstrap mounts time-aware light, cloud and celestial layers in the hero', () => {
  assert.match(js, /LIGHT_ID\s*=\s*'m3ez-divider-light-v1'/);
  assert.match(js, /CLOUDS_ID\s*=\s*'m3ez-divider-clouds-v1'/);
  assert.match(js, /CELESTIAL_ID\s*=\s*'m3ez-divider-celestial-v1'/);
  assert.match(js, /function mountDividerLight\(\)/);
  assert.match(js, /function mountDividerClouds\(\)/);
  assert.match(js, /function mountDividerCelestial\(\)/);
  assert.match(js, /light\.setAttribute\('aria-hidden',\s*'true'\)/);
  assert.match(js, /clouds\.setAttribute\('aria-hidden',\s*'true'\)/);
  assert.match(js, /celestial\.setAttribute\('aria-hidden',\s*'true'\)/);
});

test('local time selects distinct sun and moon SVG variants', () => {
  for (const name of ['sunrise', 'morning', 'noon', 'sunset', 'evening', 'midnight', 'late-night']) {
    assert.match(js, new RegExp(`divider-celestial-${name}`));
    assert.match(css, new RegExp(`data-sky="${name}"`));
  }
  assert.match(js, /if \(hour >= 5 && hour < 7\) name = 'sunrise'/);
  assert.match(js, /else if \(hour >= 10 && hour < 15\) name = 'noon'/);
  assert.match(js, /else if \(hour >= 18 && hour < 21\) name = 'evening'/);
});

test('celestial body follows a shallow time-based arc with smooth position changes', () => {
  assert.match(js, /--celestial-x/);
  assert.match(js, /--celestial-rise/);
  assert.match(js, /--celestial-angle/);
  const scene = css.match(/#m3ez-divider-celestial-v1\s*\{([^}]+)\}/)?.[1] ?? '';
  assert.match(scene, /left:\s*var\(--celestial-x, 50%\)/);
  assert.match(scene, /bottom:\s*calc\(18px \+ var\(--celestial-rise, 12px\)\)/);
  assert.match(scene, /rotate\(var\(--celestial-angle, 0deg\)\)/);
  assert.match(scene, /left 1800ms cubic-bezier/);
  assert.match(scene, /bottom 1800ms cubic-bezier/);
});

test('theme auto mode follows local time but manual theme choice is independent from sky phase', () => {
  assert.match(js, /autoThemeEnabled/);
  assert.match(js, /autoTheme:\s*hour >= 6 && hour < 18 \? 'light' : 'dark'/);
  assert.match(js, /root\.dataset\.themeMode = autoThemeEnabled \? 'auto' : 'manual'/);
  assert.match(js, /root\.dataset\.skyPhase = state\.sunVisible \? 'sun' : 'moon'/);
  assert.match(js, /autoThemeEnabled = false;\s*applyTheme\(root\.dataset\.theme === 'dark' \? 'light' : 'dark'\)/s);
  assert.doesNotMatch(css, /data-theme="dark"[^\n]*divider-celestial/);
});

test('lighting and clouds follow the celestial position rather than the theme toggle', () => {
  assert.match(css, /#m3ez-divider-light-v1\s*\{[^}]*left:\s*var\(--celestial-x, 50%\)/s);
  assert.match(css, /:root\[data-sky-phase="moon"\] #m3ez-divider-light-v1/);
  assert.match(css, /divider-cloud-day-1[^}]*left:\s*calc\(var\(--celestial-x, 50%\) - 58px\)/s);
  assert.match(css, /divider-cloud-night-1[^}]*left:\s*calc\(var\(--celestial-x, 50%\) - 52px\)/s);
  assert.match(css, /:root\[data-sky-phase="sun"\][\s\S]*?divider-cloud-day/);
  assert.match(css, /:root\[data-sky-phase="moon"\][\s\S]*?divider-cloud-night/);
  assert.match(css, /brightness\(var\(--cloud-brightness, 1\)\)/);
  assert.match(css, /var\(--cloud-shadow-x, 0\)/);
});

test('day and night clouds retain distinct silhouettes and independent drift', () => {
  assert.match(js, /const dayCloud = .*fill="currentColor"/s);
  assert.match(js, /const nightCloud = .*fill="none".*stroke="currentColor"/s);
  assert.match(js, /divider-cloud-day-1[^>]*viewBox="2 7 40 19"/);
  assert.match(js, /divider-cloud-night-1[^>]*viewBox="2 8 40 12"/);
  assert.match(css, /m3ez-cloud-day-a 12s ease-in-out infinite alternate/);
  assert.match(css, /m3ez-cloud-day-b 15s ease-in-out -5s infinite alternate/);
  assert.match(css, /m3ez-cloud-night-a 16s ease-in-out -3s infinite alternate/);
  assert.match(css, /m3ez-cloud-night-b 13s ease-in-out -7s infinite alternate/);
});

test('sky decorations stay transparent and honor reduced motion, mobile and print', () => {
  assert.match(css, /#m3ez-divider-clouds-v1 svg\s*\{[^}]*background:\s*transparent[^}]*overflow:\s*visible/s);
  assert.match(css, /#m3ez-divider-celestial-v1 svg\s*\{[^}]*background:\s*transparent[^}]*overflow:\s*visible/s);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?#m3ez-divider-celestial-v1\s*\{[^}]*width:\s*24px[^}]*height:\s*24px/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?#m3ez-divider-light-v1,[\s\S]*?transition:\s*none;/s);
  assert.match(css, /@media print[\s\S]*?#m3ez-divider-light-v1,[\s\S]*?#m3ez-divider-celestial-v1\s*\{\s*display:\s*none;/s);
});
