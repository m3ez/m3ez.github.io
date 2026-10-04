import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// Pixel regression for the CSS-border/SVG join. DOM coordinates alone did not
// catch the half-pixel rasterization seam. This fixture uses the real module
// and stylesheet, served by local route fulfillment without external traffic.
const assets = new URL('../../assets/', import.meta.url);
let browser;
before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    headless: true,
  });
});
after(async () => { await browser?.close(); });

async function mount(page, fraction, theme) {
  await page.setContent(`<!doctype html><html data-theme="${theme}"><head><style>
    :root { --paper: ${theme === 'dark' ? '#000' : '#fff'}; --black: ${theme === 'dark' ? '#fff' : '#000'}; }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: var(--paper); color: var(--black); }
    header, main, footer { width: 1152px; margin-inline: auto; }
    .site-header { position: sticky; top: 0; height: 56px; border-bottom: 1px solid var(--black); }
    section { height: 333px; border-bottom: 1px solid var(--black); }
    #top { height: ${333 + fraction}px; }
    #method { margin-top: 1px; border-left: 2px solid var(--black); }
    </style></head><body><header class="site-header"></header><main id="content">
    <section id="top" class="hero"></section><section id="method" class="trace-section"></section>
    </main><footer class="site-footer"></footer></body></html>`);
  await page.addScriptTag({ type: 'module', content: `
    import { initializeDividerNetwork } from 'https://divider-seam.test/divider-network.js';
    initializeDividerNetwork();
  ` });
  await page.waitForSelector('.m3ez-edge-network[data-active="true"]');
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
}

for (const scale of [1, 2]) {
  for (const theme of ['light', 'dark']) {
    test(`divider join pixels match the CSS border: ${theme}, ${scale}x`, async () => {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 850 }, deviceScaleFactor: scale, reducedMotion: 'reduce',
      });
      try {
        const page = await context.newPage();
        await page.route('https://divider-seam.test/*', async route => {
          const name = new URL(route.request().url()).pathname.slice(1);
          if (!['divider-network.js', 'divider-network.css'].includes(name)) return route.abort();
          await route.fulfill({ body: await readFile(new URL(name, assets)),
            contentType: name.endsWith('.css') ? 'text/css' : 'text/javascript',
            headers: { 'Access-Control-Allow-Origin': '*' } });
        });
        for (const width of [1440, 1441]) {
          await page.setViewportSize({ width, height: 850 });
          for (const fraction of [0, .25, .5, .75]) {
            await mount(page, fraction, theme);
            const png = (await page.screenshot({ scale: 'device' })).toString('base64');
            const result = await page.evaluate(async ({ png, scale }) => {
              const r = document.querySelector('#top').getBoundingClientRect();
              const image = new Image();
              image.src = `data:image/png;base64,${png}`;
              await image.decode();
              const canvas = document.createElement('canvas');
              canvas.width = image.width; canvas.height = image.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(image, 0, 0);
              const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
              const red = (x, y) => pixels[(y * image.width + x) * 4];
              const bottom = Math.round(r.bottom) * scale;
              const referenceX = (Math.round(r.left) + 24) * scale;
              let maximum = 0;
              // Include the shared boundary column, not just a point farther
              // out on the branch. Stop before the next section's vertical line.
              for (const edge of [Math.round(r.left), Math.round(r.right)]) {
                for (let x = (edge - 6) * scale; x < (edge + 6) * scale; x++) {
                  for (let y = bottom - 4 * scale; y < bottom; y++) {
                    maximum = Math.max(maximum, Math.abs(red(x, y) - red(referenceX, y)));
                  }
                }
              }
              return { maximum, bottom: r.bottom, left: r.left };
            }, { png, scale });
            assert.ok(result.maximum <= 2,
              `${width}px, fractional height ${fraction}: seam differs by ${result.maximum}/255 (${JSON.stringify(result)})`);
          }
        }
      } finally { await context.close(); }
    });
  }
}
