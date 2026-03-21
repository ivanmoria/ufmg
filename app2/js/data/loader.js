/* ═══════════════════════════════════════════
   T-MIRIM | MODULE: data/loader
   ═══════════════════════════════════════════ */

/* ╔═══════════════════════════════════════════════════════════
   ║ MODULE: data/loader
   ╚═══════════════════════════════════════════════════════════ */
// ── FILE LOADING (folder input, subfolder scan, dedup) ──────
const groupInput = document.getElementById('group-input');
const groupDrop  = document.getElementById('group-drop');

groupInput.addEventListener('change', () => {
  const files = groupInput.files;
  if (!files.length) return;
  // Derive folder name from first file's webkitRelativePath
  const firstPath = files[0].webkitRelativePath || files[0].name;
  const folderName = firstPath.includes('/') ? firstPath.split('/')[0] : firstPath;
  STATE.currentFolderName = folderName;
  groupDrop.querySelector('strong').textContent = '📁 ' + folderName;
  groupDrop.querySelector('small').textContent = files.length + ' arquivos encontrados';
  loadGroupFiles(files);
});

async function loadGroupFiles(files) {
  STATE.csvFiles = {};
  STATE.dassData = {};
  STATE.participants = {};
  STATE.allTakes = new Set();
  STATE.allActivities = new Set();
  STATE.participantMusico = {};

  // Accept ALL files from all subfolder depths (webkitdirectory gives entire tree)
  // Skip hidden/system files only
  const arr = Array.from(files).filter(f =>
    !f.name.startsWith('.') && !f.name.startsWith('__') && f.name.toLowerCase().endsWith('.csv')
  );

  // Dedup: after normalisation, same canonical key (atividade+participante+take) wins
  // — keep the first occurrence (shallowest path wins)
  const canonicalSeen = new Set();
  let csvCount = 0;

  for (const f of arr) {
    csvCount++;

    if (f.name.startsWith('DASS21_') || f.name.startsWith('DASS_')) {
      await parseDassFile(f);
      continue;
    }
    const info = parseFilename(f.name);
    if (!info) continue;

    const { nome, atividade, take } = info;
    const canonKey = `${nome}||${atividade}||${take}`;

    // Skip duplicates — same participant+activity+take after normalisation
    if (canonicalSeen.has(canonKey)) continue;
    canonicalSeen.add(canonKey);

    if (!STATE.participants[nome]) STATE.participants[nome] = { activities: {} };
    if (!STATE.participants[nome].activities[atividade]) STATE.participants[nome].activities[atividade] = {};
    STATE.participants[nome].activities[atividade][take] = f;
    STATE.allTakes.add(parseInt(take));
    STATE.allActivities.add(atividade);
    STATE.csvFiles[f.name] = f;
  }

  // Add DASS participants
  for (const nome of Object.keys(STATE.dassData)) {
    if (!STATE.participants[nome]) STATE.participants[nome] = { activities: {} };
    STATE.participants[nome].activities['DASS21'] = { '0': null };
    STATE.allActivities.add('DASS21');
  }

  const count = Object.keys(STATE.participants).length;
  const dupCount = arr.length - canonicalSeen.size - Object.keys(STATE.dassData).length;
  let countTxt = `${csvCount} CSVs · ${count} participantes`;
  if (dupCount > 0) countTxt += ` · ${dupCount} duplicados ignorados`;
  document.getElementById('group-file-count').textContent = countTxt;
  document.getElementById('btn-process').disabled = count === 0;

  renderParticipantGrid();
  renderSelectAllTakes();
}
