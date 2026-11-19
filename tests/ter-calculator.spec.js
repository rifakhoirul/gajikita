// HG-002 — Unit test kalkulator PPh 21 TER + BPJS (client-side, ES module).
// Data acuan: Lampiran PP 58/2023 (PMK 168/2023) + 4 contoh resmi DJP/PMK
// (30.080.000→13% A, 35.080.000→14% A, 50.080.000→18% A, 6.300.000→0,25% B)
// + contoh DJP Tuan R (10.000.000 A → 200.000).
// Plafon 2026: JP = 11.086.300 (mulai 1 Mar 2026); BPJS Kesehatan = 12.000.000.
const { test, expect } = require('@playwright/test');
const path = require('path');

const MOD = path.resolve(__dirname, '..', 'js', 'ter-calculator.js');

let calc;
test.beforeAll(async () => {
  const { loadModule } = await import('file://' + MOD);
  calc = loadModule();
});

test.describe('kategori TER', () => {
  test('mapping PTKP → kategori', () => {
    expect(calc.kategoriFromPtkp('TK/0')).toBe('A');
    expect(calc.kategoriFromPtkp('TK/1')).toBe('A');
    expect(calc.kategoriFromPtkp('K/0')).toBe('A');
    expect(calc.kategoriFromPtkp('TK/2')).toBe('B');
    expect(calc.kategoriFromPtkp('TK/3')).toBe('B');
    expect(calc.kategoriFromPtkp('K/1')).toBe('B');
    expect(calc.kategoriFromPtkp('K/2')).toBe('B');
    expect(calc.kategoriFromPtkp('K/3')).toBe('C');
    expect(calc.kategoriFromPtkp('k0')).toBe('A'); // case-insensitive
    expect(() => calc.kategoriFromPtkp('ZZ/9')).toThrow();
  });

  test('jumlah bracket tabel: A=44, B=40, C=41', () => {
    expect(calc.TER_TABLE.A.length).toBe(44);
    expect(calc.TER_TABLE.B.length).toBe(40);
    expect(calc.TER_TABLE.C.length).toBe(41);
  });

  test('bracket 0% & bracket teratas', () => {
    expect(calc.terRate('A', 5_400_000)).toBe(0);
    expect(calc.terRate('A', 1_400_000_001)).toBe(0.34);
    expect(calc.terRate('B', 6_200_000)).toBe(0);
    expect(calc.terRate('B', 1_405_000_001)).toBe(0.34);
    expect(calc.terRate('C', 6_600_000)).toBe(0);
    expect(calc.terRate('C', 1_419_000_001)).toBe(0.34);
  });

  test('contoh resmi DJP/PMK (4 kasus)', () => {
    expect(calc.terRate('A', 30_080_000)).toBe(0.13);
    expect(calc.terRate('A', 35_080_000)).toBe(0.14);
    expect(calc.terRate('A', 50_080_000)).toBe(0.18);
    expect(calc.terRate('B', 6_300_000)).toBe(0.0025);
    // Tuan R (contoh resmi DJP): 10jt K/0 → 2% → 200rb
    expect(calc.terRate('A', 10_000_000)).toBe(0.02);
    expect(calc.hitungTer('A', 10_000_000)).toBe(200_000);
  });
});

test.describe('BPJS', () => {
  test('BPJS Kesehatan 1% cap 12jt', () => {
    expect(calc.bpjsKesehatan(15_000_000)).toBe(120_000);
    expect(calc.bpjsKesehatan(8_000_000)).toBe(80_000);
    expect(calc.bpjsKesehatan(12_000_000)).toBe(120_000);
  });
  test('JHT 2% tanpa cap', () => {
    expect(calc.jht(20_000_000)).toBe(400_000);
  });
  test('JP 1% cap 11.086.300 (plafon 2026)', () => {
    expect(calc.jp(15_000_000)).toBe(110_863);
    expect(calc.jp(11_086_300)).toBe(110_863);
    expect(calc.jp(8_000_000)).toBe(80_000);
  });
});

