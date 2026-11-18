// GajiCVKita — logic halaman Kalkulator (HG-005). UI-only; kalkulasi di ter-calculator.js.
import GajiCalc from './ter-calculator.js';

function fmt(n) {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

function donutSvg(persenBersih) {
  // Lingkaran penuh 120x120, radius 45, keliling ~282.74.
  const C = 2 * Math.PI * 45;
  const dash = (persenBersih / 100) * C;
  return (
    '<circle cx="60" cy="60" r="45" fill="none" stroke="#e2e8f0" stroke-width="16"/>' +
    '<circle cx="60" cy="60" r="45" fill="none" stroke="#0f766e" stroke-width="16" ' +
    'stroke-dasharray="' + dash.toFixed(1) + ' ' + C.toFixed(1) + '" ' +
    'stroke-dashoffset="' + (C / 4).toFixed(1) + '" transform="rotate(0 60 60)" ' +
    'stroke-linecap="butt"/>' +
    '<text x="60" y="64" text-anchor="middle" font-size="13" font-weight="700" fill="#14213d">' +
    persenBersih.toFixed(0) + '%</text>'
  );
}

function render(res) {
  const hasil = document.getElementById('hasil');
  document.getElementById('thp').textContent = fmt(res.thp);
  document.getElementById('thp-tahunan').textContent = fmt(res.thp * 12);

  const p = res.potongan;
  const rows = [
    ['Gaji bruto / bulan', fmt(res.totalBruto)],
    ['BPJS Kesehatan (1%, cap Rp12 jt)', '-' + fmt(p.bpjsKesehatan)],
    ['BPJS JHT (2%)', '-' + fmt(p.jht)],
    ['BPJS JP (1%, cap Rp11.086.300)', '-' + fmt(p.jp)],
    ['PPh 21 TER (' + (res.tarifTer * 100).toLocaleString('id-ID') + '%, Kategori ' + res.kategori + ')', '-' + fmt(p.pph21)],
    ['Total potongan', '-' + fmt(p.total)],
  ];
  document.getElementById('rincian-potongan').innerHTML = rows
    .map(([k, v]) => '<li><span>' + k + '</span><strong>' + v + '</strong></li>').join('');

  const persenBersih = (res.thp / res.totalBruto) * 100;
  document.getElementById('donut').innerHTML = donutSvg(persenBersih);
  document.getElementById('donut-caption').textContent =
    persenBersih.toFixed(1) + '% bersih · ' + (100 - persenBersih).toFixed(1) + '% potongan';

  hasil.hidden = false;
  hasil.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function bind() {
  const form = document.getElementById('form-gaji');
  const err = document.getElementById('form-error');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    err.hidden = true;
    const input = {
      gajiPokok: document.getElementById('gaji-pokok').value,
      tunjanganTetap: document.getElementById('tunjangan-tetap').value,
      tunjanganLain: document.getElementById('tunjangan-lain').value,
      ptkp: document.getElementById('ptkp').value,
    };
    try {
      render(GajiCalc.hitungGaji(input));
    } catch (ex) {
      err.textContent = ex && ex.message ? ex.message : 'Input tidak valid.';
      err.hidden = false;
      document.getElementById('hasil').hidden = true;
    }
  });
}

bind();
