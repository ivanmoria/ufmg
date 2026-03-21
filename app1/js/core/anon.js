/* ═══════════════════════════════════════════
   T-MIRIM | MODULE: core/anon
   ═══════════════════════════════════════════ */

/* ╔═══════════════════════════════════════════════════════════
   ║ MODULE: core/anon
   ╚═══════════════════════════════════════════════════════════ */
// ── ANONYMIZE toggle — re-renders all name-bearing views ────
document.getElementById('chk-anonymize').addEventListener('change', () => {
  if (!STATE.bigDF.length) return;
  // Re-render the participant grid (names in headers)
  renderGroupedTable();
  // Re-render participant cards
  populateParticipants();
  // Re-render explore
  populateExplorer();
});
