// HG-008 audit fix — regresi untuk 5 temuan UI audit (UI-001/002/006/007/008).
import { test, expect } from '@playwright/test';

test.describe('audit-fix', () => {
  test('UI-001: tap target input/select/btn >= 44px (mobile)', async ({ page }) => {
    await page.goto('/');
    const heights = await page.evaluate(() =>
      [...document.querySelectorAll('#form-gaji input, #form-gaji select, #btn-hitung')]
        .map((e) => Math.round(e.getBoundingClientRect().height))
    );
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
  });

  test('UI-002: format ribuan otomatis + submit tetap benar', async ({ page }) => {
    await page.goto('/');
    await page.locator('#gaji-pokok').pressSequentially('10000000');
    await expect(page.locator('#gaji-pokok')).toHaveValue('Rp 10.000.000');
    await page.click('#btn-hitung');
    await expect(page.locator('#thp')).toContainText('Rp');
    // nilai terformat tetap menghasilkan angka sama seperti input mentah
    const thp = await page.locator('#thp').innerText();
    await page.fill('#gaji-pokok', '10000000');
    await page.fill('#gaji-pokok', 'Rp 10.000.000');
    await page.click('#btn-hitung');
    await expect(page.locator('#thp')).toHaveText(thp);
  });

  test('UI-002b: compare input juga terformat & hasil akurat', async ({ page }) => {
    await page.goto('/compare.html');
    await page.fill('#a-gaji', '14000000');
    await expect(page.locator('#a-gaji')).toHaveValue('Rp 14.000.000');
    await page.fill('#b-gaji', '12500000');
    await page.click('#btn-bandingkan');
    await expect(page.locator('.compare-card')).toHaveCount(2);
    await expect(page.locator('.compare-card.winner')).toBeVisible();
  });

  test('UI-006: paywall punya preview nilai terkunci (blur)', async ({ page }) => {
    await page.goto('/offer-analyzer.html');
    const locked = page.locator('#paywall .locked-preview .locked');
    await expect(locked.first()).toBeVisible();
    const filter = await locked.first().evaluate((e) => getComputedStyle(e).filter);
    expect(filter).toContain('blur');
  });

  test('UI-007: tombol copy kode lisensi + toast Tersalin', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/pay.html');
    await page.evaluate(() => {
      document.getElementById('lic-code').textContent = 'HG-TEST-1234';
      document.getElementById('lic-result').hidden = false;
    });
    await page.click('#btn-copy');
    await expect(page.locator('#copy-toast')).toContainText('Tersalin');
  });

  test('UI-008: CTA simulasi pre-fill kalkulator (?gaji=…&ptkp=…)', async ({ page }) => {
    // hasil prefill harus sama dengan isi manual
    await page.goto('/index.html?gaji=8000000&ptkp=TK/0');
    await expect(page.locator('#hasil')).toBeVisible();
    const thpPrefill = await page.locator('#thp').innerText();
    expect(thpPrefill).not.toBe('—');

    await page.goto('/');
    await page.fill('#gaji-pokok', '8000000');
    await page.selectOption('#ptkp', 'TK/0');
    await page.click('#btn-hitung');
    await expect(page.locator('#thp')).toHaveText(thpPrefill);
  });
});
