// HG-010 — Pre-Launch Compliance & UX Polish.
// TDD: file ini ditulis LEBIH DULU (merah), implementasi menyusul (hijau).
// Cakupan: (1) kelengkapan dropdown PTKP TK/2 & TK/3 → TER Kategori B,
// (2) privasi UU PDP + halaman legal + footer, (3) UX & konversi.
const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX = 'file://' + path.resolve(__dirname, '..', 'index.html');
const COMPARE = 'file://' + path.resolve(__dirname, '..', 'compare.html');
const OFFER = 'file://' + path.resolve(__dirname, '..', 'offer-analyzer.html');
const MAIN_PAGES = ['index.html', 'compare.html', 'offer-analyzer.html', 'pay.html'];
const LEGAL = ['privacy.html', 'terms.html', 'disclaimer.html'];

test.describe('HG-010.1 Kelengkapan PTKP', () => {
  test('dropdown PTKP index.html memuat TK/0..TK/3 & K/0..K/3 lengkap', async ({ page }) => {
    await page.goto(INDEX);
    const values = await page.locator('#ptkp option').evaluateAll((os) => os.map((o) => o.value));
    for (const v of ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3']) {
      expect(values, 'option ' + v).toContain(v);
    }
  });

  test('dropdown PTKP compare.html (Offer A & B) memuat TK/2 & TK/3', async ({ page }) => {
    await page.goto(COMPARE);
    for (const id of ['a-ptkp', 'b-ptkp']) {
      const values = await page.locator('#' + id + ' option').evaluateAll((os) => os.map((o) => o.value));
      expect(values, id).toContain('TK/2');
      expect(values, id).toContain('TK/3');
    }
  });

  test('TK/2 dipetakan ke TER Kategori B saat simulasi (PMK 168/2023)', async ({ page }) => {
    await page.goto('/index.html'); // via webServer — modul ES butuh http://
    await page.fill('#gaji-pokok', '10000000');
    await page.selectOption('#ptkp', 'TK/2');
    await page.click('#btn-hitung');
    await expect(page.locator('#rincian-potongan')).toContainText('Kategori B');
  });
});

test.describe('HG-010.2 Privasi & halaman legal', () => {
  test('offer-analyzer.html: klaim lama diganti notice UU PDP yang akurat', async ({ page }) => {
    await page.goto(OFFER);
    const html = await page.content();
    expect(html).not.toContain('Tidak ada data yang dikirim ke server');
    expect(html).toContain('UU PDP');
    expect(html).toContain('tidak disimpan permanen');
    expect(html).toContain('tidak dipakai untuk melatih model');
    expect(html).toContain('privacy.html'); // tautan ke kebijakan lengkap
  });

  test('halaman legal tersedia & footer seluruh halaman menautkannya + disclaimer edukatif', async ({ page }) => {
    for (const f of LEGAL) {
      const res = await page.request.get('http://localhost:8093/' + f);
      expect(res.ok(), 'halaman ' + f + ' harus 200').toBeTruthy();
    }
    for (const f of MAIN_PAGES) {
      await page.goto('/' + f);
      const footer = page.locator('footer.site-footer');
      await expect(footer.locator('a[href="privacy.html"]')).toHaveCount(1);
      await expect(footer.locator('a[href="terms.html"]')).toHaveCount(1);
      await expect(footer.locator('a[href="disclaimer.html"]')).toHaveCount(1);
      await expect(footer).toContainText('bukan nasihat pajak atau hukum resmi');
    }
  });

  test('disclaimer.html memuat kalimat wajib & konteks regulasi', async ({ page }) => {
    await page.goto('/disclaimer.html');
    const html = await page.content();
    expect(html).toContain('Simulasi ini bersifat edukatif dan bukan nasihat pajak atau hukum resmi');
    expect(html).toContain('PP 58/2023');
    expect(html).toContain('Pasal 17');
  });
});

test.describe('HG-010.3 UX & Konversi', () => {
  test('CTA hero dihapus (HG-013 polish) & <title> memuat Tahun 2026', async ({ page }) => {
    await page.goto(INDEX);
    await expect(page.locator('.hero-cta')).toHaveCount(0);
    await expect(page.locator('#kalkulator')).toBeVisible();
    await expect(page).toHaveTitle(/Tahun 2026/);
  });

  test('preset cepat "UMR Jakarta" & "Gaji Rp 12 Juta" mengisi form & langsung menghitung', async ({ page }) => {
    await page.goto('/index.html');
    await page.click('button[data-preset="5729876"]'); // UMP DKI 2026
    await expect(page.locator('#hasil')).toBeVisible();
    await expect(page.locator('#gaji-pokok')).toHaveValue(/5\.729\.876/);
    await page.click('button[data-preset="12000000"]');
    await expect(page.locator('#gaji-pokok')).toHaveValue(/12\.000\.000/);
    await expect(page.locator('#thp')).toContainText('Rp');
  });

  test('compare.html: rumus transparan (komuter, pajak THR/bonus bulan diterima, true-up Desember)', async ({ page }) => {
    await page.goto(COMPARE);
    const html = await page.content();
    expect(html.toLowerCase()).toContain('biaya komuter');
    expect(html.toLowerCase()).toContain('bulan diterima');
    expect(html.toLowerCase()).toContain('true-up');
    expect(html.toLowerCase()).toContain('pasal 17');
    expect(html.toLowerCase()).toContain('desember');
  });

  test('offer-analyzer: "Estimasi Rentang Pasar", panduan kode lisensi, kartu Contoh Output Pro', async ({ page }) => {
    await page.goto(OFFER);
    const html = await page.content();
    expect(html).toContain('Estimasi Rentang Pasar');
    expect(html).not.toContain('Benchmark Pasar');
    expect(html).toContain('HG-XXXX-XXXX');
    expect(html).toContain('email');
    expect(html).toContain('Contoh Output Analisis Pro');
    expect(html).toContain('Rp 11'); // angka counter-offer studi kasus anonim
  });
});
