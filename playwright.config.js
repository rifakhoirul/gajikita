// Playwright config (HG-005): UI test via webServer python http.server (ES module
// butuh http:// — file:// memblokir import module). reuseExistingServer agar hemat.
module.exports = {
  testDir: 'tests',
  timeout: 15000,
  webServer: {
    command: 'python3 -m http.server 8093',
    port: 8093,
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:8093',
    headless: true,
    viewport: { width: 390, height: 844 }, // mobile-first ala CVKita
  },
  reporter: [['list']],
};
