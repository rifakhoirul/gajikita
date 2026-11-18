// GajiCVKita — app shell v1
// HG-002 akan mengisi modul ter-calculator.js (TER Kategori A/B/C, BPJS).
// Modul ES6 dimuat via <script type="module"> saat fitur aktif.
(function () {
  'use strict';
  var YEAR = document.getElementById('year');
  if (YEAR) YEAR.textContent = String(new Date().getFullYear());
})();
