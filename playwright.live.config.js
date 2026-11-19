// Playwright config LIVE (HG-008): E2E produksi gaji.cvkita.id, tanpa webServer.
// Jalankan manual: npx playwright test --config=playwright.live.config.js
module.exports = {
  testDir: 'tests',
  testMatch: '**/live.spec.js',
  timeout: 45000,
  use: {
    headless: true,
    viewport: { width: 390, height: 844 },
    baseURL: 'https://gaji.cvkita.id',
  },
  reporter: [['list']],
};
