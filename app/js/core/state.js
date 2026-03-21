/* ═══════════════════════════════════════════
   T-MIRIM | MODULE: core/state
   ═══════════════════════════════════════════ */

/* ╔═══════════════════════════════════════════════════════════
   ║ MODULE: core/state
   ╚═══════════════════════════════════════════════════════════ */
// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════
const STATE = {
  csvFiles: {}, dassData: {}, participants: {},
  participantMusico: {}, allTakes: new Set(), allActivities: new Set(),
  bigDF: [], corrData: [], rankData: [], demoData: {},
  currentFolderName: '',
  anonMap: {},   // real name → "P01", "P02", ...
};
