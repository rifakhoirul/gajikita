// GajiCVKita — Kalkulator PPh 21 TER (PP 58/2023) & BPJS — 100% client-side.
// HG-002. Sumber tarif: Lampiran PP 58/2023 (verified via klikpajak/online-pajak,
// cross-check 4 contoh resmi PMK 168/2023: 30.080.000→13% A, 35.080.000→14% A,
// 50.080.000→18% A, 6.300.000→0,25% B, 10.000.000→2% A).
// Plafon 2026: JP Rp11.086.300 (berlaku 1 Mar 2026); BPJS Kesehatan Rp12.000.000.
// Tanpa API call, tanpa KV — semua di browser (PRD 1.4).

'use strict';

// UI-002 (audit): parser toleran untuk input terformat — "Rp 10.000.000",
// "10.000.000", "10,5 jt"-style koma desimal id-ID, atau angka mentah "10000000".
// Koma = desimal id-ID; titik = pemisah ribuan; spasi/Rp/$ diabaikan.
function parseRupiah(raw) {
  if (typeof raw === 'number') return raw;
  if (raw == null) return NaN;
  let s = String(raw).trim().replace(/[Rp$\s]/gi, '');
  if (s === '') return NaN;
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) {
    // pemisah ribuan = tanda yang muncul terakhir sebelum digit desimal
    if (s.lastIndexOf('.') > s.lastIndexOf(',')) s = s.replace(/,/g, '');
    else s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    // koma tunggal diikuti <=2 digit → desimal; lainnya → pemisah ribuan
    if (/,\d{1,2}$/.test(s)) s = s.replace(',', '.');
    else s = s.replace(/,/g, '');
  }
  return Number(s);
}

// [batas-atas-bracket, tarif] — bracket terakhir Infinity.
const TER_TABLE = {
  A: [
    [5400000, 0], [5650000, 0.0025], [5950000, 0.005], [6300000, 0.0075],
    [6750000, 0.01], [7500000, 0.0125], [8550000, 0.015], [9650000, 0.0175],
    [10050000, 0.02], [10350000, 0.0225], [10700000, 0.025], [11050000, 0.03],
    [11600000, 0.035], [12500000, 0.04], [13750000, 0.05], [15100000, 0.06],
    [16950000, 0.07], [19750000, 0.08], [24150000, 0.09], [26450000, 0.1],
    [28000000, 0.11], [30050000, 0.12], [32400000, 0.13], [35400000, 0.14],
    [39100000, 0.15], [43850000, 0.16], [47800000, 0.17], [51400000, 0.18],
    [56300000, 0.19], [62200000, 0.2], [68600000, 0.21], [77500000, 0.22],
    [89000000, 0.23], [103000000, 0.24], [125000000, 0.25], [157000000, 0.26],
    [206000000, 0.27], [337000000, 0.28], [454000000, 0.29], [550000000, 0.3],
    [695000000, 0.31], [910000000, 0.32], [1400000000, 0.33], [Infinity, 0.34],
  ],
  B: [
    [6200000, 0], [6500000, 0.0025], [6850000, 0.005], [7300000, 0.0075],
    [9200000, 0.01], [10750000, 0.015], [11250000, 0.02], [11600000, 0.025],
    [12600000, 0.03], [13600000, 0.04], [14950000, 0.05], [16400000, 0.06],
    [18450000, 0.07], [21850000, 0.08], [26000000, 0.09], [27700000, 0.1],
    [29350000, 0.11], [31450000, 0.12], [33950000, 0.13], [37100000, 0.14],
    [41100000, 0.15], [45800000, 0.16], [49500000, 0.17], [53800000, 0.18],
    [58500000, 0.19], [64000000, 0.2], [71000000, 0.21], [80000000, 0.22],
    [93000000, 0.23], [109000000, 0.24], [129000000, 0.25], [163000000, 0.26],
    [211000000, 0.27], [374000000, 0.28], [459000000, 0.29], [555000000, 0.3],
    [704000000, 0.31], [957000000, 0.32], [1405000000, 0.33], [Infinity, 0.34],
  ],
  C: [
    [6600000, 0], [6950000, 0.0025], [7350000, 0.005], [7800000, 0.0075],
    [8850000, 0.01], [9800000, 0.0125], [10950000, 0.015], [11200000, 0.0175],
    [12050000, 0.02], [12950000, 0.03], [14150000, 0.04], [15550000, 0.05],
    [17050000, 0.06], [19500000, 0.07], [22700000, 0.08], [26600000, 0.09],
    [28100000, 0.1], [30100000, 0.11], [32600000, 0.12], [35400000, 0.13],
    [38900000, 0.14], [43000000, 0.15], [47400000, 0.16], [51200000, 0.17],
    [55800000, 0.18], [60400000, 0.19], [66700000, 0.2], [74500000, 0.21],
    [83200000, 0.22], [95600000, 0.23], [110000000, 0.24], [134000000, 0.25],
    [169000000, 0.26], [221000000, 0.27], [390000000, 0.28], [463000000, 0.29],
    [561000000, 0.3], [709000000, 0.31], [965000000, 0.32], [1419000000, 0.33],
    [Infinity, 0.34],
  ],
};

