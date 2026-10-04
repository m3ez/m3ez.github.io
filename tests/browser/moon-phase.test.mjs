import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// An isolated hero fixture uses the production script and unmodified stylesheet.
// No portfolio data requests or unrelated enhancement modules are needed here.
const fixture = `<!doctype html><html><head><meta name="viewport" content="width=device-width">
<script src="/assets/portfolio-theme.js"></script>
<style>:root{--paper:#fff;--black:#000;--ink:#111;--line:#ddd}
body{margin:0;background:var(--paper);color:var(--ink);font:16px sans-serif}
main{margin:24px auto;width:calc(100% - 48px);max-width:1080px}
#top{height:260px;border-bottom:1px solid var(--line)}
#top.hero::before,#top.hero::after{content:none!important}
</style><link rel="stylesheet" href="/assets/portfolio-theme.css"></head>
<body><main><section id="top" class="hero"><h1>Divider moon</h1></section><section id="method"><h2>Method</h2></section></main></body></html>`;
let browser, html;
const moonSelector = '.divider-celestial-moon';
before(async () => {
  const js = await readFile(new URL('../../assets/portfolio-theme.js', import.meta.url));
  const css = await readFile(new URL('../../assets/portfolio-theme.css', import.meta.url));
  // Inline the exact production assets so this component suite works offline.
  html = fixture.replace('<script src="/assets/portfolio-theme.js"></script>', () => `<script>${js}</script>`)
    .replace('<link rel="stylesheet" href="/assets/portfolio-theme.css">', () => `<style>${css}</style>`);
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, headless: true });
});
after(async () => { await browser?.close(); });

async function load(page, { instant = '2024-04-23T23:49:00Z', hour = 22, theme } = {}) {
  await page.evaluate(({ instant, hour }) => {
    window.__moonTestClock = { now: new Date(instant).getTime(), hour };
    const RealDate = Date;
    class Clock extends RealDate {
      constructor(...args) { super(...(args.length ? args : [window.__moonTestClock.now])); }
      static now() { return window.__moonTestClock.now; }
      getHours() { return window.__moonTestClock.hour ?? super.getHours(); }
    }
    window.Date = Clock;
  }, { instant, hour });
  await page.setContent(html);
  await page.waitForSelector('.divider-moon-lit', { state: 'attached' });
  if (theme && await page.locator('html').getAttribute('data-theme') !== theme) {
    await page.locator('#m3ez-theme-toggle-v1').click();
  }
}

