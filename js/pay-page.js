// GajiCVKita — logic halaman Checkout (HG-006). Mengikuti pola pay.html CVKita:
// /api/pay/create (amount 29000) -> snap.pay(token) -> onSuccess -> by-order -> licKey.
const API = 'https://cvkita-api.cvkita-rifakhoirul.workers.dev';
const AMOUNT = 29000; // paket Offer Analyzer Pro (5 kuota) — dikunci server-side

const LIC_KEY = 'hg_lic';
const LIC_TTL_MS = 5 * 60 * 1000; // PRD 3.4.3

const status = document.getElementById('pay-status');

function ambilKode(orderId, orderToken) {
  status.textContent = 'Pembayaran berhasil! Mengambil kode lisensi...';
  fetch(API + '/api/license/by-order?order_id=' + encodeURIComponent(orderId) +
        '&order_token=' + encodeURIComponent(orderToken))
    .then((r) => r.json().then((b) => ({ ok: r.ok, body: b })))
    .then((res) => {
      if (!res.ok || !res.body.code) {
        // Lisensi mungkin belum terbit saat callback — beri panduan polling manual.
        status.style.color = '#b45309';
        status.innerHTML = 'Pembayaran diterima, kode sedang diproses. Cek email dalam beberapa menit, ' +
          'atau buka kembali halaman ini nanti.';
        return;
      }
      localStorage.setItem(LIC_KEY, JSON.stringify({
        code: res.body.code, quota: res.body.quota, ts: Date.now(),
      }));
      document.getElementById('lic-code').textContent = res.body.code;
      document.getElementById('lic-result').hidden = false;
      status.style.color = '#059669';
      status.textContent = 'Selesai! Kode lisensi juga dikirim ke email kamu.';
      status.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    })
    .catch(() => {
      status.style.color = '#b45309';
      status.innerHTML = 'Pembayaran diterima. Ambil kode dari email konfirmasi, atau hubungi kami via WhatsApp.';
    });
}

function beli() {
  status.style.color = '#5b6478';
  status.textContent = 'Menyiapkan pembayaran...';
  fetch(API + '/api/pay/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: AMOUNT }),
  })
    .then((r) => r.json().then((b) => ({ ok: r.ok, body: b })))
    .then((res) => {
      if (!res.ok || !res.body.token) {
        status.style.color = '#b91c1c';
        status.textContent = res.body.error || 'Gagal menyiapkan pembayaran. Coba lagi.';
        return;
      }
      status.textContent = 'Membuka jendela pembayaran...';
      if (window.snap) {
        window.snap.pay(res.body.token, {
          onSuccess: () => ambilKode(res.body.order_id, res.body.order_token),
          onPending: () => {
            status.style.color = '#b45309';
            status.innerHTML = 'Pembayaran tertunda. Selesaikan sebelum batas waktu — order <b>' +
              res.body.order_id + '</b>.';
          },
          onError: () => {
            status.style.color = '#b91c1c';
            status.textContent = 'Pembayaran gagal. Coba lagi atau hubungi kami via WhatsApp.';
          },
          onClose: () => {
            status.style.color = '#5b6478';
            status.innerHTML = 'Jendela pembayaran ditutup — tidak ada yang terpotong.<br>' +
              'Mau lanjut? Klik tombol bayar lagi. Ada kendala? Chat kami via ' +
              '<a href="https://wa.me/62895628135638" target="_blank" rel="noopener"><b>WhatsApp</b></a>.';
          },
        });
      } else {
        // snap.js gagal termuat (adblock/jaringan) — fallback redirect.
        status.textContent = 'Mengalihkan ke halaman pembayaran...';
        window.location.href = res.body.redirect_url;
      }
    })
    .catch(() => {
      status.style.color = '#b91c1c';
      status.textContent = 'Koneksi bermasalah. Coba lagi.';
    });
}

const btn = document.getElementById('btn-buy');
if (btn) btn.addEventListener('click', beli);

// UI-007 (audit): tombol salin kode lisensi + toast konfirmasi.
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'copy-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

const btnCopy = document.getElementById('btn-copy');
if (btnCopy) {
  btnCopy.addEventListener('click', async () => {
    const kode = (document.getElementById('lic-code').textContent || '').trim();
    if (!kode || kode === '—') return;
    try {
      await navigator.clipboard.writeText(kode);
      toast('Kode lisensi disalin');
    } catch {
      // Fallback: browser tanpa izin clipboard (http / iframe ketat).
      const ta = document.createElement('textarea');
      ta.value = kode;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast('Kode lisensi disalin');
    }
  });
}
