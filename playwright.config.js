// Playwright config dasar (HG-001). Test dijalankan lokal via file://
// — cukup untuk CI statis tanpa perlu web server.
module.exports = {
  testDir: 'tests',
  timeout: 15000,
  use: {
    headless: true,
    viewport: { width: 390, height: 844 }, // mobile-first ala CVKita
  },
  reporter: [['list']],
};
