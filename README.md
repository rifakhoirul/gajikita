# GajiCVKita (gaji.cvkita.id)

Simulator Gaji Bersih PPh 21 TER & AI Offer Negotiator — subdomain dari ekosistem [CVKita](https://cvkita.id).

- Frontend statis (vanilla HTML/CSS/JS, tanpa build tool) di-host GitHub Pages.
- Kalkulasi TER & BPJS **100% client-side** (proteksi kuota KV Worker < 1.000 write/hari).
- Endpoint dinamis menumpang Worker `cvkita-api` (prefix KV `hg:*`).

## Struktur
- `index.html` — Kalkulator Gaji
- `compare.html` — Adu Offering A vs B
- `offer-analyzer.html` — AI Offer Analyzer (paywall)
- `pay.html` — Checkout Midtrans Snap

## Konvensi
- **Cache-bust**: setiap ubah CSS/JS, naikkan `?v=N` di semua HTML yang mereferensikannya.
- **Test**: `npm test` (Playwright). CI: `.github/workflows/ci.yml`.
- **Deploy**: push ke `master` → GitHub Pages (CNAME `gaji.cvkita.id`).
