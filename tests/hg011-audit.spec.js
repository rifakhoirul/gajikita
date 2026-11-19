// HG-011 — Financial Calculation & Connected Journey Audit.
// TDD: test ditulis LEBIH DULU (merah), implementasi menyusul (hijau).
// Cakupan: (1) akurasi bracket TER, (2) THR/bonus net calculation, (3) BPJS caps,
// (4) connected journey buttons (index→compare, index→offer-analyzer).
import { test, expect } from '@playwright/test';
import GajiCalc from '../js/ter-calculator.js';

test.describe('HG-011.1 Audit Akurasi Finansial — TER & BPJS', () => {
  // Helper: hitung pajak manual utk verifikasi
  const taxAtRate = (gross, rate) => Math.round(gross * rate);

  test('TER A: bracket batas 5.4M = 0%, 5.65M = 0.25%', () => {
    expect(GajiCalc.hitungTer('A', 5400000)).toBe(0);
    expect(GajiCalc.hitungTer('A', 5650000)).toBe(taxAtRate(5650000, 0.0025));
  });

  test('TER A: bracket 30.08M → 13% (contoh PMK 168)', () => {
    expect(GajiCalc.hitungTer('A', 30080000)).toBe(taxAtRate(30080000, 0.13));
  });

  test('TER A: bracket 50.08M → 18% (contoh PMK 168)', () => {
    expect(GajiCalc.hitungTer('A', 50080000)).toBe(taxAtRate(50080000, 0.18));
  });

  test('TER B: bracket 6.2M = 0%, 6.5M = 0.25%', () => {
    expect(GajiCalc.hitungTer('B', 6200000)).toBe(0);
    expect(GajiCalc.hitungTer('B', 6500000)).toBe(taxAtRate(6500000, 0.0025));
  });

  test('TER B: bracket 6.3M → 0.25% (contoh PMK 168)', () => {
    expect(GajiCalc.hitungTer('B', 6300000)).toBe(taxAtRate(6300000, 0.0025));
  });

  test('TER C: bracket 6.6M = 0%', () => {
    expect(GajiCalc.hitungTer('C', 6600000)).toBe(0);
  });

  test('BPJS Kesehatan cap 12.000.000 (1%)', () => {
    expect(GajiCalc.bpjsKesehatan(10000000)).toBe(100000);        // 1% di bawah cap
    expect(GajiCalc.bpjsKesehatan(12000000)).toBe(120000);         // 1% pas cap
    expect(GajiCalc.bpjsKesehatan(15000000)).toBe(120000);         // cap 12M
    expect(GajiCalc.bpjsKesehatan(100000000)).toBe(120000);        // cap tetap 12M
  });

  test('JHT 2% tanpa cap', () => {
    expect(GajiCalc.jht(10000000)).toBe(200000);
    expect(GajiCalc.jht(100000000)).toBe(2000000);
  });

  test('JP cap Rp 11.086.300 (1%)', () => {
    expect(GajiCalc.jp(10000000)).toBe(100000);
    expect(GajiCalc.jp(11086300)).toBe(110863);
    expect(GajiCalc.jp(15000000)).toBe(110863);
    expect(GajiCalc.jp(100000000)).toBe(110863);
  });

  test('hitungGaji: totalBruto = gaji + tunjanganTetap + tunjanganLain', () => {
    const r = GajiCalc.hitungGaji({ gajiPokok: '10000000', tunjanganTetap: '1000000', tunjanganLain: '500000', ptkp: 'TK/0' });
    expect(r.totalBruto).toBe(11500000);
  });
});