const KATEGORI_MAP = {
  'TK/0': 'A', 'TK/1': 'A', 'K/0': 'A',
  'TK/2': 'B', 'TK/3': 'B', 'K/1': 'B', 'K/2': 'B',
  'K/3': 'C',
};

const BPJS_KES_CAP = 12000000;   // Perpres 64/2020 (2026 masih berlaku)
const JP_CAP = 11086300;         // plafon upah JP 2026 (berlaku 1 Mar 2026)

function kategoriFromPtkp(ptkp) {
  let key = String(ptkp || '').trim().toUpperCase();
  // Toleransi input tanpa slash: "k0" → "K/0", "tk2" → "TK/2".
  const loose = key.match(/^(TK|K)(\d)$/);
  if (loose) key = loose[1] + '/' + loose[2];
  const kat = KATEGORI_MAP[key];
  if (!kat) throw new Error('Status PTKP tidak dikenal: ' + ptkp);
  return kat;
}

function terRate(kategori, bruto) {
  const rows = TER_TABLE[kategori];
  if (!rows) throw new Error('Kategori TER tidak valid: ' + kategori);
  const b = Number(bruto);
  for (const [upper, rate] of rows) {
    if (b <= upper) return rate;
  }
  return rows[rows.length - 1][1];
}

function hitungTer(kategori, bruto) {
  return Math.round(bruto * terRate(kategori, bruto));
}

function bpjsKesehatan(bruto) {
  return Math.round(Math.min(bruto, BPJS_KES_CAP) * 0.01);
}

function jht(bruto) {
  return Math.round(bruto * 0.02);
}

function jp(bruto) {
  return Math.round(Math.min(bruto, JP_CAP) * 0.01);
}

function validasiInput(input) {
  const raw = input && input.gajiPokok;
  if (raw === '' || raw == null) {
    throw new Error('Gaji pokok wajib diisi');
  }
  const gaji = parseRupiah(raw);
  if (!Number.isFinite(gaji) || gaji < 0) {
    throw new Error('Gaji pokok harus angka >= 0');
  }
  kategoriFromPtkp(input.ptkp); // throws jika invalid
  return gaji;
}

// PRD 3.1.2: Total Bruto = Gaji Pokok + Tunjangan Tetap + Tunjangan Tidak Tetap.
// Potongan pekerja: BPJS Kes 1% (cap 12jt), JHT 2%, JP 1% (cap JP_CAP),
// PPh 21 TER = bruto x tarif TER kategori.
function hitungGaji(input) {
  const gaji = validasiInput(input);
  const tunjanganTetap = parseRupiah(input.tunjanganTetap) || 0;
  const tunjanganLain = parseRupiah(input.tunjanganLain) || 0;
  if (tunjanganTetap < 0 || tunjanganLain < 0) {
    throw new Error('Tunjangan tidak boleh negatif');
  }
  const totalBruto = gaji + tunjanganTetap + tunjanganLain;
  const kategori = kategoriFromPtkp(input.ptkp);
  const potongan = {
    bpjsKesehatan: bpjsKesehatan(totalBruto),
    jht: jht(totalBruto),
    jp: jp(totalBruto),
  };
  potongan.pph21 = hitungTer(kategori, totalBruto);
  potongan.total = potongan.bpjsKesehatan + potongan.jht + potongan.jp + potongan.pph21;
  const thp = totalBruto - potongan.total;
  return { totalBruto, kategori, tarifTer: terRate(kategori, totalBruto), potongan, thp };
}

// PRD 3.2.1: Total Annual Net = THP x12 + THR + Bonus + Manfaat bulanan x12
//                            - Komuter bulanan x12 (pengurang nilai efektif).
function bandingkanOffer(input) {
  const hasil = hitungGaji(input);
  const thr = parseRupiah(input.thr) || 0;
  const bonusTahunan = parseRupiah(input.bonusTahunan) || 0;
  const manfaatBulanan = parseRupiah(input.manfaatBulanan) || 0;
  const komuterBulanan = parseRupiah(input.komuterBulanan) || 0;
  const totalAnnualNet = hasil.thp * 12 + thr + bonusTahunan
    + manfaatBulanan * 12 - komuterBulanan * 12;
  return Object.assign(hasil, { thr, bonusTahunan, manfaatBulanan, komuterBulanan, totalAnnualNet });
}

function bandingkanDuaOffer(a, b) {
  const selisih = Math.abs(a.totalAnnualNet - b.totalAnnualNet);
  let winner = 'SERI';
  if (a.totalAnnualNet > b.totalAnnualNet) winner = 'A';
  else if (b.totalAnnualNet > a.totalAnnualNet) winner = 'B';
  return { winner, selisih };
}

// Ekspor ES module + bundle untuk pemakaian non-module (window.GajiCalc).
const api = {
  TER_TABLE, KATEGORI_MAP, BPJS_KES_CAP, JP_CAP,
  kategoriFromPtkp, terRate, hitungTer,
  bpjsKesehatan, jht, jp,
  parseRupiah,
  hitungGaji, bandingkanOffer, bandingkanDuaOffer,
};

export function loadModule() { return api; }
export default api;

if (typeof window !== 'undefined') {
  window.GajiCalc = api;
}
