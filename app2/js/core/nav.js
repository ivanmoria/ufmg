/* ═══════════════════════════════════════════
   T-MIRIM | MODULE: core/nav
   ═══════════════════════════════════════════ */

/* ╔═══════════════════════════════════════════════════════════
   ║ MODULE: core/nav
   ╚═══════════════════════════════════════════════════════════ */
// ── TAB NAVIGATION ────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('page-'+btn.dataset.page).classList.add('active');
    // Re-populate data-dependent tabs on every visit
    if (!STATE.bigDF.length) return;
    const pg = btn.dataset.page;
    if (pg === 'explore')      populateExplorer();
    if (pg === 'timing')       { populateTimingControls(); updateTimingNav(); }
    if (pg === 'dass')         populateDASS();
    if (pg === 'visualize')    populateActivityToggles();
    if (pg === 'participants')  populateParticipants();
    if (pg === 'forms')         populateForms();
  });
});
