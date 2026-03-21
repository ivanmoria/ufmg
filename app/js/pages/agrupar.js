/* ═══════════════════════════════════════════
   T-MIRIM | MODULE: pages/agrupar
   ═══════════════════════════════════════════ */

/* ╔═══════════════════════════════════════════════════════════
   ║ MODULE: pages/agrupar
   ╚═══════════════════════════════════════════════════════════ */
// ═══════════════════════════════════════════════════════════
//  PAGE 1 — AGRUPAR
// ═══════════════════════════════════════════════════════════
function normaliseName(filename) {
  // Strip verbose noise from original format so it matches simplified format.
  // e.g. "TTE_BPM_R1_Ivan Moria_take_1.csv" -> "TTE_IvanMoria_take_1.csv"
  // e.g. "TTE_ivan_take_1.csv" -> unchanged
  const dotIdx = filename.lastIndexOf('.');
  const ext  = dotIdx >= 0 ? filename.slice(dotIdx) : '';
  let   name = dotIdx >= 0 ? filename.slice(0, dotIdx) : filename;

  const takeM = name.match(/_take_\d+$/);
  if (!takeM) return filename;

  let header = name.slice(0, takeM.index);
  const takeSuffix = takeM[0];

  // Remove verbose tokens from the activity/participant header
  header = header
    .replace(/_BPM/gi,   '')
    .replace(/_E\d+/gi,  '')
    .replace(/_R\d+/gi,  '')
    .replace(/_Media/gi, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  return header + takeSuffix + ext;
}

function parseFilename(filename) {
  // Normalise first: both verbose and simplified formats converge here
  const normalised = normaliseName(filename);
  const name = normalised.replace(/\.csv$/i, '');

  // Expect: <ActivityHeader>_<participantName>_take_<N>
  const m = name.match(/_([^_]+)_take_(\d+)$/);
  if (!m) return null;

  const nome   = m[1].trim().toLowerCase();
  const take   = m[2];
  const header = name.slice(0, m.index);

  // Map to canonical activity key
  let atividade = header;
  const hl = header.toLowerCase().replace(/_/g, '');
  if      (hl.startsWith('tte'))   atividade = 'TTE';
  else if (/metro.*150/.test(hl))  atividade = 'Metro_150';
  else if (/metro.*60/.test(hl))   atividade = 'Metro_60';
  else if (/metro/.test(hl))       atividade = 'Metro';
  else if (hl.startsWith('alla1')) atividade = 'alla1';
  else if (hl.startsWith('alla2')) atividade = 'alla2';
  else if (hl.startsWith('alla3')) atividade = 'alla3';
  else if (hl.startsWith('alla4')) atividade = 'alla4';

  return { nome, atividade, take };
}


async function parseDassFile(file) {
  const text = await readFileText(file);
  const lines = text.split('\n').map(l=>l.trim()).filter(Boolean);
  const basename = file.name.replace(/\.csv$/i, '');

  // ── Extract participant name from filename ──
  // FORMAT A (original): DASS21_2024-01-15_Ivan Moria  →  last segment after splitting on _
  // FORMAT B (simplified): DASS21_Ivan  →  last segment
  // Both: last underscore-separated token, first word only
  const parts = basename.split('_');
  if (parts.length < 2) return;
  // Skip date-like segments (digits only or YYYY-MM-DD)
  const nameParts = parts.filter(p => !/^\d{4}-\d{2}-\d{2}$/.test(p) && !/^\d+$/.test(p));
  const nome = (nameParts[nameParts.length - 1] || parts[parts.length - 1]).split(' ')[0].trim().toLowerCase();
  if (!nome) return;

  // Extract scores
  let resultText = '';
  const resIdx = lines.findIndex(l=>l==='Resultados');
  if (resIdx >= 0) {
    const resLines = lines.slice(resIdx+1, resIdx+4);
    resultText = resLines.map(l=>{
      const p = l.split(/\s+/);
      if (p.length<3) return '';
      let ini = p[0][0].toUpperCase();
      if (ini==='E') ini='S';
      return `${ini}${p[1]}${p[2][0].toUpperCase()}`;
    }).filter(Boolean).join(' ');
  }

  // Extract gender and age
  let genero='N/A', idade='N/A';
  const hdIdx = lines.findIndex(l=>l.includes('Nome')&&l.includes('Gênero')&&l.includes('Idade'));
  if (hdIdx>=0 && hdIdx+1<lines.length) {
    const dp = lines[hdIdx+1].split(/\s+/).filter(Boolean);
    if (dp.length>=3) {
      const potIdade = dp[dp.length-2], potGenero = dp[dp.length-3];
      if (/^\d+$/.test(potIdade)) {
        idade = potIdade;
        const g = potGenero.toLowerCase();
        genero = ['masc','masculino','m'].includes(g)?'Masculino':['fem','feminino','f'].includes(g)?'Feminino':potGenero;
      }
    }
  }

  // Parse D, A, S
  let D=NaN, A=NaN, S=NaN;
  const dm=resultText.match(/D(\d+)/); if(dm) D=parseInt(dm[1]);
  const am=resultText.match(/A(\d+)/); if(am) A=parseInt(am[1]);
  const sm=resultText.match(/S(\d+)/); if(sm) S=parseInt(sm[1]);

  STATE.dassData[nome] = {scores:resultText, genero, idade, D, A, S};
}

function renderParticipantGrid() {
  const head = document.getElementById('part-grid-head');
  const body = document.getElementById('part-grid-body');
  const sortedActs = [...STATE.allActivities].sort();
  const sortedParts = Object.keys(STATE.participants).sort();

  head.innerHTML = `<tr>
    <th style="position:sticky;left:0;z-index:2">Músico</th>
    <th style="position:sticky;left:32px;z-index:2">Participante</th>
    ${sortedActs.map(a=>`<th>${esc(a)}</th>`).join('')}
  </tr>`;

  body.innerHTML = sortedParts.map(p => {
    const sortedTakes = [...STATE.allTakes].sort((a,b)=>a-b);
    const isMusico = STATE.participantMusico[p] || false;
    return `<tr data-part="${esc(p)}">
      <td class="musico-col">
        <button class="musico-toggle ${isMusico?'on':''}" data-part="${esc(p)}" title="Músico?"></button>
      </td>
      <td class="part-name">${esc(displayName(p))}</td>
      ${sortedActs.map(act => {
        if (act === 'DASS21') {
          const d = STATE.dassData[p];
          return `<td class="dass-cell">${d ? esc(d.scores||'—') : '—'}</td>`;
        }
        const takes = STATE.participants[p]?.activities[act] || {};
        const takesAvail = Object.keys(takes).map(Number).sort((a,b)=>a-b);
        if (!takesAvail.length) return '<td></td>';
        return `<td>${takesAvail.map(t=>`<span class="take-cb" data-part="${esc(p)}" data-act="${esc(act)}" data-take="${t}" title="${esc(p)} · ${esc(act)} · take ${t}">T${t}</span>`).join('')}</td>`;
      }).join('')}
    </tr>`;
  }).join('');

  // Events
  body.querySelectorAll('.musico-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.part;
      STATE.participantMusico[p] = !STATE.participantMusico[p];
      btn.classList.toggle('on', STATE.participantMusico[p]);
    });
  });
  body.querySelectorAll('.take-cb').forEach(cb => {
    cb.addEventListener('click', () => { cb.classList.toggle('checked'); });
  });
}

