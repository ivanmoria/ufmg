/* ═══════════════════════════════════════════
   T-MIRIM | MODULE: core/theme
   ═══════════════════════════════════════════ */

/* ╔═══════════════════════════════════════════════════════════
   ║ MODULE: core/theme
   ╚═══════════════════════════════════════════════════════════ */
// ── THEME & FONT ──────────────────────────────────────────
let currentFontSize = 16;
document.getElementById('btn-theme').addEventListener('click', () => {
  const isLight = document.documentElement.classList.toggle('light');
  document.getElementById('btn-theme').textContent = isLight ? '🌙' : '☀';
});
