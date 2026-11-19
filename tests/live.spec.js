// HG-008 — E2E live gaji.cvkita.id (produksi, tanpa mock). Dijalankan via
// `npx playwright test tests/live.spec.js --config=playwright.live.config.js`
// Bukan bagian suite default (default config excludes *live*).
import { test, expect } from '@playwright/test';

const BASE = 'https://gaji.cvkita.id';
const API = 'https://cvkita-api.cvkita-rifakhoirul.workers.dev';

test('homepage + kalkulator live: hitung THP 10jt K/0', async ({ page }) => {
  await page.goto(BASE + '/');
  await expect(page.locator('.brand')).toContainText('CVKita');
  await page.fill('#gaji-pokok', '10000000');
  await page.selectOption('#ptkp', 'K/0');
  await page.click('#btn-hitung');
  await expect(page.locator('#thp')).toContainText('9.400.000');
});

test('compare.html live: dua offer → pemenang tampil', async ({ page }) => {
  await page.goto(BASE + '/compare.html');
  await page.fill('#a-gaji', '10000000');
  await page.fill('#b-gaji', '11000000');
  await page.click('#btn-bandingkan');
  await expect(page.locator('#winner-line')).toContainText('Offer B');
});

test('offer-analyzer live: teaser gratis (API AI asli)', async ({ page }) => {
  await page.goto(BASE + '/offer-analyzer.html');
  await page.fill('#offer-teks', 'Offering letter: Staff Accounting, gaji pokok Rp 6.000.000 per bulan, BPJS Kesehatan kelas 1, masa percobaan 3 bulan.');
  await page.check('#pdp-consent');
  await page.click('#btn-analyze');
  await expect(page.locator('#teaser')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#teaser-verdict')).not.toBeEmpty();
});

test('pay.html live: tag snap.js + client key Midtrans', async ({ page }) => {
  await page.goto(BASE + '/pay.html');
  const src = await page.getAttribute('script[data-client-key]', 'src');
  expect(src).toContain('app.midtrans.com/snap/snap.js');
  const key = await page.getAttribute('script[data-client-key]', 'data-client-key');
  expect(key).toMatch(/^Mid-client-/);
});

test('SEO live: /simulasi/:slug SSR + /sitemap.xml via custom domain', async ({ request }) => {
  const r1 = await request.get(BASE + '/simulasi/bersih-10-juta-tk0');
  expect(r1.status()).toBe(200);
  const html = await r1.text();
  expect(html).toContain('application/ld+json');
  expect(html).toContain('9.400.000');
  const r2 = await request.get(BASE + '/sitemap.xml');
  expect(r2.status()).toBe(200);
  const xml = await r2.text();
  expect(xml).toContain('/simulasi/bersih-10-juta-tk0');
});

test('API live: negotiate tanpa lisensi 403; import-offer teks 200 (0 KV write)', async ({ request }) => {
  const r1 = await request.post(API + '/api/ai/negotiate', {
    data: { license: 'HG-TIDAKADA-0000', job_title: 'Staff', offer_text: 'gaji 5 juta', offered_salary: 5000000 },
  });
  expect(r1.status()).toBe(403);
  const r2 = await request.post(API + '/api/import-offer', { data: { text: 'Offering letter: gaji pokok Rp 6.000.000 per bulan, BPJS kelas 1, THR bulan ke-13, masa percobaan 3 bulan.' } });
  expect(r2.status()).toBe(200);
});
