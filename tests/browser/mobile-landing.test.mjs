import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const root = new URL('../../', import.meta.url);
const theme = readFileSync(new URL('assets/portfolio-theme.js', root), 'utf8');
const css = readFileSync(new URL('assets/portfolio-theme.css', root), 'utf8');
const disclosure = readFileSync(new URL('assets/progressive-disclosure.js', root), 'utf8');
const hint = '#m3ez-explore-more-v1';
let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, headless: true });
});
after(async () => { await browser?.close(); });

// Offline component fixture: real theme/disclosure code and theme CSS, not a
// replacement homepage. The separate progressive-disclosure suite tests HTTP.
async function load({ width = 390, hash = '', palette = 'light', motion = 'no-preference' } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: motion });
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.abort());
  await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
    <style>:root{--paper:#fff;--black:#000;--ink:#111;--muted:#666;--line:#ddd;--soft:#eee}*{box-sizing:border-box}
    body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.5 sans-serif}
    main,header,footer{max-width:1100px;margin:auto;padding:0 24px}.hero{display:grid;grid-template-columns:1fr;padding:32px 0;border-bottom:1px solid var(--line)}
    .credential-carousel{height:200px;border:1px solid var(--line)}.hero-actions{display:flex;gap:20px}.content-section{padding:48px 0;border-bottom:1px solid var(--line)}
    h1,h2,p{margin:0 0 16px}footer{padding:24px}a{color:inherit}</style>
    </head><body><header><a href="#method" id="method-nav">Method</a></header><main id="content">
    <section class="hero" id="top"><h1>Portfolio</h1><p>Offensive Security Researcher &amp; Consultant</p>
    <div class="hero-actions"><a href="#research">View Research</a><a href="#contact">Contact</a></div>
    <div class="credential-carousel" id="m3ez-credential-carousel-v1">Credentials</div></section>
    <section class="content-section" id="method"><h2>Method</h2><p id="method-scope">Approach and scope</p></section>
    <section class="content-section" id="research"><h2>Research</h2></section>
    <section class="content-section" id="credentials"><h2>Credentials</h2></section>
    <section class="content-section" id="contact"><h2>Contact</h2><input aria-label="Example input"></section>
    </main><footer class="site-footer">Footer</footer></body></html>`);
  if (hash) await page.evaluate(value => { location.hash = value; }, hash);
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: theme });
  await page.evaluate(value => { document.documentElement.dataset.theme = value; }, palette);
  await page.addScriptTag({ type: 'module', content: `${disclosure}\ninitializeProgressiveDisclosure();window.testInitializeDisclosure = initializeProgressiveDisclosure;` });
  await page.waitForFunction(() => document.documentElement.dataset.m3ezProgressiveDisclosure === 'ready');
  return { page, errors };
}

for (const width of [320, 390, 640, 760]) for (const palette of ['light', 'dark']) {
  test(`mobile landing at ${width}px in ${palette} hides Method, preserves sky and reveals on tap`, async () => {
    const { page, errors } = await load({ width, palette });
    try {
      assert.equal(await page.locator('#method').isVisible(), false);
      assert.equal(await page.locator('#research').isVisible(), false);
      assert.equal(await page.locator(hint).getAttribute('href'), '#method');
      assert.equal(await page.locator(hint).evaluate(node => node.parentElement.id), 'top');
      assert.equal(await page.locator(hint).count(), 1);
      assert.ok(await page.locator(hint).isVisible());
      assert.ok((await page.locator(hint).boundingBox()).height >= 44);
      assert.ok(await page.locator('#m3ez-divider-celestial-v1').isVisible());
      assert.equal(await page.locator('#top').evaluate(node => node.nextElementSibling.id), 'method');
      assert.equal(await page.locator('html').getAttribute('data-divider-walker'), 'active');
      const walker = await page.locator('#top').evaluate(node => {
        const style = getComputedStyle(node, '::after');
        return { display: style.display, animation: style.animationName, mask: style.maskImage };
      });
      assert.equal(walker.display, 'block');
      assert.ok(walker.animation.includes('m3ez-divider-walk'));
      assert.ok(walker.mask.includes('stickman-walk-cycle.svg'));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.locator(hint).click();
      await page.waitForFunction(() => location.hash === '#method');
      assert.ok(await page.locator('#method').isVisible());
      assert.ok(await page.locator('#research').isVisible());
      assert.equal(await page.locator(hint).isVisible(), false);
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });
}

for (const width of [761, 1024, 1440]) {
  test(`desktop at ${width}px retains Method, Research destination and an active walker`, async () => {
    const { page } = await load({ width });
    try {
      assert.ok(await page.locator('#method').isVisible());
      assert.equal(await page.locator('#research').isVisible(), false);
      assert.equal(await page.locator(hint).getAttribute('href'), '#research');
      assert.equal(await page.locator(hint).evaluate(node => node.parentElement.id), 'method');
      assert.equal(await page.locator('#top').evaluate(node => getComputedStyle(node, '::after').display), 'block');
      await page.locator(hint).click();
      await page.waitForFunction(() => location.hash === '#research');
      assert.ok(await page.locator('#research').isVisible());
    } finally { await page.close(); }
  });
}

for (const hash of ['#method', '#method-scope', '#%6dethod', '#research', '#contact']) {
  test(`mobile direct link ${hash} reveals its destination`, async () => {
    const { page } = await load({ hash });
    try {
      assert.equal(await page.locator('html').getAttribute('data-portfolio-expanded'), 'true');
      assert.ok(await page.locator('#method').isVisible());
      assert.equal(await page.locator(hint).isVisible(), false);
    } finally { await page.close(); }
  });
}

test('mobile Method navigation and keyboard Explore activation both reveal', async () => {
  for (const selector of ['#method-nav', hint]) {
    const { page } = await load();
    try {
      await page.locator(selector).focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => location.hash === '#method');
      assert.ok(await page.locator('#method').isVisible());
      assert.equal(await page.locator('html').getAttribute('data-portfolio-expanded'), 'true');
    } finally { await page.close(); }
  }
});

test('same-tab Method hash changes reveal the hidden section', async () => {
  const { page } = await load();
  try {
    await page.evaluate(() => { location.hash = '#method-scope'; });
    await page.waitForFunction(() => document.documentElement.dataset.portfolioExpanded === 'true');
    assert.ok(await page.locator('#method-scope').isVisible());
  } finally { await page.close(); }
});

test('resize moves a single Explore control while preserving expansion and manual walker override', async () => {
  const { page } = await load();
  try {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.waitForFunction(() => document.querySelector('#m3ez-explore-more-v1').parentElement.id === 'method');
    assert.ok(await page.locator('#method').isVisible());
    assert.equal(await page.locator(hint).getAttribute('href'), '#research');
    assert.equal(await page.locator('html').getAttribute('data-divider-walker'), 'active');
    await page.setViewportSize({ width: 390, height: 900 });
    await page.waitForFunction(() => document.querySelector('#m3ez-explore-more-v1').parentElement.id === 'top');
    assert.equal(await page.locator('#method').isVisible(), false);
    await page.keyboard.press('r');
    assert.equal(await page.locator('html').getAttribute('data-divider-walker'), 'inactive');
    await page.locator(hint).click();
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.setViewportSize({ width: 390, height: 900 });
    assert.ok(await page.locator('#method').isVisible());
    assert.equal(await page.locator('html').getAttribute('data-divider-walker'), 'inactive');
    assert.equal(await page.locator(hint).count(), 1);
  } finally { await page.close(); }
});

test('desktop Method deep link stays visible when resized to mobile', async () => {
  const { page } = await load({ width: 1200, hash: '#method' });
  try {
    assert.equal(await page.locator('html').getAttribute('data-portfolio-expanded'), 'false');
    await page.setViewportSize({ width: 390, height: 900 });
    await page.waitForFunction(() => document.documentElement.dataset.portfolioExpanded === 'true');
    assert.ok(await page.locator('#method').isVisible());
  } finally { await page.close(); }
});

test('reduced motion and print suppress the walker; print reveals all sections', async () => {
  const { page } = await load({ motion: 'reduce' });
  try {
    const style = () => page.locator('#top').evaluate(node => {
      const s = getComputedStyle(node, '::after'); return { content: s.content, animation: s.animationName };
    });
    assert.deepEqual(await style(), { content: 'none', animation: 'none' });
    assert.equal(await page.locator('#method').isVisible(), false);
    await page.emulateMedia({ media: 'print' });
    assert.ok(await page.locator('#method').isVisible());
    assert.ok(await page.locator('#research').isVisible());
    assert.ok(await page.locator('.site-footer').isVisible());
    assert.equal(await page.locator(hint).isVisible(), false);
    assert.deepEqual(await style(), { content: 'none', animation: 'none' });
    await page.emulateMedia({ media: 'screen' });
    assert.equal(await page.locator('#method').isVisible(), false);
  } finally { await page.close(); }
});

test('initialization is idempotent and does not duplicate sky or Explore elements', async () => {
  const { page } = await load();
  try {
    await page.evaluate(() => { window.testInitializeDisclosure(); window.testInitializeDisclosure(); });
    assert.equal(await page.locator(hint).count(), 1);
    assert.equal(await page.locator('#m3ez-divider-celestial-v1').count(), 1);
    await page.locator(hint).click();
    assert.ok(await page.locator('#method').isVisible());
  } finally { await page.close(); }
});
