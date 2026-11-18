// HG-005 — E2E UI Kalkulator (index.html) & Adu Offering (compare.html).
// Dijalankan via webServer http://localhost:8093 (ES module — file:// diblokir).
const { test, expect } = require('@playwright/test');

async function isiKalkulator(page, { gaji, tetap = '', lain = '', ptkp = 'K/0' }) {
  await page.fill('#gaji-pokok', String(gaji));
  await page.fill('#tunjangan-tetap', String(tetap));
  await page.fill('#tunjangan-lain', String(lain));
  await page.selectOption('#ptkp', ptkp);
  await page.click('#btn-hitung');
}

test.describe('Kalkulator Gaji (index.html)', () => {
  test('form & tombol hitung tampil', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#gaji-pokok')).toBeVisible();
    await expect(page.locator('#ptkp')).toBeVisible();
    await expect(page.locator('#btn-hitung')).toBeVisible();
  });

  test('10jt K/0 → THP 9.400.000 + breakdown + donut', async ({ page }) => {
    await page.goto('/index.html');
    await isiKalkulator(page, { gaji: 10000000 });
    const hasil = page.locator('#hasil');
    await expect(hasil).toBeVisible();
    await expect(hasil).toContainText('9.400.000');      // THP
    await expect(hasil).toContainText('200.000');        // PPh 21 TER 2%
    await expect(hasil).toContainText('2%');             // tarif TER tampil
    await expect(page.locator('#donut')).toBeVisible();  // grafik donut (SVG)
    await expect(hasil).toContainText('112.800.000');    // proyeksi tahunan THP x12
  });

  test('input kosong → pesan error ramah, tanpa crash', async ({ page }) => {
    await page.goto('/index.html');
    await page.click('#btn-hitung');
    await expect(page.locator('#form-error')).toBeVisible();
  });
});

test.describe('Adu Offering (compare.html)', () => {
  test('dua offer → pemenang B & THP tampil', async ({ page }) => {
    await page.goto('/compare.html');
    await page.fill('#a-gaji', '8000000');
    await page.selectOption('#a-ptkp', 'TK/0');
    await page.fill('#b-gaji', '9000000');
    await page.selectOption('#b-ptkp', 'TK/0');
    await page.click('#btn-bandingkan');
    const hasil = page.locator('#hasil-compare');
    await expect(hasil).toBeVisible();
    await expect(hasil).toContainText('Offer B');
    // A: 8jt → Kes 80rb + JHT 160rb + JP 80rb + TER 1,5% 120rb = THP 7.560.000
    await expect(hasil).toContainText('7.560.000');
    // B: 9jt → Kes 90rb + JHT 180rb + JP 90rb + TER 1,75% 157.500 = THP 8.482.500
    await expect(hasil).toContainText('8.482.500');
  });

  test('faktor non-finansial: skema kerja & komuter memengaruhi annual net', async ({ page }) => {
    await page.goto('/compare.html');
    await page.fill('#a-gaji', '10000000');
    await page.selectOption('#a-ptkp', 'K/0');
    await page.fill('#a-komuter', '1500000');            // Offer A WFO komuter mahal
    await page.selectOption('#a-skema', 'WFO');
    await page.fill('#b-gaji', '10000000');
    await page.selectOption('#b-ptkp', 'K/0');
    await page.fill('#b-komuter', '0');
    await page.selectOption('#b-skema', 'Remote');
    await page.click('#btn-bandingkan');
    const hasil = page.locator('#hasil-compare');
    await expect(hasil).toBeVisible();
    await expect(hasil).toContainText('Offer B');        // remote menang
    await expect(hasil).toContainText('WFO');            // label skema tampil
  });
});
