import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const screenshotDir = process.env.HERO_ACTIONS_SCREENSHOT_DIR;
let browser, html, styles, themeScript, entryModule;
const moduleCache = new Map();
const dataURL = (type, text) => `data:${type};base64,${Buffer.from(text).toString('base64')}`;

// Render the real exported document and modules without external HTTP access.
// Only resource URLs are inlined; markup, styles and application behavior stay intact.
async function inlineModule(path) {
  if (moduleCache.has(path)) return moduleCache.get(path);
  let source = await readFile(path, 'utf8');
  for (const match of source.matchAll(/from\s+(['"])(\.\/[^'"]+)\1/g)) {
    const url = await inlineModule(resolve(dirname(path), match[2]));
    source = source.replace(match[0], `from '${url}'`);
  }
  if (source.includes("'/data/wordfence-cves.json'")) {
    const data = await readFile(join(root, 'data/wordfence-cves.json'), 'utf8');
    source = source.replace("'/data/wordfence-cves.json'", `'${dataURL('application/json', data)}'`);
  }
  const url = dataURL('text/javascript', source);
  moduleCache.set(path, url);
  return url;
}

async function inlineCSS(relativePath) {
  const path = join(root, relativePath);
  let css = await readFile(path, 'utf8');
  for (const match of css.matchAll(/url\(["'](\.\/[^"']+\.svg)["']\)/g)) {
    const svg = await readFile(resolve(dirname(path), match[1]), 'utf8');
    css = css.replaceAll(match[0], `url("${dataURL('image/svg+xml', svg)}")`);
  }
  return css;
}

before(async () => {
  html = (await readFile(join(root, 'index.html'), 'utf8'))
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<link\b[^>]*>/gi, '');
  styles = await Promise.all([
    '_next/static/chunks/03~_g8i41_-g_-base.css',
    'assets/research-credentials.css',
    'assets/portfolio-theme.css',
  ].map(inlineCSS));
  themeScript = await readFile(join(root, 'assets/portfolio-theme.js'), 'utf8');
  entryModule = await inlineModule(join(root, 'assets/portfolio-redesign.js'));
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, headless: true });
  if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
});
after(async () => { await browser?.close(); });

async function withPage(width, theme, run, reducedMotion = 'reduce') {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion });
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.setContent(html);
    for (const content of styles) await page.addStyleTag({ content });
    await page.addScriptTag({ content: themeScript });
    await page.addScriptTag({ type: 'module', content: `import '${entryModule}';` });
    await page.waitForSelector('#top .hero-actions');
    await page.waitForSelector('.cve-row-v2', { state: 'attached' });
    if (theme === 'dark') await page.locator('#m3ez-theme-toggle-v1').click();
    await page.mouse.move(0, 0);
    await run(page);
    assert.deepEqual(errors, [], 'production modules should run without page errors');
  } finally {
    await page.close();
  }
}

