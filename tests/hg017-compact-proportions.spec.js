// HG-018: Underline tabs ramping, gap header->h1 <= 16px, surface vs background
// kontras (#F4F7F9 body vs #FFF header/card), preset chip ramping. Murni CSS.
const { test, expect } = require('@playwright/test');

test('HG-018: underline tab, gap atas rapat, kontras surface, preset ramping', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForSelector('.app-header');

  // 1. Nav = underline tab: tanpa kotak abu, garis bawah tipis, tab aktif primary
  const nav = await page.locator('.segmented-nav').evaluate(el => {
    const cs = getComputedStyle(el);
    return { bg: cs.backgroundColor, pad: cs.padding, radius: cs.borderRadius };
  });
  const rgba = nav.bg.match(/[\d.]+/g) || [];
  const alpha = parseFloat(rgba[3] ?? '1');
  const transparent = alpha === 0;
  expect(transparent || nav.bg === 'rgba(0, 0, 0, 0)').toBe(true);
  expect(parseFloat(nav.pad)).toBeLessThanOrEqual(2);
  expect(parseFloat(nav.radius)).toBeLessThanOrEqual(2);

  const hdr = await page.locator('.app-header').evaluate(el => {
    const cs = getComputedStyle(el);
    return { bb: cs.borderBottomWidth, bc: cs.borderBottomColor };
  });
  expect(hdr.bb).toBe('1px');
  expect(hdr.bc).toBe('rgb(226, 232, 240)');

  const active = await page.locator('.segmented-nav a.active').evaluate(el => {
    const cs = getComputedStyle(el);
    return { color: cs.color, fw: cs.fontWeight, bb: cs.borderBottomWidth, bbc: cs.borderBottomColor };
  });
  expect(active.fw).toBe('700');
  expect(active.bb).toBe('2px');
  expect(active.bbc).toBe('rgb(15, 118, 110)');

  // min-height 44px tap-target tetap terjaga (HG-012)
  const tabH = await page.locator('.segmented-nav a.active').evaluate(el => el.getBoundingClientRect().height);
  expect(tabH).toBeGreaterThanOrEqual(43.5);

  // 2. Gap bawah header -> h1 maksimal 16px
  const gap = await page.evaluate(() => {
    const h = document.querySelector('.app-header').getBoundingClientRect();
    const t = document.querySelector('.hero-compact h1').getBoundingClientRect();
    return t.top - h.bottom;
  });
  expect(gap).toBeLessThanOrEqual(16);

  // 3. Kontras surface: body #F4F7F9, header & card #FFFFFF
  const colors = await page.evaluate(() => ({
    body: getComputedStyle(document.body).backgroundColor,
    header: getComputedStyle(document.querySelector('.app-header')).backgroundColor,
    card: getComputedStyle(document.querySelector('.card')).backgroundColor,
  }));
  expect(colors.body).toBe('rgb(244, 247, 249)');
  expect(colors.header).toBe('rgb(255, 255, 255)');
  expect(colors.card).toBe('rgb(255, 255, 255)');

  // 4. Preset chip ramping: pad vertikal 6px, font 12px, radius 8px, tetap >=44px tinggi
  const chip = await page.locator('.preset-chip').first().evaluate(el => {
    const cs = getComputedStyle(el);
    return { pt: cs.paddingTop, pb: cs.paddingBottom, fs: cs.fontSize, r: cs.borderRadius, h: el.getBoundingClientRect().height };
  });
  expect(parseFloat(chip.pt)).toBeLessThanOrEqual(7);
  expect(parseFloat(chip.pb)).toBeLessThanOrEqual(7);
  expect(chip.fs).toBe('12px');
  expect(parseFloat(chip.r)).toBeLessThanOrEqual(9);
  expect(chip.h).toBeGreaterThanOrEqual(43.5);

  // Desktop 1280x800: tanpa regresi, gap tetap rapat
  await page.setViewportSize({ width: 1280, height: 800 });
  const dGap = await page.evaluate(() => {
    const h = document.querySelector('.app-header').getBoundingClientRect();
    const t = document.querySelector('.hero-compact h1').getBoundingClientRect();
    return t.top - h.bottom;
  });
  expect(dGap).toBeLessThanOrEqual(24);
});
