// HG-016 — Anti-wrap nominal Rincian Potongan (index.html kalkulator).
// Bug: nominal seperti -Rp 120.000 patah baris di mobile 375x812 dan tidak
// rata kanan presisi dengan Rp 12.000.000. Fix murni CSS (tidak boleh ubah
// id/name/data-testid/form/logika JS — kontrak selector HG-012 tetap).
// Dijalankan via webServer http://localhost:8093 (ES module — file:// diblokir).
const { test, expect } = require('@playwright/test');

const INDEX = '/index.html';

async function hitung(page) {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(INDEX);
  await page.fill('#gaji-pokok', '12000000');
  await page.fill('#tunjangan-tetap', '');
  await page.fill('#tunjangan-lain', '');
  await page.selectOption('#ptkp', 'TK/0');
  await page.click('#btn-hitung');
  await expect(page.locator('#hasil')).toBeVisible();
}

test.describe('HG-016: nominal rincian potongan anti-wrap & rata kanan', () => {
  test('val nominal: nowrap, flex-shrink 0, rata kanan, tabular-nums', async ({ page }) => {
    await hitung(page);
    const styles = await page.locator('#rincian-potongan li strong').evaluateAll(
      els => els.map(el => {
        const cs = getComputedStyle(el);
        return {
          text: el.textContent,
          whiteSpace: cs.whiteSpace,
          flexShrink: cs.flexShrink,
          textAlign: cs.textAlign,
          fontVariantNumeric: cs.fontVariantNumeric,
        };
      })
    );
    expect(styles.length).toBeGreaterThanOrEqual(6);
    for (const s of styles) {
      expect(s.whiteSpace, s.text).toBe('nowrap');
      expect(Number(s.flexShrink), s.text).toBe(0);
      expect(s.textAlign, s.text).toBe('right');
      expect(s.fontVariantNumeric, s.text).toContain('tabular-nums');
    }
  });

  test('nominal potongan (-Rp) berwarna danger #DC2626', async ({ page }) => {
    await hitung(page);
    const rows = await page.locator('#rincian-potongan li strong').evaluateAll(
      els => els.map(el => ({ text: el.textContent, color: getComputedStyle(el).color }))
    );
    for (const r of rows) {
      if (r.text.startsWith('-')) expect(r.color, r.text).toBe('rgb(220, 38, 38)');
    }
    // baris bruto (bukan potongan) tidak boleh danger
    expect(rows[0].text.startsWith('-')).toBe(false);
    expect(rows[0].color).not.toBe('rgb(220, 38, 38)');
  });

  test('375x812: tidak ada nominal -Rp patah baris & sejajar kanan dengan baris bruto', async ({ page }) => {
    await hitung(page);
    const boxes = await page.locator('#rincian-potongan li').evaluateAll(
      els => els.map(li => {
        const strong = li.querySelector('strong');
        const s = strong.getBoundingClientRect();
        const l = li.getBoundingClientRect();
        return { text: strong.textContent, h: s.height, rightGap: Math.abs(l.right - s.right) };
      })
    );
    for (const b of boxes) {
      // 1 baris: tinggi box nominal jauh di bawah 2 baris (font 13-15px)
      expect(b.h, b.text + ' patah baris').toBeLessThan(30);
      // rata kanan presisi dengan tepi li
      expect(b.rightGap, b.text + ' tidak rata kanan').toBeLessThan(2);
    }
  });

  test('label kiri fleksibel (flex:1, min-width:0) — label panjang wrap rapi', async ({ page }) => {
    await hitung(page);
    const labels = await page.locator('#rincian-potongan li span').evaluateAll(
      els => els.map(el => {
        const cs = getComputedStyle(el);
        return { text: el.textContent, flexGrow: cs.flexGrow, minWidth: cs.minWidth };
      })
    );
    expect(labels.length).toBeGreaterThanOrEqual(6);
    for (const l of labels) {
      expect(Number(l.flexGrow), l.text).toBe(1);
      expect(l.minWidth, l.text).toBe('0px');
    }
  });

  test('kartu hasil: .rincian tanpa border/padding berlapis (single-border)', async ({ page }) => {
    await hitung(page);
    const cs = await page.locator('#hasil .rincian').evaluate(
      el => {
        const c = getComputedStyle(el);
        return {
          bw: c.borderTopWidth, bs: c.borderTopStyle,
          pt: c.paddingTop, pl: c.paddingLeft,
        };
      }
    );
    expect(cs.bw).toBe('0px');
    expect(cs.bs).toBe('none');
    expect(cs.pt).toBe('0px');
    expect(cs.pl).toBe('0px');
  });

  test('.breakdown-row (design system): val nowrap + label fleksibel', async ({ page }) => {
    await page.goto(INDEX);
    await page.evaluate(() => {
      const d = document.createElement('div');
      d.innerHTML = '<div class="breakdown-row" id="probe-bdr">' +
        '<span class="label">BPJS Kesehatan (1%, cap Rp12 jt) label panjang sekali</span>' +
        '<span class="val">-Rp 480.000</span></div>';
      document.body.appendChild(d);
    });
    const cs = await page.evaluate(() => {
      const row = document.getElementById('probe-bdr');
      const val = row.querySelector('.val');
      const label = row.querySelector('.label');
      const cv = getComputedStyle(val), cl = getComputedStyle(label);
      return {
        valWs: cv.whiteSpace, valShrink: cv.flexShrink, valAlign: cv.textAlign,
        valNum: cv.fontVariantNumeric,
        labelGrow: cl.flexGrow, labelMin: cl.minWidth, labelPad: cl.paddingRight,
      };
    });
    expect(cs.valWs).toBe('nowrap');
    expect(Number(cs.valShrink)).toBe(0);
    expect(cs.valAlign).toBe('right');
    expect(cs.valNum).toContain('tabular-nums');
    expect(Number(cs.labelGrow)).toBe(1);
    expect(cs.labelMin).toBe('0px');
  });

  test('375x812: halaman tanpa horizontal overflow', async ({ page }) => {
    await hitung(page);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