for (const width of [320, 360, 390, 560, 768, 880, 900, 1024, 1440]) {
  for (const theme of ['light', 'dark']) {
    test(`hero actions keep a side-by-side layout and respect the mobile half-width split at ${width}px in ${theme}`, async () => {
      await withPage(width, theme, async page => {
        const actions = page.locator('#top .hero-actions a');
        assert.deepEqual(await actions.allTextContents(), ['View Research', 'Contact']);
        assert.deepEqual(await actions.evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))), ['#research', '#contact']);
        assert.equal(await page.getByRole('link', { name: 'View Research', exact: true }).count(), 1);
        assert.equal(await page.locator('#top').getByRole('link', { name: 'Contact', exact: true }).count(), 1);
        const [row, primary, secondary] = await page.locator('#top .hero-actions').evaluate(actions => [{
          x: actions.getBoundingClientRect().x,
          width: actions.getBoundingClientRect().width,
          gap: parseFloat(getComputedStyle(actions).columnGap || getComputedStyle(actions).gap) || 0,
        }, ...Array.from(actions.querySelectorAll('a')).map(node => {
          const box = node.getBoundingClientRect();
          const css = getComputedStyle(node);
          return { x: box.x, y: box.y, width: box.width, height: box.height,
            background: css.backgroundColor, color: css.color, radius: parseFloat(css.borderRadius),
            border: css.borderTopWidth, shadow: css.boxShadow, whiteSpace: css.whiteSpace };
        })]);
        assert.ok(Math.abs(primary.y - secondary.y) <= 1, 'mobile actions must stay on one row');
        assert.equal(primary.height, secondary.height, 'actions must share a baseline and hit-area height');
        assert.ok(primary.height >= 44 && secondary.height >= 44, 'retain touch-friendly hit areas');
        assert.ok(secondary.x >= primary.x + primary.width + 8, 'separate the two hit areas');
        assert.ok(secondary.x + secondary.width <= width, 'do not clip the Contact action');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.equal(primary.background, theme === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
        assert.equal(primary.color, theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)');
        assert.equal(primary.radius, 0, 'the primary action should use square corners');
        assert.equal(secondary.radius, 0, 'the secondary action should also stay square');
        assert.notEqual(primary.shadow, 'none', 'give the primary button a subtle shadow');
        assert.equal(secondary.background, 'rgba(0, 0, 0, 0)', 'Contact is a transparent text action');
        assert.equal(secondary.border, '0px', 'Contact has no visible button border');
        assert.equal(secondary.shadow, 'none');
        assert.equal(secondary.color, theme === 'light' ? 'rgb(17, 17, 17)' : 'rgb(238, 238, 238)');
        if (width <= 560) {
          assert.ok(row.x >= 12, 'the hero row should keep comfortable left gutter space on phones');
          assert.ok(width - (row.x + row.width) >= 12, 'the hero row should keep comfortable right gutter space on phones');
          assert.ok(Math.abs(primary.width - secondary.width) <= 2, 'mobile actions should split the row 50/50');
          assert.ok(Math.abs(primary.width + secondary.width + row.gap - row.width) <= 2, 'mobile actions should span the hero row width');
        } else {
          assert.ok(primary.width > secondary.width, 'desktop keeps the filled CTA content-sized and more prominent');
        }
        for (const [index, pseudo] of [[0, '::after'], [1, '::before']]) {
          const icon = await actions.nth(index).evaluate((node, pseudo) => {
            const css = getComputedStyle(node, pseudo);
            return { content: css.content, mask: css.maskImage, width: parseFloat(css.width), height: parseFloat(css.height), pointer: css.pointerEvents };
          }, pseudo);
          assert.equal(icon.content, '""', 'decorative icons must not alter accessible names');
          assert.notEqual(icon.mask, 'none');
          assert.ok(icon.width >= 14 && icon.height >= 14);
          assert.equal(icon.pointer, 'none', 'icons must not steal clicks');
        }
        // Hero-only overrides must not shrink the existing bottom Contact buttons.
        if (width <= 560) {
          await page.evaluate(() => {
            document.documentElement.dataset.portfolioExpanded = 'true';
            document.documentElement.dataset.portfolioReveal = 'complete';
          });
          const bottom = page.locator('#contact .contact-actions .primary-action').first();
          const dimensions = await bottom.evaluate(node => ({ width: node.getBoundingClientRect().width, parent: node.parentElement.getBoundingClientRect().width }));
          assert.ok(Math.abs(dimensions.width - dimensions.parent) <= 1);
        }
        if (screenshotDir && [390, 1440].includes(width)) {
          await page.screenshot({ path: join(screenshotDir, `hero-${width}-${theme}.png`), animations: 'disabled' });
        }
      });
    });
  }
}

for (const theme of ['light', 'dark']) {
  test(`hero links preserve keyboard focus and both anchor destinations in ${theme}`, async () => {
    await withPage(390, theme, async page => {
      const links = page.locator('#top .hero-actions a');
      await page.keyboard.press('Tab');
      await links.first().focus();
      assert.equal(await links.first().evaluate(node => node.matches(':focus-visible')), true);
      assert.ok(await links.first().evaluate(node => parseFloat(getComputedStyle(node).outlineWidth) >= 2));
      await page.keyboard.press('Tab');
      assert.equal(await links.last().evaluate(node => document.activeElement === node), true);
      assert.ok(await links.last().evaluate(node => parseFloat(getComputedStyle(node).outlineWidth) >= 2));
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => location.hash === '#contact');
      await links.first().click();
      await page.waitForFunction(() => location.hash === '#research');
    });
  });
}

test('hero hover and press do not reflow the mobile action row', async () => {
  await withPage(320, 'light', async page => {
    const links = page.locator('#top .hero-actions a');
    const before = await links.last().boundingBox();
    await links.first().hover();
    await page.mouse.down();
    assert.deepEqual(await links.last().boundingBox(), before);
    await page.mouse.up();
  }, 'no-preference');
});
