// HG-009: Beacon tracking GajiCVKita → POST /api/track di Worker CVKita.
// Fire-and-forget, gagal-silent (tracking tidak boleh mengganggu UX).
// KV-friendly: semua counter HG digabung ke statday:<tanggal> (maks 1 write/hari
// per counter — sesuai catatan quota 1.000 write di index.js).
const TRACK = 'https://cvkita-api.cvkita-rifakhoirul.workers.dev/api/track';
const ALLOWED = ['hg_visit', 'hg_sim', 'hg_compare_view', 'hg_analyze', 'hg_pay_view'];

export function hgTrack(event) {
  if (!ALLOWED.includes(event)) return;
  const payload = JSON.stringify({ event });
  try {
    if (navigator.sendBeacon) {
      // sendBeacon dengan Blob JSON kadang dikirim sebagai text/plain;
      // Worker /api/track menerima keduanya (sama seperti beacon CVKita).
      navigator.sendBeacon(TRACK, new Blob([payload], { type: 'application/json' }));
      return;
    }
  } catch {
    // jatuh ke fetch keepalive
  }
  try {
    fetch(TRACK, { method: 'POST', body: payload, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
  } catch {
    // noop — tracking gagal-silent
  }
}
