import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { loadOfflineHomepage } from './helpers/offline-homepage.mjs';

const cat = '#m3ez-divider-cat-v1';
let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, headless: true });
});
after(async () => { await browser?.close(); });

async function load({ width = 390, palette = 'light', motion = 'no-preference', path = '/' } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: motion });
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.abort());
  await loadOfflineHomepage(page, { palette, hash: path.includes('#') ? path.slice(path.indexOf('#')) : '' });
  return { page, errors };
}

async function assertFollowing(page) {
  await page.waitForFunction(() => {
    const pair = document.getAnimations().filter(a => a.animationName === 'm3ez-divider-walk-cross');
    return pair.length === 2 && pair.every(a => a.startTime !== null);
  });
  const result = await page.evaluate(() => {
    const hero = document.getElementById('top');
    const cat = document.getElementById('m3ez-divider-cat-v1');
    if (!cat) return { missing: true };
    const crossings = document.getAnimations().filter(a => a.animationName === 'm3ez-divider-walk-cross');
    const starts = crossings.map(a => a.startTime);
    const samples = [];
    for (const fraction of [0, .05, .25, .5, .9, .96, .999]) {
      for (const animation of crossings) {
        animation.currentTime = Number(animation.effect.getTiming().duration) * fraction;
      }
      const box = hero.getBoundingClientRect();
      const pet = cat.getBoundingClientRect();
      const walker = getComputedStyle(hero, '::after');
      const heroStyle = getComputedStyle(hero);
      const walkerLeft = box.left + parseFloat(heroStyle.borderLeftWidth) + parseFloat(walker.left);
      samples.push({
        gap: walkerLeft - pet.right,
        fits: pet.left >= box.left - .1 && walkerLeft + parseFloat(walker.width) <= box.right + .1,
        ground: Math.abs(pet.bottom - box.bottom) <= 1.1,
        ratio: pet.height / parseFloat(walker.height),
        opacityDelta: Math.abs(parseFloat(getComputedStyle(cat).opacity) - parseFloat(walker.opacity)),
      });
    }
    return { count: crossings.length, starts, samples };
  });
  assert.equal(result.missing, undefined, 'The cat must be mounted');
  assert.equal(result.count, 2, 'Both figures must share the crossing animation');
  assert.ok(result.starts.every(t => typeof t === 'number'), 'Both animations must have started');
  assert.ok(Math.abs(result.starts[0] - result.starts[1]) < 1, 'Start the pair together, including after a resize or toggle');
  for (const sample of result.samples) {
    assert.ok(Math.abs(sample.gap - 8) < .2, `Keep a fixed following gap: ${JSON.stringify(sample)}`);
    assert.ok(sample.fits, 'Both figures must fit at the beginning, middle and end of the crossing');
    assert.ok(sample.ground, 'The cat walks on the same divider');
    assert.ok(sample.ratio >= .55 && sample.ratio <= .65, 'The cat is about 60% of the walker height');
    assert.ok(sample.opacityDelta < .001, 'Fade the pair together');
  }
}

