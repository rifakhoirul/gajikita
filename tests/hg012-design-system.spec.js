// HG-012: Mobile-First Fintech UI Redesign — dual viewport & design-system validation.
// ATURAN: TIDAK mengubah id/name/data-testid/form/logika JS. Test ini hanya VALIDASI visual & a11y.
const { test, expect } = require('@playwright/test');

const VIEWPORTS = [
  { name: 'Mobile 375x812', width: 375, height: 812 },
  { name: 'Desktop 1280x800', width: 1280, height: 800 },
];

const PAGES = ['/', '/compare.html', '/offer-analyzer.html', '/pay.html'];

for (const vp of VIEWPORTS) {
  test.describe(`HG-012 viewport ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const p of PAGES) {
      test(`no horizontal overflow di ${p}`, async ({ page }) => {
        await page.goto(p);
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth - document.documentElement.clientWidth;
        });
        expect(overflow, `horizontal overflow ${overflow}px di ${p} (${vp.name})`).toBeLessThanOrEqual(0);
      });
    }

    test('interactive elements >= 44px & inputs >= 48px @16px (index.html)', async ({ page }) => {
      await page.goto('/');
      // Tombol utama & preset chips & nav segmented
      const btn = page.locator('#btn-hitung');
      await expect(btn).toBeVisible();
      const box = await btn.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);

      const chip = page.locator('.preset-chip').first();
      const chipBox = await chip.boundingBox();
      expect(chipBox.height).toBeGreaterThanOrEqual(44);

      const nav = page.locator('.segmented-nav a').first();
      const navBox = await nav.boundingBox();
      expect(navBox.height).toBeGreaterThanOrEqual(44);

      // Input & select 48px, font-size 16px (iOS anti-zoom)
      const gaji = page.locator('#gaji-pokok');
      const gajiBox = await gaji.boundingBox();
      expect(gajiBox.height).toBeGreaterThanOrEqual(48);
      const fontSize = await gaji.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
      expect(fontSize).toBe(16);

      const ptkp = page.locator('#ptkp');
      const ptkpBox = await ptkp.boundingBox();
      expect(ptkpBox.height).toBeGreaterThanOrEqual(48);
      const ptkpFont = await ptkp.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
      expect(ptkpFont).toBe(16);
    });

    if (vp.width === 375) {
      test('above the fold 375x812: header+nav+hero+preset+input Gaji Pokok tanpa scroll', async ({ page }) => {
        await page.goto('/');
        const fold = await page.evaluate(() => {
          const ids = ['gaji-pokok'];
          const sels = ['header.app-header', '.segmented-nav', '.hero-compact', '.preset-bar'];
          let maxBottom = 0;
          for (const sel of [...sels, ...ids.map(id => `#${id}`)]) {
            const el = document.querySelector(sel);
            if (!el) return { missing: sel };
            const r = el.getBoundingClientRect();
            if (r.bottom > maxBottom) maxBottom = r.bottom;
          }
          return { maxBottom, fold: window.innerHeight };
        });
        expect(fold.missing, `elemen di atas fold hilang: ${fold.missing}`).toBeUndefined();
        expect(
          fold.maxBottom,
          `elemen terbawah (${fold.maxBottom}px) melebihi fold ${fold.fold}px`
        ).toBeLessThanOrEqual(fold.fold);
      });

      test('footer UU PDP: Varian A di index/compare, Varian B di offer-analyzer/pay', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('footer.footer-variant-a')).toContainText('100% lokal di browser');
        await page.goto('/compare.html');
        await expect(page.locator('footer.footer-variant-a')).toContainText('100% lokal di browser');
        await page.goto('/offer-analyzer.html');
        await expect(page.locator('footer.footer-variant-b')).toContainText('tidak disimpan permanen');
        await expect(page.locator('footer.footer-variant-b')).toContainText('tidak digunakan untuk melatih model');
        await page.goto('/pay.html');
        await expect(page.locator('footer.footer-variant-b')).toContainText('tidak disimpan permanen');
      });

      test('design-system tokens aktif: Plus Jakarta Sans & var(--color-primary)', async ({ page }) => {
        await page.goto('/');
        const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
        expect(font).toContain('Plus Jakarta Sans');
        const primary = await page.evaluate(() =>
          getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
        );
        expect(primary).not.toBe('');
      });
    }
  });
}