function renderSelectAllTakes() {
  const row = document.getElementById('select-all-takes-row');
  const cont = document.getElementById('select-all-takes');
  if (!STATE.allTakes.size) { row.style.display='none'; return; }
  row.style.display='';
  const sortedTakes = [...STATE.allTakes].sort((a,b)=>a-b);
  cont.innerHTML = sortedTakes.map(t=>`<button class="toggle-btn" data-sat="${t}">${t}</button>`).join('');
  cont.querySelectorAll('[data-sat]').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = parseInt(btn.dataset.sat);
      btn.classList.toggle('on');
      const isOn = btn.classList.contains('on');
      document.querySelectorAll(`.take-cb[data-take="${t}"]`).forEach(cb=>cb.classList.toggle('checked',isOn));
    });
  });

  // "Último take de cada" — per participant × activity, mark only the highest take
  document.getElementById('btn-last-take').onclick = () => {
    // First uncheck everything
    document.querySelectorAll('.take-cb').forEach(cb => cb.classList.remove('checked'));

    // For each participant × activity, find the max take they actually have
    // and check only that specific checkbox
    Object.entries(STATE.participants).forEach(([part, data]) => {
      Object.entries(data.activities).forEach(([act, takes]) => {
        if (act === 'DASS21') return;
        const takesAvail = Object.keys(takes).map(Number).filter(t => !isNaN(t));
        if (!takesAvail.length) return;

        const lastTake = Math.max(...takesAvail);

        const cb = document.querySelector(
          `.take-cb[data-part="${part}"][data-act="${act}"][data-take="${lastTake}"]`
        );
        if (cb) cb.classList.add('checked');
      });
    });

    notify('⚡ Último take de cada (por participante × atividade)');
  };
}