for (const width of [320, 390, 640, 760, 761, 1024, 1440]) for (const palette of ['light', 'dark']) {
  test(`cat follows the walker on the real page at ${width}px in ${palette}`, async () => {
    const { page, errors } = await load({ width, palette });
    try {
      assert.equal(await page.locator(cat).count(), 1, 'Mount one decorative cat');
      assert.equal(await page.locator('html').getAttribute('data-divider-walker'), 'active');
      assert.ok(await page.locator(cat).isVisible());
      assert.equal(await page.locator(cat).getAttribute('aria-hidden'), 'true');
      assert.equal(await page.locator(cat).evaluate(n => n.tabIndex), -1);
      assert.equal(await page.locator(cat).evaluate(n => getComputedStyle(n).pointerEvents), 'none');
      assert.equal(await page.locator('#top').evaluate(n => n.nextElementSibling.id), 'method');
      assert.equal(await page.locator(cat).evaluate(n => getComputedStyle(n).color), palette === 'dark' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await assertFollowing(page);
      const explore = page.locator('#m3ez-explore-more-v1');
      assert.ok(await explore.evaluate(n => n.getBoundingClientRect().top > n.parentElement.getBoundingClientRect().bottom));
      await explore.click();
      const destination = width <= 760 ? '#method' : '#research';
      await page.waitForFunction(hash => location.hash === hash, destination);
      assert.ok(await page.locator(destination).isVisible());
      assert.equal(await explore.isVisible(), false);
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });
}

test('R toggles both figures and the choice survives desktop/mobile resizing', async () => {
  const { page } = await load({ width: 1440 });
  try {
    await assertFollowing(page);
    await page.keyboard.press('r');
    assert.equal(await page.locator(cat).isVisible(), false);
    assert.equal(await page.locator('#top').evaluate(n => getComputedStyle(n, '::after').display), 'none');
    await page.setViewportSize({ width: 390, height: 1000 });
    assert.equal(await page.locator(cat).isVisible(), false);
    await page.keyboard.press('R');
    await page.waitForFunction(() => document.getAnimations().filter(a => a.animationName === 'm3ez-divider-walk-cross').every(a => a.startTime !== null));
    await assertFollowing(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await assertFollowing(page);
    assert.equal(await page.locator(cat).count(), 1);
  } finally { await page.close(); }
});

test('articulated leg and tail sprite animates without adding a focusable element', async () => {
  const { page } = await load();
  try {
    assert.equal(await page.locator(`${cat} .divider-cat-pose`).count(), 1);
    const movements = await page.locator(cat).evaluate(n => n.getAnimations({ subtree: true }).map(a => a.animationName));
    assert.equal(movements.filter(name => name === 'm3ez-cat-gait').length, 1);
    assert.equal(await page.locator(`${cat} a, ${cat} button, ${cat} [tabindex]`).count(), 0);
  } finally { await page.close(); }
});

for (const width of [390, 1440]) {
  test(`reduced motion and print suppress the pair at ${width}px`, async () => {
    const { page } = await load({ width, motion: 'reduce' });
    try {
      assert.equal(await page.locator(cat).count(), 1);
      assert.equal(await page.locator(cat).isVisible(), false);
      assert.equal(await page.locator('#top').evaluate(n => getComputedStyle(n, '::after').content), 'none');
      assert.equal(await page.locator(cat).evaluate(n => n.getAnimations({ subtree: true }).length), 0);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      assert.ok(await page.locator(cat).isVisible());
      await page.emulateMedia({ media: 'print' });
      assert.equal(await page.locator(cat).isVisible(), false);
      assert.equal(await page.locator(cat).evaluate(n => n.getAnimations({ subtree: true }).length), 0);
      assert.ok(await page.locator('#method').isVisible());
      assert.ok(await page.locator('#research').isVisible());
      assert.equal(await page.locator('#m3ez-explore-more-v1').isVisible(), false);
      await page.emulateMedia({ media: 'screen' });
      assert.ok(await page.locator(cat).isVisible());
    } finally { await page.close(); }
  });
}

test('deep links retain the cat without restoring Explore or collapsing content', async () => {
  const { page, errors } = await load({ path: '/#research' });
  try {
    assert.equal(await page.locator(cat).count(), 1);
    assert.equal(await page.locator('html').getAttribute('data-portfolio-expanded'), 'true');
    assert.equal(await page.locator('#m3ez-explore-more-v1').isVisible(), false);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

for (const width of [390, 1440]) {
  test(`64-pose chubby cat stays in its frame and has speed-matched paw cadence at ${width}px`, async () => {
    const { page } = await load({ width });
    try {
      const pose = page.locator(`${cat} .divider-cat-pose`);
      assert.equal(await pose.count(), 1, 'Mount the articulated sprite instead of pendulum legs');
      const data = await pose.evaluate(n => {
        const style = getComputedStyle(n);
        const animation = n.getAnimations()[0];
        const pet = n.parentElement;
        const hero = pet.parentElement;
        const travel = hero.clientWidth - parseFloat(getComputedStyle(hero, '::after').width) - parseFloat(getComputedStyle(pet).width) - 8;
        const crossing = pet.getAnimations()[0];
        const duration = Number(animation.effect.getTiming().duration);
        // Sample inside each step, avoiding floating-point ambiguity at a boundary.
        const offsets = [0, 1.5/64, 32.5/64, 63.5/64, .99999, 1.00001].map(f => {
          animation.pause(); animation.currentTime = duration * f;
          return parseFloat(getComputedStyle(n).maskPosition.split(' ')[0]);
        });
        return { width: parseFloat(style.width), sheetWidth: parseFloat(style.maskSize), timing: style.animationTimingFunction,
          offsets, duration, expected: (20 * parseFloat(style.width) / 44) * Number(crossing.effect.getTiming().duration) * .96 / travel };
      });
      assert.equal(data.timing, 'steps(64)');
      assert.ok(Math.abs(data.sheetWidth - data.width * 64) < .1);
      for (const [i, frame] of [0, 1, 32, 63, 63, 0].entries()) assert.ok(Math.abs(data.offsets[i] + frame * data.width) < .2, `frame ${frame}: ${JSON.stringify(data)}`);
      assert.ok(Math.abs(data.duration - data.expected) < 1, 'cadence follows crossing speed at this width');
    } finally { await page.close(); }
  });
}

test('cadence remains correct when reduced motion is turned off after initial load', async () => {
  const { page } = await load({ width: 1440, motion: 'reduce' });
  try {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const cycle = await page.locator('.divider-cat-pose').evaluate(n => n.getAnimations()[0].effect.getTiming().duration);
    assert.ok(cycle > 725 && cycle < 765, `expected speed-matched cadence, received ${cycle}ms`);
  } finally { await page.close(); }
});
