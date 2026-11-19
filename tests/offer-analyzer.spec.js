// HG-006 — Offer Analyzer (offer-analyzer.html) & Checkout (pay.html).
// Alur: upload PDF / paste teks -> teaser gratis -> paywall -> Snap -> licKey -> hasil penuh.
const { test, expect } = require('@playwright/test');

const API = 'https://cvkita-api.cvkita-rifakhoirul.workers.dev';

function mockApi(page, over = {}) {
  return page.route(API + '/**', async (route) => {
    const url = route.request().url();
    const json = (obj, status = 200) => route.fulfill({
      status, contentType: 'application/json', body: JSON.stringify(obj),
    });
    if (url.includes('/api/import-offer')) {
      if (over.importOffer) return over.importOffer(route, json);
      return json({ markdown: 'Offering letter: gaji pokok Rp 6.000.000 per bulan, BPJS, masa percobaan 3 bulan.' });
    }
    if (url.includes('/api/ai/preview-offer')) {
      if (over.previewOffer) return over.previewOffer(route, json);
      return json({ verdict: 'UNDERPAID', verdict_label: 'Di Bawah Pasar', gap: 'Tidak ada THR dan bonus tanpa formula jelas.' });
    }
    if (url.includes('/api/pay/create')) {
      if (over.payCreate) return over.payCreate(route, json);
      return json({ token: 'snap-token-abc', order_id: 'HG-ORD1', order_token: 'tok1', amount: 29000, quota: 5 });
    }
    if (url.includes('/api/license/by-order')) {
      return json({ code: 'HG-ABCD-EFGH', quota: 5 });
    }
    if (url.includes('/api/ai/negotiate')) {
      if (over.negotiate) return over.negotiate(route, json);
      return json({
        market_verdict: 'Underpaid',
        benchmark_range_idr: { min: 7000000, median: 9500000, max: 13000000 },
        hidden_risks: [{ clause: 'PKWT tanpa kompensasi', severity: 'HIGH', explanation: 'Tidak ada klausul kompensasi pengakhiran.' }],
        negotiation_leverage: 'Punya 2 offer paralel.',
        target_counter_offer_idr: 11000000,
        scripts: { whatsapp_hr: 'Halo HR, saya ingin mendiskusikan...', email_formal: 'Dear Hiring Manager,...', fallback_non_salary: 'Bisakah sign-on bonus?' },
        remaining: 4,
      });
    }
    return json({ error: 'not mocked' }, 404);
  });
}

test.describe('Offer Analyzer', () => {
  test('paste teks -> teaser gratis tampil (verdict + gap)', async ({ page }) => {
    await mockApi(page);
    await page.goto('/offer-analyzer.html');
    await page.fill('#offer-teks', 'Gaji pokok Rp 6.000.000, masa percobaan 3 bulan, tanpa THR.');
    await page.fill('#job-title', 'Staff Accounting');
    await page.fill('#offered-salary', '6000000');
    await page.check('#pdp-consent');
    await page.click('#btn-analyze');
    const teaser = page.locator('#teaser');
    await expect(teaser).toBeVisible();
    await expect(teaser).toContainText('Di Bawah Pasar');
    await expect(teaser).toContainText('THR');
    // Hasil penuh terkunci sebelum bayar
    await expect(page.locator('#hasil-penuh')).toBeHidden();
    await expect(page.locator('#paywall')).toBeVisible();
  });

  test('upload PDF -> panggil /api/import-offer, bukan paste manual', async ({ page }) => {
    let calledImport = false;
    await mockApi(page, {
      importOffer: (route, json) => { calledImport = true; return json({ markdown: 'Gaji 7.500.000, THR 1 bulan.' }); },
    });
    await page.goto('/offer-analyzer.html');
    await page.setInputFiles('#offer-pdf', {
      name: 'offer.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 dummy'),
    });
    await page.waitForTimeout(300);
    expect(calledImport).toBe(true);
    await expect(page.locator('#offer-teks')).not.toHaveValue('');
  });

  test('teks kosong -> pesan error, tidak memanggil AI', async ({ page }) => {
    let calledPreview = false;
    await mockApi(page, { previewOffer: (route, json) => { calledPreview = true; return json({}); } });
    await page.goto('/offer-analyzer.html');
    await page.check('#pdp-consent');
    await page.click('#btn-analyze');
    await expect(page.locator('#analyzer-error')).toBeVisible();
    expect(calledPreview).toBe(false);
  });

  test('lisensi valid tersimpan -> akses hasil penuh tanpa bayar lagi', async ({ page }) => {
    await mockApi(page);
    await page.addInitScript(() => {
      localStorage.setItem('hg_lic', JSON.stringify({ code: 'HG-ABCD-EFGH', quota: 5, ts: Date.now() }));
    });
    await page.goto('/offer-analyzer.html');
    await page.fill('#offer-teks', 'Gaji pokok Rp 6.000.000.');
    await page.fill('#job-title', 'Staff Accounting');
    await page.fill('#offered-salary', '6000000');
    await page.check('#pdp-consent');
    await page.click('#btn-analyze');
    await page.click('#btn-full-analysis');
    const penuh = page.locator('#hasil-penuh');
    await expect(penuh).toBeVisible();
    await expect(penuh).toContainText('9.500.000');       // median benchmark
    await expect(penuh).toContainText('11.000.000');      // target counter
    await expect(penuh).toContainText('PKWT');            // hidden risk
    await expect(penuh).toContainText('Halo HR');         // skrip WhatsApp
    await expect(page.locator('#paywall')).toBeHidden();
  });
});