// ── PROCESS ──
document.getElementById('btn-process').addEventListener('click', async () => {
  await processAndAggregate();
});

async function processAndAggregate() {
  const btn = document.getElementById('btn-process');
  btn.disabled = true; btn.textContent = '⏳ Processando…';

  STATE.bigDF = [];
  const temposMetronomo3 = [0,750,1500,2100,2700,3200,3644,4044,4444,4844,5244,5644,6044,6444,6844,7244,7644,8088,8532,9032,9532,10132,10800,11550,12300,13050,13800,14800,15800,16800,17800,18800,19800,20800,21400,22000,22600,23100,23600,24100,24544,24944,25344,25744,26144,26544,26944,27344,27744,28144,28544,28944,29344,29744,30188,30632,31076,31520,32020,32520,33020,33620,34220,34820,35420,36020,36620,37220,37820,38420,39020,39520,40020,40520,41020,41520,42020,42520,43020,43520,44020,44520,45020,45520,46020,46520];

  // Compute TTE BPM per participant
  const bpmTTE = {};
  for (const [p, data] of Object.entries(STATE.participants)) {
    const tteTakes = data.activities['TTE'] || {};
    const bpms = [];
    for (const [tk, file] of Object.entries(tteTakes)) {
      if (!isChecked(p, 'TTE', tk) || !file) continue;
      const text = await readFileText(file);
      const rows = readCSV(text);
      const times = rows.map(r=>r.Tempo).filter(x=>!isNaN(x)).sort((a,b)=>a-b);
      if (times.length > 1) {
        const iois = times.slice(1).map((t,i)=>t-times[i]);
        const mi = mean(iois);
        if (mi > 0) bpms.push(60000/mi);
      }
    }
    if (bpms.length) bpmTTE[p] = mean(bpms);
  }

  for (const [p, data] of Object.entries(STATE.participants)) {
    const musico = STATE.participantMusico[p] || false;
    const dassInfo = STATE.dassData[p] || {};
    const genero = dassInfo.genero || 'N/I';
    const idade = parseFloat(dassInfo.idade) || NaN;
    const D = dassInfo.D ?? NaN, A = dassInfo.A ?? NaN, S = dassInfo.S ?? NaN;

    for (const [act, takes] of Object.entries(data.activities)) {
      if (act === 'DASS21') continue;
      for (const [tk, file] of Object.entries(takes)) {
        if (!isChecked(p, act, tk) || !file) continue;
        const text = await readFileText(file);
        const rows = readCSV(text).sort((a,b)=>a.Tempo-b.Tempo);
        if (!rows.length || rows[0].Tempo===undefined) continue;

        const times = rows.map(r=>r.Tempo);
        const velocities = rows.map(r=>r.Velocity??NaN);
        const pressDurs = rows.map(r=>r.Press_dur??NaN);
        const n = times.length;

        // Metronome reference
        let tMetro = null;
        const actL = act.toLowerCase();
        if (['alla1','alla2'].includes(actL)) {
          const inter=500; const tMetroArr=[];
          for (let t=0; t<=times[n-1]+inter; t+=inter) tMetroArr.push(t);
          tMetro = times.map(t=>tMetroArr.reduce((best,m)=>Math.abs(m-t)<Math.abs(best-t)?m:best, tMetroArr[0]));
        } else if (actL==='alla3') {
          tMetro = times.map(t=>temposMetronomo3.reduce((best,m)=>Math.abs(m-t)<Math.abs(best-t)?m:best, temposMetronomo3[0]));
        } else if (['alla4','metro_150','metro_60','metro'].includes(actL)) {
          let bpm=100;
          if (actL.includes('150')) bpm=150;
          else if (actL.includes('60')) bpm=60;
          else if (actL==='metro') bpm=bpmTTE[p]||100;
          const inter=60000/bpm; const tMetroArr=[];
          for (let t=0; t<=times[n-1]+inter; t+=inter) tMetroArr.push(t);
          tMetro = times.map(t=>tMetroArr.reduce((best,m)=>Math.abs(m-t)<Math.abs(best-t)?m:best, tMetroArr[0]));
        }

        // Compute metrics
        const ioi_real = [NaN, ...times.slice(1).map((t,i)=>t-times[i])];
        const ioi_metro = tMetro ? [NaN, ...tMetro.slice(1).map((t,i)=>t-tMetro[i])] : Array(n).fill(NaN);
        const erroTempo = tMetro ? times.map((t,i)=>t-(tMetro[i]||t)) : Array(n).fill(NaN);
        const erroAbs = erroTempo.map(Math.abs);
        const MAE = mean(erroAbs.filter(x=>!isNaN(x)));
        const ioiValid = ioi_real.filter(x=>!isNaN(x)&&x>0);
        const ioiMean = mean(ioiValid), ioiStd = std(ioiValid);
        const CV = ioiMean>0 ? ioiStd/ioiMean : NaN;
        const jitter = [NaN, ...ioi_real.slice(2).map((v,i)=>Math.abs(v-(ioi_real[i+1]||0)))];
        const mean_jitter = mean(jitter.filter(x=>!isNaN(x)));
        const bpm_part = ioi_real.map(v=>v>0?60000/v:NaN);
        const media_velocity = mean(velocities.filter(x=>!isNaN(x)));
        const media_bpm_real = mean(bpm_part.filter(x=>!isNaN(x)));
        const takeNum = parseInt(tk)||0;

        for (let i=0; i<n; i++) {
          STATE.bigDF.push({
            participante: p, atividade: act, take: takeNum,
            ordem_batida: i+1, musico, Genero: genero, Idade: idade,
            Tempo: times[i], Tempo_metronomo: tMetro?tMetro[i]:NaN,
            erro_tempo: erroTempo[i], erro_absoluto: erroAbs[i], MAE,
            ioi_real: ioi_real[i], ioi_metronomo: ioi_metro[i],
            CV, jitter: jitter[i], mean_jitter,
            bpm_ponto_participante: bpm_part[i],
            Velocity: velocities[i], media_velocity, media_bpm_real,
            D, A, S
          });
        }
      }
    }
  }

  btn.disabled = false; btn.textContent = '⚙ Processar e Agrupar';
  if (!STATE.bigDF.length) { notify('Nenhum arquivo selecionado ou processável.', true); return; }

  // Build anonymization map: sorted names → P01, P02, ...
  const sortedParts = [...new Set(STATE.bigDF.map(r=>r.participante))].sort();
  STATE.anonMap = {};
  sortedParts.forEach((p, i) => {
    STATE.anonMap[p] = `P${String(i+1).padStart(2,'0')}`;
  });

  renderGroupedTable();
  updateAnalysis();
  populateActivityToggles();
  notify(`✓ ${STATE.bigDF.length} linhas processadas`);
}

