// HG-008 audit UI — jalan sekali via node script (bukan bagian suite).
// Output: /tmp/audit-ui.json
const { chromium } = require('playwright');

const BASE = 'https://gaji.cvkita.id';
const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1280, height: 800 },
];

function lum(rgb) {
  const [r, g, b] = rgb.match(/\d+/g).map(Number);
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

(async () => {
  const out = {};
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    const r = {};

    // ===== UI-001: index.html — overflow + tap target =====
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    r.u1_overflow = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    r.u1_tap = await page.evaluate(() => {
      const els = [...document.querySelectorAll('#form-gaji input, #form-gaji select, #btn-hitung')];
      return els.map((e) => ({ id: e.id, h: Math.round(e.getBoundingClientRect().height) }));
    });

    // ===== UI-002: input number vs text =====
    r.u2_input_types = await page.evaluate(() =>
      [...document.querySelectorAll('#form-gaji input')].map((e) => ({ id: e.id, type: e.type }))
    );

    // ===== UI-003: kontras + THP menonjol =====
    r.u3 = await page.evaluate(() => {
      const thp = document.getElementById('thp');
      const inp = document.querySelector('#form-gaji input');
      const csThp = getComputedStyle(thp), csInp = getComputedStyle(inp);
      return {
        thpFontSize: csThp.fontSize, thpWeight: csThp.fontWeight,
        thpColor: csThp.color, bg: csInp.backgroundColor,
      };
    });
    // hitung (isi gaji → hasil render) lalu kontras rincian
    await page.fill('#gaji-pokok', '10000000');
    await page.click('#btn-hitung');
    await page.waitForSelector('#hasil:not([hidden])');
    r.u3_contrast = await page.evaluate(() => {
      const items = [...document.querySelectorAll('#rincian-potongan li span')];
      const cs = getComputedStyle(items[0]);
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      return { labelColor: cs.color, bodyBg };
    });
    r.qa1 = await page.evaluate(() => {
      const txt = document.getElementById('rincian-potongan').innerText;
      return { thp: document.getElementById('thp').innerText, rincian: txt };
    });

    // ===== QA-003: 5jt TK/0 → TER 0%? =====
    await page.fill('#gaji-pokok', '5000000');
    await page.click('#btn-hitung');
    await page.waitForSelector('#hasil:not([hidden])');
    r.qa3_5jt = await page.evaluate(() => document.getElementById('rincian-potongan').innerText);
    // input kosong
    await page.fill('#gaji-pokok', '');
    await page.click('#btn-hitung');
    await page.waitForTimeout(300);
    r.qa3_empty = await page.evaluate(() => ({
      errVisible: !document.getElementById('form-error').hidden,
      errText: document.getElementById('form-error').innerText,
      thp: document.getElementById('thp').innerText,
    }));

    // ===== QA-002: 25jt K/1 =====
    await page.fill('#gaji-pokok', '25000000');
    await page.selectOption('#ptkp', 'K/1');
    await page.click('#btn-hitung');
    await page.waitForSelector('#hasil:not([hidden])');
    r.qa2_25jt = await page.evaluate(() => ({
      rincian: document.getElementById('rincian-potongan').innerText,
      thp: document.getElementById('thp').innerText,
    }));

    // ===== UI-004: compare mobile stack + winner badge =====
    await page.goto(BASE + '/compare.html', { waitUntil: 'networkidle' });
    r.u4_form = await page.evaluate(() => ({
      ids: [...document.querySelectorAll('#form-compare input, #form-compare select')].map((e) => e.id),
      btnH: Math.round(document.querySelector('#form-compare button').getBoundingClientRect().height),
    }));
    await page.fill('#a-gaji', '14000000');
    await page.fill('#a-komuter', '1500000');
    await page.fill('#b-gaji', '12500000');
    await page.fill('#b-bonus', '15000000');
    await page.click('#btn-bandingkan');
    await page.waitForSelector('.compare-card');
    r.u4_gridCols = await page.evaluate(() => {
      const g = document.getElementById('compare-grid');
      return getComputedStyle(g).gridTemplateColumns.split(' ').length;
    });
    r.u4_winner = await page.evaluate(() => {
      const w = document.querySelector('.compare-card.winner');
      return w ? { badge: w.querySelector('h3')?.innerText, total: w.querySelector('.compare-total')?.innerText } : null;
    });
    r.qa4_totals = await page.evaluate(() =>
      [...document.querySelectorAll('.compare-card')].map((c) => ({
        h3: c.querySelector('h3')?.innerText,
        thp: c.querySelector('.compare-thp')?.innerText,
        total: c.querySelector('.compare-total')?.innerText,
      }))
    );

    // ===== UI-005 / QA-006 prep: analyzer form + error handler =====
    await page.goto(BASE + '/offer-analyzer.html', { waitUntil: 'networkidle' });
    r.u5_fileAccept = await page.evaluate(() => {
      const f = document.getElementById('offer-pdf');
      return { accept: f.accept, id: f.id };
    });
    // uji error ramah: submit kosong (tanpa teks tanpa pdf)
    await page.click('#btn-analyze');
    await page.waitForTimeout(500);
    r.u5_emptyErr = await page.evaluate(() => ({
      vis: !document.getElementById('analyzer-error').hidden,
      txt: document.getElementById('analyzer-error').innerText,
    }));

    // ===== UI-006: paywall preview nilai =====
    r.u6_paywall = await page.evaluate(() => {
      const pw = document.getElementById('paywall');
      return { exists: !!pw, cta: pw.querySelector('a.btn')?.innerText, blurCount: pw.querySelectorAll('.blur,.skeleton,[data-blur]').length };
    });

    // ===== UI-007: pay.html tombol copy =====
    await page.goto(BASE + '/pay.html', { waitUntil: 'networkidle' });
    r.u7_copy = await page.evaluate(() => ({
      licResultExists: !!document.getElementById('lic-result'),
      copyBtn: !!document.querySelector('#lic-result button, #lic-result .copy'),
      snapScript: !!document.querySelector('script[src*="snap"]'),
    }));

    // ===== UI-008: simulasi page mobile =====
    await page.goto(BASE + '/simulasi/bersih-10-juta-tk0', { waitUntil: 'networkidle' });
    r.u8 = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      h1: document.querySelector('h1')?.innerText,
      ctaLinks: [...document.querySelectorAll('a.btn')].map((a) => ({ txt: a.innerText, href: a.href })),
      ctaPrefill: (document.querySelector('a.btn')?.href || '').includes('gaji='),
    }));

    // ===== UI-009: cvkita.id banner =====
    await page.goto('https://cvkita.id/', { waitUntil: 'networkidle' });
    r.u9 = await page.evaluate(() => {
      const b = document.getElementById('hg-banner');
      const links = b ? [...b.querySelectorAll('a')].map((a) => ({ txt: a.innerText, href: a.href })) : [];
      return { exists: !!b, hiddenByDefault: b ? getComputedStyle(b).display === 'none' : null,
        dismiss: !!b.querySelector('.hg-banner-close, button'),
        z: b ? getComputedStyle(b).zIndex : null, pos: b ? getComputedStyle(b).position : null, links };
    });

    out[vp.name] = r;
    await ctx.close();
  }

  await browser.close();
  console.log(JSON.stringify(out, null, 1));
})();
