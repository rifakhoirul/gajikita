// HG-017: Proporsi compact header/hero/preset (mobile-first fintech).
// Murni CSS — id/selector/JS logic tidak berubah.
const { test, expect } = require('@playwright/test');

test('HG-017: header, segmented-nav, hero, preset chip proporsi ringkas', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForSelector('.app-header');

  // 1. Header ramping
  const inner = await page.locator('.header-inner').evaluate((el) => {
    const s = getComputedStyle(el);
    return { pad: s.padding, mb: getComputedStyle(el.querySelector('.brand-row') || el.parentElement.querySelector('.brand-row')).marginBottom };
  });
  expect(inner.pad).toBe('8px 16px 10px');
  expect(inner.mb).toBe('6px');

  const logo = await page.locator('.brand-logo').first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { fs: s.fontSize, ls: s.letterSpacing };
  });
  expect(logo.fs).toBe('16px');
  expect(parseFloat(logo.ls)).toBeLessThan(0);

  const badge = await page.locator('.brand-badge').first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { bs: s.borderStyle, pad: s.padding, fs: s.fontSize };
  });
  expect(badge.bs).toBe('none');
  expect(badge.pad).toBe('2px 8px');
  expect(badge.fs).toBe('10px');

  // 2. Segmented nav tegas
  const nav = await page.locator('.segmented-nav').evaluate((el) => {
    const s = getComputedStyle(el);
    return { pad: s.padding, bg: s.backgroundColor, br: s.borderRadius };
  });
  expect(nav.pad).toBe('3px');
  expect(nav.bg).toBe('rgb(238, 242, 246)');
  expect(parseFloat(nav.br)).toBe(10);

  const active = await page.locator('.segmented-nav a.active').evaluate((el) => {
    const s = getComputedStyle(el);
    return { fw: parseInt(s.fontWeight), shadow: s.boxShadow, h: el.getBoundingClientRect().height };
  });
  expect(active.fw).toBe(700);
  expect(active.shadow).toContain('rgba(15, 23, 42, 0.12)');
  expect(active.h).toBeGreaterThanOrEqual(44);

  // 3. Hero rapat
  const hero = await page.locator('.hero-compact').evaluate((el) => {
    const s = getComputedStyle(el);
    return { pt: s.paddingTop, mt: s.marginTop };
  });
  expect(hero.pt).toBe('12px');
  expect(hero.mt).toBe('0px');

  const h1 = await page.locator('.hero-compact h1').evaluate((el) => {
    const s = getComputedStyle(el);
    return { lh: parseFloat(s.lineHeight) / parseFloat(s.fontSize), mb: s.marginBottom };
  });
  expect(h1.lh).toBeCloseTo(1.2, 1);
  expect(h1.mb).toBe('4px');

  // 4. Preset chip pipih tapi tetap >=44px
  const chip = await page.locator('.preset-chip').first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { pad: s.padding, br: s.borderRadius, fs: s.fontSize, h: el.getBoundingClientRect().height };
  });
  expect(chip.pad).toBe('0px 12px');
  expect(parseFloat(chip.br)).toBe(8);
  expect(chip.fs).toBe('12px');
  expect(chip.h).toBeGreaterThanOrEqual(44);

  // Tetap lulus assertionHG-012: nav link >= 44
  const navLink = await page.locator('.segmented-nav a').first().evaluate((el) => el.getBoundingClientRect().height);
  expect(navLink).toBeGreaterThanOrEqual(44);

  // No horizontal overflow 375x812
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