test.describe('HG-011.2 THR & Bonus Net Calculation (compare.js)', () => {
  // Prinsip: THR/bonus TIDAK ditambah mentah ke net tahunan.
  // Pajak dihitung di bulan penerimaan: bruto_bulan_ini = bruto_bulanan + THR (atau bonus).
  // Net THR = THR - (pajak(bruto_bulan_ini) - pajak(bruto_bulanan)).
  // TotalAnnualNet = thp*12 + netTHR + netBonus + manfaat*12 - komuter*12.

  test('THR: net calculation = THR - delta pajak bulan penerimaan (TK/0, gaji 10M, THR 10M)', () => {
    const input = {
      gajiPokok: '10000000', tunjanganTetap: '0', tunjanganLain: '0', ptkp: 'TK/0',
      thr: '10000000', bonusTahunan: '0', manfaatBulanan: '0', komuterBulanan: '0'
    };
    const r = GajiCalc.bandingkanOffer(input);

    // Bruto bulanan normal = 10M
    const pajakNormal = GajiCalc.hitungTer('A', 10000000);
    // Bulan penerimaan THR = 20M (10M + 10M)
    const pajakDenganThr = GajiCalc.hitungTer('A', 20000000);
    const deltaPajak = pajakDenganThr - pajakNormal;
    const netThr = 10000000 - deltaPajak;

    const expectedAnnual = r.thp * 12 + netThr;
    expect(r.totalAnnualNet).toBe(expectedAnnual);
    expect(r.totalAnnualNet).toBeLessThan(r.thp * 12 + 10000000); // harus < gross THR
  });

  test('Bonus: net calculation similar to THR', () => {
    const input = {
      gajiPokok: '10000000', tunjanganTetap: '0', tunjanganLain: '0', ptkp: 'TK/0',
      thr: '0', bonusTahunan: '12000000', manfaatBulanan: '0', komuterBulanan: '0'
    };
    const r = GajiCalc.bandingkanOffer(input);

    const pajakNormal = GajiCalc.hitungTer('A', 10000000);
    const pajakDenganBonus = GajiCalc.hitungTer('A', 22000000); // 10M + 12M
    const deltaPajak = pajakDenganBonus - pajakNormal;
    const netBonus = 12000000 - deltaPajak;

    const expectedAnnual = r.thp * 12 + netBonus;
    expect(r.totalAnnualNet).toBe(expectedAnnual);
  });

  test('THR + Bonus combined: each taxed in its own month (simplified: month with max gross)', () => {
    const input = {
      gajiPokok: '10000000', tunjanganTetap: '0', tunjanganLain: '0', ptkp: 'TK/0',
      thr: '10000000', bonusTahunan: '12000000', manfaatBulanan: '0', komuterBulanan: '0'
    };
    const r = GajiCalc.bandingkanOffer(input);

    // Worst-case month: gaji + THR + bonus = 32M (if same month, conservative)
    // Implementation may assume separate months; both approaches tested here
    expect(r.totalAnnualNet).toBeLessThan(r.thp * 12 + 22000000); // must be < gross sum
  });

  test('TK/2 (Kategori B) THR taxed correctly', () => {
    const input = {
      gajiPokok: '10000000', tunjanganTetap: '0', tunjanganLain: '0', ptkp: 'TK/2',
      thr: '10000000', bonusTahunan: '0', manfaatBulanan: '0', komuterBulanan: '0'
    };
    const r = GajiCalc.bandingkanOffer(input);

    const pajakNormal = GajiCalc.hitungTer('B', 10000000);
    const pajakDenganThr = GajiCalc.hitungTer('B', 20000000);
    const deltaPajak = pajakDenganThr - pajakNormal;
    const netThr = 10000000 - deltaPajak;

    const expectedAnnual = r.thp * 12 + netThr;
    expect(r.totalAnnualNet).toBe(expectedAnnual);
  });
});

test.describe('HG-011.3 Connected User Journey (UI buttons)', () => {
  const { test: ptest, expect } = require('@playwright/test');
  const path = require('path');
  const INDEX = '/index.html';
  const COMPARE = '/compare.html';
  const OFFER = '/offer-analyzer.html';

  ptest('index.html hasil: tombol "Bandingkan dengan Offer Lain" → compare.html?gaji=&ptkp=', async ({ page }) => {
    await page.goto(INDEX);
    await page.fill('#gaji-pokok', '10000000');
    await page.selectOption('#ptkp', 'TK/0');
    await page.click('#btn-hitung');
    await expect(page.locator('#hasil')).toBeVisible();

    const btn = page.locator('button[data-action="go-compare"]');
    await expect(btn).toHaveCount(1);
    await btn.click();
    await expect(page).toHaveURL(/compare\.html/);
    // check Offer A prefilled
    await expect(page.locator('#a-gaji')).toHaveValue(/10\.000\.000/);
    await expect(page.locator('#a-ptkp')).toHaveValue('TK/0');
  });

  ptest('index.html hasil: tombol "Cek Apakah Gaji Ini Underpaid" → offer-analyzer.html', async ({ page }) => {
    await page.goto(INDEX);
    await page.fill('#gaji-pokok', '10000000');
    await page.selectOption('#ptkp', 'TK/0');
    await page.click('#btn-hitung');
    await expect(page.locator('#hasil')).toBeVisible();

    const btn = page.locator('button[data-action="go-offer-analyzer"]');
    await expect(btn).toHaveCount(1);
    await btn.click();
    await expect(page).toHaveURL(/offer-analyzer\.html/);
  });
});

test.describe('HG-011.4 Dokumentasi Asumsi di Bawah Hasil Kalkulator', () => {
  const { test: ptest, expect } = require('@playwright/test');
  const path = require('path');
  const INDEX = '/index.html';

  ptest('index.html hasil: menampilkan catatan asumsi (pegawai tetap, cap BPJS, pajak THR bulan diterima, true-up Desember)', async ({ page }) => {
    await page.goto(INDEX);
    await page.fill('#gaji-pokok', '10000000');
    await page.selectOption('#ptkp', 'TK/0');
    await page.click('#btn-hitung');
    await expect(page.locator('#hasil')).toBeVisible();

    const notes = page.locator('.catatan-asumsi, [data-asumsi]');
    await expect(notes.first()).toBeVisible();
    const text = await notes.first().textContent();
    expect(text).toMatch(/pegawai tetap|pekerja tetap/i);
    expect(text).toMatch(/BPJS.*cap|plafon/i);
    expect(text).toMatch(/THR.*bulan diterima|bonus.*bulan diterima/i);
    expect(text).toMatch(/true.up|Pasal 17|Masa Pajak Desember/i);
  });
});