for (const width of [320, 390, 768, 1440]) {
  for (const theme of ['light', 'dark']) {
    test(`real SVG stays transparent and noninteractive in ${theme}, ${width}px`, async () => {
      const page = await browser.newPage({ viewport: { width, height: 700 }, reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      try {
        await load(page, { theme });
        assert.equal(await page.locator(moonSelector).count(), 1);
        assert.equal(await page.locator('#m3ez-divider-celestial-v1 svg').count(), 5);
        const state = await page.locator(moonSelector).evaluate(node => {
          const style = getComputedStyle(node), parent = getComputedStyle(node.parentElement);
          return { background: style.backgroundColor, opacity: style.opacity, pointer: style.pointerEvents,
            size: parent.width, transition: style.transitionDuration, hidden: node.getAttribute('aria-hidden'),
            fill: node.querySelector('circle').getAttribute('fill'), path: node.querySelector('path').getAttribute('d') };
        });
        assert.equal(state.background, 'rgba(0, 0, 0, 0)');
        assert.equal(state.pointer, 'none');
        assert.equal(state.fill, 'none');
        assert.equal(state.hidden, 'true');
        assert.equal(state.size, width <= 760 ? '24px' : '32px');
        assert.equal(state.transition, '0s');
        assert.ok(Number(state.opacity) > 0);
        assert.ok(!/NaN|Infinity/.test(state.path));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });
  }
}

const phases = [
  ['2024-04-08T18:21:00Z', 'new-moon'], ['2024-04-12T22:00:00Z', 'waxing-crescent'],
  ['2024-04-15T19:13:00Z', 'first-quarter'], ['2024-04-19T22:00:00Z', 'waxing-gibbous'],
  ['2024-04-23T23:49:00Z', 'full-moon'], ['2024-04-27T22:00:00Z', 'waning-gibbous'],
  ['2024-05-01T11:27:00Z', 'last-quarter'], ['2024-05-05T22:00:00Z', 'waning-crescent'],
];
for (const [instant, phase] of phases) {
  test(`${phase}: rendered fill area matches illumination and has the correct lit side`, async () => {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    try {
      await load(page, { instant });
      const result = await page.evaluate(() => {
        const path = document.querySelector('.divider-moon-lit');
        let lit = 0, total = 0, xSum = 0;
        for (let y = 4.08; y < 20; y += .16) for (let x = 4.08; x < 20; x += .16) {
          if ((x - 12) ** 2 + (y - 12) ** 2 > 64) continue;
          total++;
          if (path.isPointInFill(new DOMPoint(x, y))) { lit++; xSum += x - 12; }
        }
        return { fraction: Number(document.documentElement.dataset.moonIllumination),
          phase: document.documentElement.dataset.moonPhase, area: lit / total, center: xSum / (lit || 1) };
      });
      assert.equal(result.phase, phase);
      assert.ok(Math.abs(result.area - result.fraction) < .015, JSON.stringify(result));
      if (phase === 'first-quarter' || phase === 'waxing-crescent') assert.ok(result.center > 0);
      if (phase === 'last-quarter' || phase === 'waning-crescent') assert.ok(result.center < 0);
    } finally { await page.close(); }
  });
}

test('the same timestamp has identical lunar geometry in different browser timezones', async () => {
  const results = [];
  for (const timezoneId of ['Asia/Bangkok', 'America/New_York', 'Pacific/Auckland', 'Europe/Berlin']) {
    const page = await browser.newPage({ timezoneId, reducedMotion: 'reduce' });
    try {
      await load(page, { hour: null });
      results.push(await page.locator('.divider-moon-lit').getAttribute('d'));
    } finally { await page.close(); }
  }
  assert.equal(new Set(results).size, 1);
});

test('tab resume updates the phase without replacing the moon or resetting manual theme', async () => {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  try {
    await load(page, { instant: phases[0][0] });
    await page.locator('#m3ez-theme-toggle-v1').click();
    const result = await page.evaluate(() => {
      const moon = document.querySelector('.divider-celestial-moon');
      const button = document.querySelector('#m3ez-theme-toggle-v1').innerHTML;
      window.__moonTestClock.now = new Date('2024-04-23T23:49:00Z').getTime();
      document.dispatchEvent(new Event('visibilitychange'));
      return { phase: document.documentElement.dataset.moonPhase, theme: document.documentElement.dataset.theme,
        mode: document.documentElement.dataset.themeMode, sameMoon: moon === document.querySelector('.divider-celestial-moon'),
        sameButton: button === document.querySelector('#m3ez-theme-toggle-v1').innerHTML };
    });
    assert.deepEqual(result, { phase: 'full-moon', theme: 'light', mode: 'manual', sameMoon: true, sameButton: true });
  } finally { await page.close(); }
});

test('local-time sky transitions and print behavior remain independent of moon phase', async () => {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  try {
    await load(page, { hour: 12 });
    assert.equal(await page.locator(moonSelector).evaluate(node => getComputedStyle(node).opacity), '0');
    await page.evaluate(() => { window.__moonTestClock.hour = 22; window.dispatchEvent(new Event('pageshow')); });
    assert.equal(await page.locator('html').getAttribute('data-sky-phase'), 'moon');
    assert.equal(await page.locator(moonSelector).evaluate(node => getComputedStyle(node).opacity), '0.5');
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('#m3ez-divider-celestial-v1').evaluate(node => getComputedStyle(node).display), 'none');
  } finally { await page.close(); }
});
