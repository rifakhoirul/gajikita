const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 375, height: 812 } });
  await p.goto('https://gaji.cvkita.id/?qc=hp17', { waitUntil: 'networkidle' });
  const m = await p.evaluate(() => {
    const cs = (sel, props) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const s = getComputedStyle(el);
      const r = {};
      props.forEach(k => (r[k] = s[k]));
      r._h = Math.round(el.getBoundingClientRect().height);
      return r;
    };
    return {
      headerInner: cs('.header-inner', ['padding']),
      brandRow: cs('.brand-row', ['marginBottom']),
      logo: cs('.brand-logo', ['fontSize', 'letterSpacing']),
      badge: cs('.ter-badge', ['padding', 'fontSize', 'borderWidth', 'borderStyle']),
      nav: cs('.segmented-nav', ['padding', 'borderRadius', 'backgroundColor']),
      active: cs('.segmented-nav a.active', ['fontWeight', 'boxShadow']),
      h1: cs('.hero-compact h1', ['fontSize', 'lineHeight', 'marginBottom']),
      chip: cs('.preset-chip', ['padding', 'borderRadius', 'fontSize'])
    };
  });
  console.log(JSON.stringify(m, null, 1));
  await p.screenshot({ path: 'tests/artifacts/hg017-prod-375.png' });
  await b.close();
})();