test.describe('Checkout', () => {
  test('pay.html: tombol beli -> /api/pay/create amount 29000 -> snap.pay dipanggil', async ({ page }) => {
    const calls = [];
    await mockApi(page, { payCreate: (route, json) => { calls.push(route.request().postDataJSON()); return json({ token: 'snap-token-abc', order_id: 'HG-ORD1', order_token: 'tok1', amount: 29000, quota: 5 }); } });
    // Block snap.js asli agar stub addInitScript tidak tertimpa script eksternal
    await page.route('https://app.midtrans.com/snap/snap.js*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.addInitScript(() => {
      window.__snapCalls = [];
      window.snap = { pay: (token, opts) => { window.__snapCalls.push(token); window.__snapOpts = opts; } };
    });
    await page.goto('/pay.html');
    // Tag snap.js + client key terpasang di HTML (pola pay.html CVKita)
    const snapSrc = await page.getAttribute('script[data-client-key]', 'src');
    expect(snapSrc).toContain('app.midtrans.com/snap/snap.js');
    const clientKey = await page.getAttribute('script[data-client-key]', 'data-client-key');
    expect(clientKey).toMatch(/^Mid-client-/);
    await page.click('#btn-buy');
    await page.waitForTimeout(400);
    expect(calls.length).toBe(1);
    expect(calls[0].amount).toBe(29000);
    const snapCalls = await page.evaluate(() => window.__snapCalls);
    expect(snapCalls[0]).toBe('snap-token-abc');
    await expect(page.locator('#pay-status')).toContainText('Membuka jendela pembayaran');
  });

  test('pay.html: onSuccess -> ambil lisensi via by-order & simpan localStorage', async ({ page }) => {
    await mockApi(page);
    await page.route('https://app.midtrans.com/snap/snap.js*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.addInitScript(() => {
      window.snap = { pay: (token, opts) => { setTimeout(() => opts.onSuccess({}), 10); } };
    });
    await page.goto('/pay.html?amount=29000');
    await page.click('#btn-buy');
    await expect(page.locator('#lic-result')).toBeVisible();
    await expect(page.locator('#lic-result')).toContainText('HG-ABCD-EFGH');
    const stored = await page.evaluate(() => localStorage.getItem('hg_lic'));
    expect(stored).toContain('HG-ABCD-EFGH');
  });

  test('pay.html: error dari API ditampilkan ramah', async ({ page }) => {
    await mockApi(page, { payCreate: (route, json) => json({ error: 'Pembayaran belum dikonfigurasi.' }, 500) });
    await page.goto('/pay.html?amount=29000');
    await page.click('#btn-buy');
    await expect(page.locator('#pay-status')).toContainText('belum dikonfigurasi');
  });
});
