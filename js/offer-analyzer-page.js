// GajiCVKita — logic halaman Offer Analyzer (HG-006).
// Prinsip PRD: teaser gratis via /api/ai/preview-offer (0 KV), hasil penuh via
// /api/ai/negotiate (kuota), lisensi di localStorage TTL 5 menit (PRD 3.4.3).
const API = 'https://cvkita-api.cvkita-rifakhoirul.workers.dev';
import { hgTrack } from './hg-track.js';

const LIC_KEY = 'hg_lic';
const LIC_TTL_MS = 5 * 60 * 1000; // PRD 3.4.3: cache lisensi 5 menit

function bacaLisensi() {
  try {
    const raw = localStorage.getItem(LIC_KEY);
    if (!raw) return null;
    const lic = JSON.parse(raw);
    if (lic && lic.code && lic.ts && (Date.now() - lic.ts) < LIC_TTL_MS) return lic;
    localStorage.removeItem(LIC_KEY);
  } catch { /* rusak -> anggap tidak ada */ }
  return null;
}

function simpanLisensi(code, quota) {
  localStorage.setItem(LIC_KEY, JSON.stringify({ code, quota, ts: Date.now() }));
}

function fmt(n) {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

const VERDICT_LABEL = {
  UNDERPAID: 'Di Bawah Pasar',
  COMPETITIVE: 'Kompetitif',
  'ABOVE MARKET': 'Di Atas PasAR',
};

async function postJson(path, body) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.hidden = false;
}

function hideError(id) {
  const el = document.getElementById(id);
  el.hidden = true;
}