function isChecked(part, act, take) {
  const cb = document.querySelector(`.take-cb[data-part="${part}"][data-act="${act}"][data-take="${take}"]`);
  return cb ? cb.classList.contains('checked') : false;
}

function renderGroupedTable() {
  const thRow = document.getElementById('grouped-thead-row');
  const tbody = document.getElementById('grouped-tbody');
  // Update badge
  const badge = document.getElementById('badge-df');
  if (badge) { badge.textContent = STATE.bigDF.length; badge.classList.add('show'); }

  const HIDDEN = new Set(['take','media_velocity','media_bpm_real','MAE','mean_jitter','media_abs_diff_bpm','erro_quadratico']);
  const cols = STATE.bigDF.length ? Object.keys(STATE.bigDF[0]).filter(c=>!HIDDEN.has(c)) : [];
  thRow.innerHTML = cols.map(c=>`<th>${esc(c)}</th>`).join('');

  const pageSize = 200;
  const rows = STATE.bigDF.slice(0, pageSize);

  tbody.innerHTML = rows.map(r=>
    `<tr>${cols.map(c=>{
      const v=r[c];
      if (c==='musico') return `<td class="${v?'musico-yes':'musico-no'}">${v?'✓ Músico':'Não-Músico'}</td>`;
      if (typeof v==='number'&&!isNaN(v)) return `<td class="num">${fmt(v,3)}</td>`;
      return `<td>${esc(String(v??'—'))}</td>`;
    }).join('')}</tr>`
  ).join('');
}

// ── EXPORT EXCEL ──
document.getElementById('btn-export-grouped').addEventListener('click', () => exportGroupedExcel());

