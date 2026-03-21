/* ═══════════════════════════════════════════
   T-MIRIM | MODULE: pages/explorar
   ═══════════════════════════════════════════ */

/* ╔═══════════════════════════════════════════════════════════
   ║ MODULE: pages/explorar
   ╚═══════════════════════════════════════════════════════════ */
// ═══════════════════════════════════════════════════════════
//  PAGE 3 — EXPLORAR DADOS
// ═══════════════════════════════════════════════════════════
// ── EXPLORER — wired once at startup, renders on demand ──────
const EXPLORER_HIDDEN = new Set(['take','media_velocity','media_bpm_real','mean_jitter']);

function getExplorerCols() {
  if (!STATE.bigDF.length) return [];
  return Object.keys(STATE.bigDF[0]).filter(c => !EXPLORER_HIDDEN.has(c));
}

function populateExplorer() {
  if (!STATE.bigDF.length) return;
  const cols = getExplorerCols();

  // Re-populate filter selects
  const actSel = document.getElementById('explore-filter-ativ');
  const sortSel = document.getElementById('explore-sort-col');
  const currentAct = actSel.value;
  const currentSort = sortSel.value;

  actSel.innerHTML = '<option value="">Todas atividades</option>';
  [...new Set(STATE.bigDF.map(r => r.atividade))].sort().forEach(a => {
    actSel.innerHTML += `<option value="${esc(a)}"${a===currentAct?' selected':''}>${esc(a)}</option>`;
  });
  sortSel.innerHTML = '<option value="">Ordenar por…</option>';
  cols.forEach(c => {
    sortSel.innerHTML += `<option value="${c}"${c===currentSort?' selected':''}>${c}</option>`;
  });

  renderExplorer();
}

function renderExplorer() {
  const cols = getExplorerCols();
  if (!cols.length) {
    document.getElementById('explore-count').textContent = 'Sem dados — processe na aba Agrupar primeiro.';
    document.getElementById('explore-thead').innerHTML = '';
    document.getElementById('explore-tbody').innerHTML = '';
    return;
  }

  const search  = document.getElementById('explore-search').value.toLowerCase().trim();
  const filterM = document.getElementById('explore-filter-musico').value;
  const filterA = document.getElementById('explore-filter-ativ').value;
  const sortCol = document.getElementById('explore-sort-col').value;
  const sortDir = document.getElementById('explore-sort-dir').dataset.dir || 'asc';

  let rows = [...STATE.bigDF];
  if (search)   rows = rows.filter(r =>
    String(r.participante || '').toLowerCase().includes(search) ||
    String(r.atividade    || '').toLowerCase().includes(search)
  );
  if (filterM)  rows = rows.filter(r => String(r.musico) === filterM);
  if (filterA)  rows = rows.filter(r => r.atividade === filterA);
  if (sortCol)  rows.sort((a, b) => {
    const av = a[sortCol], bv = b[sortCol];
    if (typeof av === 'number' && typeof bv === 'number')
      return sortDir === 'asc' ? av - bv : bv - av;
    return sortDir === 'asc'
      ? String(av ?? '').localeCompare(String(bv ?? ''))
      : String(bv ?? '').localeCompare(String(av ?? ''));
  });

  const PAGE = 500;
  document.getElementById('explore-count').textContent =
    `${rows.length} registros${rows.length > PAGE ? ` (exibindo ${PAGE})` : ''}`;

  document.getElementById('explore-thead').innerHTML =
    cols.map(c => `<th>${esc(c)}</th>`).join('');

  document.getElementById('explore-tbody').innerHTML =
    rows.slice(0, PAGE).map(r =>
      `<tr>${cols.map(c => {
        const v = r[c];
        if (c === 'musico') return `<td class="${v ? 'musico-yes' : 'musico-no'}">${v ? '✓ Músico' : 'Não-Músico'}</td>`;
        if (typeof v === 'number' && !isNaN(v)) return `<td class="num">${fmt(v, 3)}</td>`;
        return `<td>${esc(String(v ?? '—'))}</td>`;
      }).join('')}</tr>`
    ).join('');
}

// Wire explorer controls once — use event delegation on the toolbar
(function wireExplorer() {
  const toolbar = document.querySelector('.explorer-toolbar');
  if (!toolbar) return;
  // Live filter on every input change
  toolbar.addEventListener('input',  () => renderExplorer());
  toolbar.addEventListener('change', () => renderExplorer());
  // Sort direction toggle
  document.getElementById('explore-sort-dir').addEventListener('click', function() {
    const dir = this.dataset.dir === 'asc' ? 'desc' : 'asc';
    this.dataset.dir = dir;
    this.textContent = dir === 'asc' ? '↑ ASC' : '↓ DESC';
    renderExplorer();
  });
  // Reset
  document.getElementById('btn-explore-reset').addEventListener('click', () => {
    document.getElementById('explore-search').value = '';
    document.getElementById('explore-filter-musico').value = '';
    document.getElementById('explore-filter-ativ').value = '';
    document.getElementById('explore-sort-col').value = '';
    document.getElementById('explore-sort-dir').dataset.dir = 'asc';
    document.getElementById('explore-sort-dir').textContent = '↑ ASC';
    renderExplorer();
  });
  // Also re-render when tab is clicked (data may have been loaded after)
  document.querySelector('[data-page="explore"]')?.addEventListener('click', () => {
    if (STATE.bigDF.length && !getExplorerCols().length) populateExplorer();
    else renderExplorer();
  });
})();

