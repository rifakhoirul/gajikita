const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX = 'file://' + path.resolve(__dirname, '..', 'index.html');

test('homepage renders brand & hero', async ({ page }) => {
  await page.goto(INDEX);
  await expect(page).toHaveTitle(/GajiCVKita/);
  await expect(page.locator('.brand')).toContainText('CVKita');
  await expect(page.locator('h1')).toContainText('gaji bersih');
});

test('asset links use cache-bust ?v=<n>', async ({ page }) => {
  await page.goto(INDEX);
  // HG-012: 3 stylesheet kini (Google Fonts + design-system + style) — cek yang lokal css/
  const cssHrefs = await page.locator('link[rel="stylesheet"][href*="css/"]').evaluateAll(
    els => els.map(el => el.getAttribute('href'))
  );
  expect(cssHrefs.length).toBeGreaterThanOrEqual(2);
  for (const href of cssHrefs) expect(href).toMatch(/\?v=\d+/);
  const jsSrc = await page.locator('script[src]').getAttribute('src');
  expect(jsSrc).toMatch(/\?v=\d+/);
});

test('CNAME file points to custom domain', async () => {
  const fs = require('fs');
  const cname = fs.readFileSync(path.resolve(__dirname, '..', 'CNAME'), 'utf8').trim();
  expect(cname).toBe('gaji.cvkita.id');
});