function exportGroupedExcel() {
  if (!STATE.bigDF.length) return;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(STATE.bigDF), '1_Dados_Brutos');
  if (STATE.demoData && Object.keys(STATE.demoData).length) {
    const demoRows = Object.values(STATE.demoData);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(demoRows), '2_Demografia_Amostra');
  }
  if (STATE.rankData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(STATE.rankData), '3_Medias_Ritmicas');
  if (STATE.corrData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(STATE.corrData), '4_Correlacoes_Estatisticas');
  XLSX.writeFile(wb, 'Analise_Completa_Ritmica.xlsx');
  notify('✓ Excel exportado');
}

// ── SALVAR / CARREGAR SELEÇÃO ─────────────────────────────
document.getElementById('btn-save-selection').addEventListener('click', () => {
  if (!Object.keys(STATE.participants).length) {
    notify('Nenhum dado carregado para salvar', true); return;
  }
  const selection = {
    version: 1,
    timestamp: new Date().toISOString(),
    participantMusico: { ...STATE.participantMusico },
    takes: {},
  };
  document.querySelectorAll('.take-cb').forEach(cb => {
    const key = `${cb.dataset.part}||${cb.dataset.act}||${cb.dataset.take}`;
    selection.takes[key] = cb.classList.contains('checked');
  });
  const blob = new Blob([JSON.stringify(selection, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `tmirim_selecao_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  notify('✓ Seleção salva');
});

document.getElementById('btn-load-selection').addEventListener('click', () => {
  document.getElementById('selection-import-input').click();
});

document.getElementById('selection-import-input').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // ── Version 2: complete export (bigDF + all state) ────
    if (data.version === 2 && data.bigDF) {
      await loadCompleteJSON(data);
    }
    // ── Version 1: selection only (takes + musico flags) ──
    else if (data.takes || data.participantMusico) {
      await loadSelectionJSON(data);
    }
    else {
      notify('Formato de arquivo não reconhecido', true);
    }
  } catch(err) {
    notify('Erro ao carregar: ' + err.message, true);
    console.error(err);
  }
  e.target.value = '';
});

async function loadSelectionJSON(sel) {
  if (sel.participantMusico) {
    Object.entries(sel.participantMusico).forEach(([p, val]) => {
      STATE.participantMusico[p] = val;
      const btn = document.querySelector(`.musico-toggle[data-part="${p}"]`);
      if (btn) btn.classList.toggle('on', val);
    });
  }
  let restored = 0;
  if (sel.takes) {
    Object.entries(sel.takes).forEach(([key, checked]) => {
      const [part, act, take] = key.split('||');
      const cb = document.querySelector(`.take-cb[data-part="${part}"][data-act="${act}"][data-take="${take}"]`);
      if (cb) { cb.classList.toggle('checked', checked); restored++; }
    });
  }
  await processAndAggregate();
  notify(`✓ Seleção carregada (${restored} takes restaurados)`);
}

async function loadCompleteJSON(data) {
  // ── Restore full STATE directly from the JSON ─────────
  STATE.bigDF    = data.bigDF    || [];
  STATE.rankData = data.rankData || [];
  STATE.corrData = data.corrData || [];

  // Rebuild allActivities and allTakes from bigDF
  STATE.allActivities = new Set(STATE.bigDF.map(r => r.atividade).filter(Boolean));
  STATE.allTakes      = new Set(STATE.bigDF.map(r => r.take).filter(v => v !== undefined && v !== null).map(Number));

  // Restore participantMusico from selecao or participantes list
  STATE.participantMusico = {};
  if (data.selecao?.participantMusico) {
    Object.assign(STATE.participantMusico, data.selecao.participantMusico);
  } else if (data.participantes) {
    data.participantes.forEach(p => {
      STATE.participantMusico[p.nome] = p.musico;
    });
  }

  // Rebuild participants structure (needed for grid)
  STATE.participants = {};
  STATE.bigDF.forEach(row => {
    const p   = row.participante;
    const act = row.atividade;
    const t   = row.take;
    if (!p || !act) return;
    if (!STATE.participants[p]) STATE.participants[p] = { activities: {} };
    if (!STATE.participants[p].activities[act]) STATE.participants[p].activities[act] = {};
    STATE.participants[p].activities[act][t] = null; // no File object, but structure exists
  });

  // Restore DASS data from participantes array
  STATE.dassData = {};
  if (data.participantes) {
    data.participantes.forEach(p => {
      if (p.D !== null || p.A !== null || p.S !== null) {
        STATE.dassData[p.nome] = {
          D: p.D, A: p.A, S: p.S,
          scores: p.dass_scores || '',
          genero: p.Genero || '',
          idade:  p.Idade  || '',
          ...(p.dass_raw || {}),
        };
        // Add DASS21 as pseudo-activity
        if (!STATE.participants[p.nome]) STATE.participants[p.nome] = { activities: {} };
        STATE.participants[p.nome].activities['DASS21'] = { '0': null };
        STATE.allActivities.add('DASS21');
      }
    });
  }

  // Build anonMap
  const sortedParts = [...new Set(STATE.bigDF.map(r => r.participante))].sort();
  STATE.anonMap = {};
  sortedParts.forEach((p, i) => { STATE.anonMap[p] = `P${String(i+1).padStart(2,'0')}`; });

  // Render the participant grid (no CSVs, so takes are display-only)
  renderParticipantGrid();
  renderSelectAllTakes();

  // Restore take checkbox states from selecao if present
  if (data.selecao?.takes) {
    // Grid just rendered — now mark the checkboxes
    Object.entries(data.selecao.takes).forEach(([key, checked]) => {
      const [part, act, take] = key.split('||');
      const cb = document.querySelector(`.take-cb[data-part="${part}"][data-act="${act}"][data-take="${take}"]`);
      if (cb) cb.classList.toggle('checked', checked);
    });
  } else {
    // No selection info — check all takes
    document.querySelectorAll('.take-cb').forEach(cb => cb.classList.add('checked'));
  }

  // Apply musico toggles on grid
  Object.entries(STATE.participantMusico).forEach(([p, val]) => {
    const btn = document.querySelector(`.musico-toggle[data-part="${p}"]`);
    if (btn) btn.classList.toggle('on', val);
  });

  // Render all dependent views
  renderGroupedTable();
  updateAnalysis();
  populateActivityToggles();

  // Disable process button since no CSV files are loaded
  const processBtn = document.getElementById('btn-process');
  if (processBtn) {
    processBtn.disabled = true;
    processBtn.textContent = '⚙ Processar e Agrupar';
  }

  // Show file count info
  const fileCount = document.getElementById('group-file-count');
  if (fileCount) fileCount.textContent = `📂 Sessão restaurada do JSON · ${nR} registros`;

  const nP = Object.keys(STATE.participants).length;
  const nR = STATE.bigDF.length;
  notify(`✓ Sessão restaurada: ${nP} participantes, ${nR} registros`);
}

document.getElementById('btn-df-process').addEventListener('click', async () => {
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelector('[data-page="group"]').classList.add('active');
  document.getElementById('page-group').classList.add('active');
});

// ── EXPORTAR TUDO (.json) ─────────────────────────────────
document.getElementById('btn-save-all-json').addEventListener('click', () => {
  if (!STATE.bigDF.length) {
    notify('Nenhum dado processado para exportar', true); return;
  }

  const payload = {
    version:   2,
    timestamp: new Date().toISOString(),
    meta: {
      totalParticipantes: Object.keys(STATE.participants).length,
      totalRegistros:     STATE.bigDF.length,
      atividades:         [...STATE.allActivities],
      takes:              [...STATE.allTakes].sort((a,b)=>a-b),
    },
    // All participant info: musico flag, DASS, demographic
    participantes: Object.keys(STATE.participants).sort().map(p => {
      const row  = STATE.bigDF.find(r => r.participante === p) || {};
      const dass = STATE.dassData[p] || {};
      return {
        nome:    p,
        musico:  STATE.participantMusico[p] || false,
        Genero:  row.Genero  || null,
        Idade:   row.Idade   || null,
        D:       row.D       ?? null,
        A:       row.A       ?? null,
        S:       row.S       ?? null,
        dass_scores:    dass.scores  || null,
        dass_raw:       dass,
        atividades: Object.keys(STATE.participants[p]?.activities || {})
          .filter(a => a !== 'DASS21')
          .map(a => ({
            nome:  a,
            takes: Object.keys(STATE.participants[p].activities[a] || {}),
          })),
      };
    }),
    // Full processed dataframe
    bigDF: STATE.bigDF,
    // Aggregated rank and correlation data
    rankData: STATE.rankData,
    corrData: STATE.corrData,
    // Músico / take selections
    selecao: {
      participantMusico: { ...STATE.participantMusico },
      takes: (() => {
        const t = {};
        document.querySelectorAll('.take-cb').forEach(cb => {
          const key = `${cb.dataset.part}||${cb.dataset.act}||${cb.dataset.take}`;
          t[key] = cb.classList.contains('checked');
        });
        return t;
      })(),
    },
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `tmirim_completo_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  notify(`✓ Exportado: ${STATE.bigDF.length} registros, ${Object.keys(STATE.participants).length} participantes`);
});