test.describe('hitungGaji end-to-end', () => {
  test('kasus Tuan R — K/0, 10jt, pensiun 100rb (per PRD 3.1.2)', () => {
    const r = calc.hitungGaji({ gajiPokok: 10_000_000, tunjanganTetap: 0, tunjanganLain: 0, ptkp: 'K/0' });
    expect(r.totalBruto).toBe(10_000_000);
    expect(r.potongan.bpjsKesehatan).toBe(100_000);
    expect(r.potongan.jht).toBe(200_000);
    expect(r.potongan.jp).toBe(100_000);
    expect(r.potongan.pph21).toBe(200_000);
    expect(r.thp).toBe(9_400_000);
    // THP tanpa tunjangan lain tidak boleh negatif & konsisten
    expect(r.thp).toBe(r.totalBruto - (r.potongan.bpjsKesehatan + r.potongan.jht + r.potongan.jp + r.potongan.pph21));
  });

  test('total bruto = gaji + tunjangan tetap + tunjangan lain (PRD 3.1.1)', () => {
    const r = calc.hitungGaji({ gajiPokok: 5_000_000, tunjanganTetap: 1_000_000, tunjanganLain: 500_000, ptkp: 'TK/0' });
    expect(r.totalBruto).toBe(6_500_000);
  });

  test('bruto > plafon: JP mentok 110.863, Kes mentok 120.000, JHT tetap 2%', () => {
    const r = calc.hitungGaji({ gajiPokok: 20_000_000, tunjanganTetap: 0, tunjanganLain: 0, ptkp: 'TK/0' });
    expect(r.potongan.jp).toBe(110_863);
    expect(r.potongan.bpjsKesehatan).toBe(120_000);
    expect(r.potongan.jht).toBe(400_000);
    expect(r.potongan.pph21).toBe(20_000_000 * 0.09); // 24.150.000-26.450.000 → 9% (klikpajak row 19/20)
  });

  test('input tidak valid ditolak', () => {
    expect(() => calc.hitungGaji({ gajiPokok: -1, ptkp: 'TK/0' })).toThrow();
    expect(() => calc.hitungGaji({ gajiPokok: 'abc', ptkp: 'TK/0' })).toThrow();
    expect(() => calc.hitungGaji({ gajiPokok: '', ptkp: 'TK/0' })).toThrow();
    expect(() => calc.hitungGaji({ gajiPokok: null, ptkp: 'TK/0' })).toThrow();
    expect(() => calc.hitungGaji({ ptkp: 'TK/0' })).toThrow();
    expect(() => calc.hitungGaji({ gajiPokok: 5_000_000, ptkp: 'ZZ' })).toThrow();
  });
});

test.describe('komparasi offer (PRD 3.2)', () => {
  test('annualized = THP x12 + netTHR + netBonus + manfaat − komuter', () => {
    const offerA = calc.bandingkanOffer({
      gajiPokok: 10_000_000, ptkp: 'K/0', thr: 10_000_000, bonusTahunan: 5_000_000,
      manfaatBulanan: 500_000, komuterBulanan: 1_000_000,
    });
    // THP 9.400.000 × 12 = 112.800.000
    // net THR = 10M - delta pajak (bruto 10M→20M, pajak 200k→1.8M, delta=1.6M) = 8.4M
    // net Bonus = 5M - delta pajak (bruto 10M→15M, pajak 200k→750k, delta=550k) = 4.45M
    // manfaat = 500k × 12 = 6M
    // komuter = 1M × 12 = 12M
    // Total = 112.8M + 8.4M + 4.45M + 6M - 12M = 119.65M
    expect(offerA.totalAnnualNet).toBe(119_500_000);
  });

  test(' dua offer → pemenang & selisih', () => {
    const a = calc.bandingkanOffer({ gajiPokok: 8_000_000, ptkp: 'TK/0' });
    const b = calc.bandingkanOffer({ gajiPokok: 9_000_000, ptkp: 'TK/0' });
    const cmp = calc.bandingkanDuaOffer(a, b);
    expect(cmp.winner).toBe('B');
    expect(cmp.selisih).toBe(b.totalAnnualNet - a.totalAnnualNet);
    expect(cmp.selisih).toBeGreaterThan(0);
  });
});