// ── CUSTOM ANALYSIS ───────────────────────────────────────
document.getElementById('btn-run-analysis').addEventListener('click', runCustomAnalysis);
function runCustomAnalysis() {
  if (!STATE.bigDF.length) { notify('Sem dados — processe na aba Agrupar primeiro', true); return; }
  if (!document.getElementById('timing-atividade').value) {
    populateTimingControls();
    updateTimingNav();
    if (!document.getElementById('timing-atividade').value) {
      notify('Nenhuma atividade disponível — verifique se os dados foram processados', true); return;
    }
  }
  const type=document.getElementById('custom-analysis-type').value;
  const metric=document.getElementById('custom-metric-col').value;
  const out=document.getElementById('custom-analysis-output');
  out.style.display='';
  let text='';
  const df=STATE.bigDF;

  if (type==='summary') {
    text='=== RESUMO ESTATÍSTICO — '+metric+' ===\n\n';
    const parts=[...new Set(df.map(r=>r.participante))].sort();
    parts.forEach(p=>{
      const vals=df.filter(r=>r.participante===p&&!isNaN(r[metric])).map(r=>r[metric]);
      if(!vals.length) return;
      const m=mean(vals), s=std(vals), cv=m>0?s/m:NaN;
      text+=`${p.padEnd(14)} n=${vals.length} média=${fmt(m,2)} DP=${fmt(s,2)} CV=${fmt(cv,3)} mediana=${fmt(median(vals),2)}\n`;
    });
  } else if (type==='compare_groups') {
    text='=== MÚSICOS vs NÃO-MÚSICOS — '+metric+' ===\n\n';
    const acts=[...new Set(df.map(r=>r.atividade))].sort();
    acts.forEach(act=>{
      const mVals=df.filter(r=>r.atividade===act&&r.musico&&!isNaN(r[metric])).map(r=>r[metric]);
      const nVals=df.filter(r=>r.atividade===act&&!r.musico&&!isNaN(r[metric])).map(r=>r[metric]);
      text+=`${act}:\n`;
      text+=`  Músicos     (n=${mVals.length}): M=${fmt(mean(mVals),3)} DP=${fmt(std(mVals),3)}\n`;
      text+=`  Não-Músicos (n=${nVals.length}): M=${fmt(mean(nVals),3)} DP=${fmt(std(nVals),3)}\n\n`;
    });
  } else if (type==='top_bottom') {
    text='=== TOP/BOTTOM 5 — '+metric+' (por participante) ===\n\n';
    const parts=[...new Set(df.map(r=>r.participante))];
    const means=parts.map(p=>{
      const vals=df.filter(r=>r.participante===p&&!isNaN(r[metric])).map(r=>r[metric]);
      return {p, m:mean(vals), musico:df.find(r=>r.participante===p)?.musico};
    }).filter(x=>!isNaN(x.m)).sort((a,b)=>a.m-b.m);
    text+='TOP 5 (Menor '+metric+'):\n';
    means.slice(0,5).forEach((x,i)=>{ text+=`  ${i+1}. ${x.p.padEnd(12)} ${fmt(x.m,3)} (${x.musico?'Músico':'Não-Músico'})\n`; });
    text+='\nBOTTOM 5 (Maior '+metric+'):\n';
    means.slice(-5).reverse().forEach((x,i)=>{ text+=`  ${i+1}. ${x.p.padEnd(12)} ${fmt(x.m,3)} (${x.musico?'Músico':'Não-Músico'})\n`; });
  } else if (type==='dass_rhythmic') {
    text='=== CORRELAÇÃO DASS-21 × '+metric+' ===\n\n';
    const parts=[...new Set(df.map(r=>r.participante))];
    const paired=parts.map(p=>{
      const rows=df.filter(r=>r.participante===p);
      return {
        metric: mean(rows.filter(r=>!isNaN(r[metric])).map(r=>r[metric])),
        D: rows[0]?.D, A: rows[0]?.A, S: rows[0]?.S, musico: rows[0]?.musico
      };
    }).filter(x=>!isNaN(x.metric));
    ['D','A','S'].forEach(scale=>{
      const clean=paired.filter(x=>!isNaN(x[scale]));
      const {r,p}=pearsonR(clean.map(x=>x.metric), clean.map(x=>x[scale]));
      text+=`${metric} × ${scale}: r=${fmt(r,3)} p=${fmt(p,3)} n=${clean.length}${p<0.05?' ★ SIG':''}\n`;
    });
  } else if (type==='per_activity') {
    text='=== RESUMO POR ATIVIDADE — '+metric+' ===\n\n';
    const acts=[...new Set(df.map(r=>r.atividade))].sort();
    acts.forEach(act=>{
      const vals=df.filter(r=>r.atividade===act&&!isNaN(r[metric])).map(r=>r[metric]);
      text+=`${act.padEnd(14)} n=${vals.length} M=${fmt(mean(vals),3)} DP=${fmt(std(vals),3)} med=${fmt(median(vals),3)}\n`;
    });
  } else if (type==='correlation_matrix') {
    const metrics=['CV','MAE','mean_jitter','bpm_ponto_participante','Velocity'];
    text='=== MATRIZ DE CORRELAÇÃO (Pearson) ===\n\n';
    text+='          '+metrics.map(m=>m.slice(0,7).padStart(8)).join(' ')+'\n';
    metrics.forEach(m1=>{
      text+=m1.slice(0,10).padEnd(10);
      metrics.forEach(m2=>{
        const pairs=df.filter(r=>!isNaN(r[m1])&&!isNaN(r[m2]));
        if(pairs.length<3){ text+='     —   '; return; }
        const {r}=pearsonR(pairs.map(x=>x[m1]),pairs.map(x=>x[m2]));
        text+=fmt(r,3).padStart(8)+' ';
      });
      text+='\n';
    });
  } else {
    text='Selecione um tipo de análise.';
  }
  out.textContent=text;
}