function renderTeaser(d) {
  document.getElementById('teaser-verdict').textContent =
    d.verdict_label || VERDICT_LABEL[d.verdict] || d.verdict || '—';
  document.getElementById('teaser-gap-text').textContent = d.gap || '—';
  // UI-006 (audit): locked preview — nilai premium terlihat "ada" tapi terblur,
  // bukti visual produk sebelum bayar (pattern paywall Figma/Notion).
  const pw = document.getElementById('locked-preview');
  if (pw && !pw.hasChildNodes()) {
    const mk = (label) =>
      '<div class="locked-cell"><span>' + label + '</span><strong class="locked-value">████ ███</strong></div>';
    pw.innerHTML = mk('Median pasar') + mk('Target counter-offer') + mk('Skrip negosiasi WA/Email');
  }
  document.getElementById('teaser').hidden = false;
  document.getElementById('teaser').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderPenuh(d) {
  const listB = document.getElementById('benchmark-list');
  listB.innerHTML = [
    ['Rentang bawah', d.benchmark_range_idr.min],
    ['Median pasar', d.benchmark_range_idr.median],
    ['Rentang atas', d.benchmark_range_idr.max],
  ].map(([k, v]) => '<li><span>' + k + '</span><strong>' + fmt(v) + '</strong></li>').join('');
  document.getElementById('target-counter').textContent = fmt(d.target_counter_offer_idr);

  const risks = Array.isArray(d.hidden_risks) ? d.hidden_risks : [];
  document.getElementById('risks-list').innerHTML = risks.length
    ? risks.map((r) => '<li class="risk risk-' + (r.severity || 'MEDIUM').toLowerCase() + '"><strong>' +
        r.clause + '</strong> <span class="sev">' + (r.severity || '') + '</span><br><span>' +
        (r.explanation || '') + '</span></li>').join('')
    : '<li>Tidak ada risiko klausul signifikan yang terdeteksi.</li>';
  document.getElementById('leverage').textContent = d.negotiation_leverage || '—';

  document.getElementById('script-wa').textContent = d.scripts.whatsapp_hr;
  document.getElementById('script-email').textContent = d.scripts.email_formal;
  document.getElementById('script-fallback').textContent = d.scripts.fallback_non_salary;
  document.getElementById('remaining').textContent = String(d.remaining) + ' analisis';

  document.getElementById('hasil-penuh').hidden = false;
  const paywall = document.getElementById('paywall');
  if (paywall) paywall.hidden = true;
  document.getElementById('hasil-penuh').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function teksOffer() {
  return document.getElementById('offer-teks').value.trim();
}

function bind() {
  const form = document.getElementById('form-analyzer');
  const btnFull = document.getElementById('btn-full-analysis');

  // Upload PDF -> /api/import-offer -> isi textarea (modalitas tunggal: teks).
  document.getElementById('offer-pdf').addEventListener('change', async (e) => {
    hideError('analyzer-error');
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      showError('analyzer-error', 'PDF maksimal 3 MB — kalau lebih, paste teksnya saja.');
      e.target.value = '';
      return;
    }
    const buf = await file.arrayBuffer();
    let bin = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = 'data:application/pdf;base64,' + btoa(bin);
    try {
      const r = await postJson('/api/import-offer', { pdf_base64: b64 });
      if (r.ok && r.data.markdown) {
        document.getElementById('offer-teks').value = r.data.markdown;
      } else {
        showError('analyzer-error', r.data.error || 'Gagal membaca PDF. Coba paste teksnya manual.');
      }
    } catch {
      showError('analyzer-error', 'Koneksi bermasalah. Coba lagi.');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError('analyzer-error');
    const teks = teksOffer();
    if (!teks) {
      showError('analyzer-error', 'Upload PDF atau paste teks offering letter dulu ya.');
      return;
    }
    const btn = document.getElementById('btn-analyze');
    btn.disabled = true;
    btn.textContent = 'Menganalisis...';
    try {
      const r = await postJson('/api/ai/preview-offer', { markdown: teks });
      if (!r.ok) {
        showError('analyzer-error', r.data.error || 'Analisis gagal. Coba lagi.');
        return;
      }
      renderTeaser(r.data);
      hgTrack('hg_analyze'); // HG-009: beacon analisis gratis sukses
    } catch {
      showError('analyzer-error', 'Koneksi bermasalah. Coba lagi.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Analisis Gratis';
    }
  });

  btnFull.addEventListener('click', async () => {
    hideError('lic-error');
    const teks = teksOffer();
    if (!teks) {
      showError('lic-error', 'Teks offering letter kosong — isi dulu di atas.');
      return;
    }
    const lic = bacaLisensi();
    const manual = document.getElementById('lic-input').value.trim().toUpperCase();
    const code = manual || (lic && lic.code);
    if (!code) {
      showError('lic-error', 'Masukkan kode lisensi HG-XXXX-XXXX (ada di email konfirmasi pembayaran).');
      return;
    }
    const jobTitle = document.getElementById('job-title').value.trim() || 'Karyawan';
    const salary = Number(document.getElementById('offered-salary').value) || 0;
    btnFull.disabled = true;
    btnFull.textContent = 'Menganalisis...';
    try {
      const r = await postJson('/api/ai/negotiate', {
        license: code,
        job_title: jobTitle,
        offered_salary: salary,
        offer_text: teks,
      });
      if (!r.ok) {
        showError('lic-error', r.data.error || 'Analisis penuh gagal. Coba lagi.');
        if (manual && r.ok !== true) { /* jangan cache kode gagal */ }
        return;
      }
      simpanLisensi(code, r.data.remaining);
      renderPenuh(r.data);
    } catch {
      showError('lic-error', 'Koneksi bermasalah. Coba lagi.');
    } finally {
      btnFull.disabled = false;
      btnFull.textContent = 'Analisis Penuh';
    }
  });

  // Copy buttons
  document.querySelectorAll('.btn-copy').forEach((b) => {
    b.addEventListener('click', () => {
      const t = document.getElementById(b.dataset.target);
      if (t) navigator.clipboard && navigator.clipboard.writeText(t.textContent).catch(() => {});
      b.textContent = 'Tercopy!';
      setTimeout(() => { b.textContent = 'Copy'; }, 1500);
    });
  });
}

bind();
