// GajiCVKita — logic halaman Adu Offering (HG-005). 100% client-side.
import GajiCalc from './ter-calculator.js';
import { hgTrack } from './hg-track.js';

function fmt(n) {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

function bacaOffer(p) {
  return {
    gajiPokok: document.getElementById(p + '-gaji').value,
    tunjanganTetap: document.getElementById(p + '-tetap').value,
    ptkp: document.getElementById(p + '-ptkp').value,
    thr: document.getElementById(p + '-thr').value,
    bonusTahunan: document.getElementById(p + '-bonus').value,
    manfaatBulanan: document.getElementById(p + '-manfaat').value,
    komuterBulanan: document.getElementById(p + '-komuter').value,
    skema: document.getElementById(p + '-skema').value,
  };
}

function kolom(label, r, isWinner) {
  const p = r.potongan;
  return (
    '<article class="compare-card' + (isWinner ? ' winner' : '') + '">' +
      '<h3>' + label + (isWinner ? ' <span class="badge">Terbaik</span>' : '') + '</h3>' +
      '<p class="compare-thp">' + fmt(r.thp) + '<span>/bulan</span></p>' +
      '<ul class="compare-list">' +
        '<li><span>Gaji bruto</span><strong>' + fmt(r.totalBruto) + '</strong></li>' +
        '<li><span>PPh 21 TER (' + (r.tarifTer * 100).toLocaleString('id-ID') + '%)</span><strong>-' + fmt(p.pph21) + '</strong></li>' +
        '<li><span>BPJS (Kes+JHT+JP)</span><strong>-' + fmt(p.bpjsKesehatan + p.jht + p.jp) + '</strong></li>' +
        '<li><span>THP × 12</span><strong>' + fmt(r.thp * 12) + '</strong></li>' +
        '<li><span>THR</span><strong>' + fmt(r.thr) + '</strong></li>' +
        '<li><span>Bonus</span><strong>' + fmt(r.bonusTahunan) + '</strong></li>' +
        '<li><span>Manfaat × 12</span><strong>' + fmt(r.manfaatBulanan * 12) + '</strong></li>' +
        '<li><span>Komuter × 12</span><strong>-' + fmt(r.komuterBulanan * 12) + '</strong></li>' +
      '</ul>' +
      '<p class="compare-total">Total setahun <strong>' + fmt(r.totalAnnualNet) + '</strong></p>' +
      '<p class="compare-skema">Skema: <strong>' + r.skema + '</strong>' + (r.komuterBulanan > 0 ? ' · komuter ' + fmt(r.komuterBulanan) + '/bulan' : '') + '</p>' +
    '</article>'
  );
}

function bind() {
  const form = document.getElementById('form-compare');
  const err = document.getElementById('compare-error');
  if (!form) return;

  // UI-002 (audit): formatter ribuan di semua input rupiah kedua kolom.
  const fmtIds = ['gaji', 'tetap', 'thr', 'bonus', 'manfaat', 'komuter'];
  const pasang = (el) => {
    if (!el) return;
    el.setAttribute('inputmode', 'numeric');
    // Real-time dari digit mentah (tahan nilai campuran "Rp 1.0000").
    el.addEventListener('input', () => {
      const digits = el.value.replace(/\D/g, '');
      el.value = digits ? fmt(Number(digits)) : '';
    });
  };
  fmtIds.forEach((f) => { pasang(document.getElementById('a-' + f)); pasang(document.getElementById('b-' + f)); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    err.hidden = true;
    try {
      const a = Object.assign(GajiCalc.bandingkanOffer(bacaOffer('a')), { skema: document.getElementById('a-skema').value });
      const b = Object.assign(GajiCalc.bandingkanOffer(bacaOffer('b')), { skema: document.getElementById('b-skema').value });
      const { winner, selisih } = GajiCalc.bandingkanDuaOffer(a, b);
      hgTrack('hg_compare_view'); // HG-009: beacon perbandingan sukses

      const line = document.getElementById('winner-line');
      if (winner === 'SERI') {
        line.textContent = 'Dua offering ini imbang — total kompensasi setahun sama.';
      } else {
        const menang = winner === 'A' ? 'Offer A' : 'Offer B';
        line.textContent = menang + ' unggul ' + fmt(selisih) + ' per tahun.';
      }

      document.getElementById('compare-grid').innerHTML =
        kolom('Offer A', a, winner === 'A') + kolom('Offer B', b, winner === 'B');
      document.getElementById('hasil-compare').hidden = false;
      document.getElementById('hasil-compare').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (ex) {
      err.textContent = ex && ex.message ? ex.message : 'Input tidak valid.';
      err.hidden = false;
      document.getElementById('hasil-compare').hidden = true;
    }
  });
}

bind();

  // HG-011: Prefill dari URL query params (?gaji=...&ptkp=...)
  const params = new URLSearchParams(window.location.search);
  const gajiParam = params.get('gaji');
  const ptkpParam = params.get('ptkp');
  if (gajiParam && GajiCalc.parseRupiah(gajiParam) > 0) {
    document.getElementById('a-gaji').value = fmt(GajiCalc.parseRupiah(gajiParam));
    document.getElementById('a-gaji').dispatchEvent(new Event('input'));
    if (ptkpParam && document.getElementById('a-ptkp').querySelector('option[value="' + ptkpParam + '"]')) {
      document.getElementById('a-ptkp').value = ptkpParam;
    }
  }
