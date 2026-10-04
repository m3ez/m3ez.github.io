import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const root = new URL('../../', import.meta.url);
const css = readFileSync(new URL('assets/portfolio-theme.css', root), 'utf8');
const disclosure = readFileSync(new URL('assets/progressive-disclosure.js', root), 'utf8');
const hint = '#m3ez-explore-more-v1';
let browser;
before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    headless: true,
  });
});
after(async () => { await browser?.close(); });

// Focused offline layout fixture, matching mobile-landing.test.mjs: exercise
// the real theme CSS and disclosure module, without replacing the homepage.
async function load({ width = 390, palette = 'light', motion = 'no-preference', hash = '' } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: motion });
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.abort());
  await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
    <style>:root{--paper:#fff;--black:#000;--ink:#111;--muted:#595959;--line:#b8b8b8;--soft:#eee}*{box-sizing:border-box}
    body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.5 sans-serif}
    main{width:calc(100% - 48px);max-width:1100px;margin:auto}
    .hero{display:grid;grid-template-columns:1fr;padding:32px 0;border-bottom:1px solid var(--black)}
    .credential-carousel{height:200px;border:1px solid var(--line)}
    .content-section{padding:48px 0;border-bottom:1px solid var(--line)}
    h1,h2,p{margin:0 0 16px}footer{padding:24px}a{color:inherit}
    :focus-visible{outline:3px solid var(--black);outline-offset:3px}</style>
    </head><body><main id="content">
    <section class="hero" id="top"><h1>Portfolio</h1><p>Offensive Security Researcher &amp; Consultant</p>
    <div class="credential-carousel" id="m3ez-credential-carousel-v1">Credentials</div>
    <div id="m3ez-divider-light-v1" aria-hidden="true"></div>
    <div id="m3ez-divider-clouds-v1" aria-hidden="true"></div>
    <div id="m3ez-divider-celestial-v1" aria-hidden="true"></div></section>
    <section class="content-section" id="method"><h2>Method</h2><p id="method-scope">Approach and scope</p></section>
    <section class="content-section" id="research"><h2>Research</h2></section>
    <section class="content-section" id="contact"><h2>Contact</h2></section>
    </main><footer class="site-footer">Footer</footer></body></html>`);
  await page.addStyleTag({ content: css });
  await page.evaluate(({ palette, hash }) => {
    document.documentElement.dataset.theme = palette;
    if (hash) location.hash = hash;
  }, { palette, hash });
  await page.addScriptTag({ type: 'module', content: `${disclosure}\ninitializeProgressiveDisclosure();` });
  await page.waitForFunction(() => document.documentElement.dataset.m3ezProgressiveDisclosure === 'ready');
  return { page, errors };
}

async function assertPlacement(page, { checkTextGap = true } = {}) {
  const geometry = await page.locator(hint).evaluate(node => {
    const box = node.getBoundingClientRect();
    const parent = node.parentElement.getBoundingClientRect();
    const text = node.firstElementChild.getBoundingClientRect();
    const main = document.getElementById('content').getBoundingClientRect();
    return {
      gap: box.top - parent.bottom,
      textGap: text.top - parent.bottom,
      height: box.height,
      centerOffset: Math.abs((box.left + box.width / 2) - (parent.left + parent.width / 2)),
      reserved: main.bottom - box.bottom,
      overflowing: document.documentElement.scrollWidth > innerWidth,
    };
  });
  assert.ok(geometry.gap >= 4, `Explore must sit below the divider: ${JSON.stringify(geometry)}`);
  if (checkTextGap) {
    assert.ok(geometry.textGap >= 18 && geometry.textGap <= 24,
      `Text should sit about 20px below the divider: ${JSON.stringify(geometry)}`);
  }
  assert.ok(geometry.height >= 44, 'Keep the 44px tap target');
  assert.ok(geometry.centerOffset <= 1, 'Center on the existing divider');
  assert.ok(geometry.reserved >= 8, 'Reserve space below the out-of-flow control');
  assert.equal(geometry.overflowing, false);
  assert.equal(await page.locator('#top').evaluate(node => node.nextElementSibling.id), 'method');
  assert.equal(await page.locator(hint).count(), 1);
}

for (const width of [320, 390, 640, 760, 761, 1024, 1440]) {
  for (const palette of ['light', 'dark']) {
    test(`Explore sits below the divider at ${width}px in ${palette} and retains its tap behavior`, async () => {
      const { page, errors } = await load({ width, palette });
      try {
        await assertPlacement(page);
        const destination = width <= 760 ? '#method' : '#research';
        assert.equal(await page.locator(hint).getAttribute('href'), destination);
        assert.equal(await page.locator('#method').isVisible(), width > 760);
        assert.equal(await page.locator('#research').isVisible(), false);
        for (const selector of ['#m3ez-divider-clouds-v1', '#m3ez-divider-celestial-v1']) {
          const hero = await page.locator('#top').boundingBox();
          const sky = await page.locator(selector).boundingBox();
          assert.ok(sky.y + sky.height <= hero.y + hero.height, 'Keep sky elements above the hero border');
        }
        const box = await page.locator(hint).boundingBox();
        // Activate near the bottom of the hit area, not just on the label.
        await page.locator(hint).click({ position: { x: box.width / 2, y: box.height - 2 } });
        await page.waitForFunction(value => location.hash === value, destination);
        assert.ok(await page.locator(destination).isVisible());
        assert.equal(await page.locator(hint).isVisible(), false);
        assert.equal(await page.locator('#content').evaluate(node => getComputedStyle(node).paddingBottom), '0px');
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });
  }
}

test('resizing across the mobile breakpoint preserves placement and removes reserved space after expansion', async () => {
  const { page, errors } = await load();
  try {
    for (const width of [761, 760, 1440, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForFunction(parent => document.querySelector('#m3ez-explore-more-v1').parentElement.id === parent,
        width <= 760 ? 'top' : 'method');
      await assertPlacement(page);
    }
    await page.locator(hint).click();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.locator('#method').isVisible());
      assert.equal(await page.locator(hint).isVisible(), false);
      assert.equal(await page.locator('#content').evaluate(node => getComputedStyle(node).paddingBottom), '0px');
    }
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

for (const width of [390, 1024]) {
  test(`keyboard activation below the divider still reveals content at ${width}px`, async () => {
    const { page, errors } = await load({ width, motion: 'reduce' });
    try {
      await assertPlacement(page);
      await page.locator(hint).focus();
      assert.equal(await page.locator(hint).evaluate(node => getComputedStyle(node).outlineStyle), 'solid');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.documentElement.dataset.portfolioExpanded === 'true');
      assert.ok(await page.locator('#research').isVisible());
      assert.equal(await page.locator(hint).isVisible(), false);
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });
}

test('print removes both the control and its reserved space, then restores screen placement', async () => {
  const { page } = await load();
  try {
    await assertPlacement(page);
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator(hint).isVisible(), false);
    assert.ok(await page.locator('#method').isVisible());
    assert.ok(await page.locator('#research').isVisible());
    assert.ok(await page.locator('.site-footer').isVisible());
    assert.equal(await page.locator('#content').evaluate(node => getComputedStyle(node).paddingBottom), '0px');
    await page.emulateMedia({ media: 'screen' });
    await assertPlacement(page);
  } finally { await page.close(); }
});

test('larger root text and a tall mobile hero keep the full control reachable', async () => {
  const { page } = await load({ width: 320 });
  try {
    await page.addStyleTag({ content: 'html{font-size:200%}.credential-carousel{height:950px}' });
    await assertPlacement(page, { checkTextGap: false });
    await page.locator(hint).scrollIntoViewIfNeeded();
    await page.locator(hint).click();
    assert.ok(await page.locator('#method').isVisible());
  } finally { await page.close(); }
});

test('an initial mobile deep link remains expanded without reserved landing space', async () => {
  const { page } = await load({ hash: '#method-scope' });
  try {
    assert.ok(await page.locator('#method-scope').isVisible());
    assert.equal(await page.locator(hint).isVisible(), false);
    assert.equal(await page.locator('#content').evaluate(node => getComputedStyle(node).paddingBottom), '0px');
  } finally { await page.close(); }
});
