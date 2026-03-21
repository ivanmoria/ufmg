/* ═══════════════════════════════════════════
   T-MIRIM | MODULE: pages/timing
   ═══════════════════════════════════════════ */

/* ╔═══════════════════════════════════════════════════════════
   ║ MODULE: pages/timing
   ╚═══════════════════════════════════════════════════════════ */
//  PAGE 5 — ERRO TEMPORAL (Shiny-like scatter/line per beat)
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  PAGE 5 — ERRO TEMPORAL
// ═══════════════════════════════════════════════════════════
function populateTimingControls() {
  const sel = document.getElementById('timing-atividade');
  const acts = [...new Set(STATE.bigDF.map(r=>r.atividade))].filter(a=>a!=='DASS21').sort();
  sel.innerHTML = acts.map(a=>`<option value="${esc(a)}">${esc(a)}</option>`).join('');
}

let timingPartIdx = 0;
let timingParts = [];

function updateTimingNav() {
  timingParts = [...new Set(STATE.bigDF.map(r=>r.participante))].sort();
  const el = document.getElementById('timing-part-label');
  if (!timingParts.length) { el.textContent = '—'; return; }
  if (timingPartIdx >= timingParts.length) timingPartIdx = 0;
  el.textContent = `${timingParts[timingPartIdx]} (${timingPartIdx+1}/${timingParts.length})`;
}

document.getElementById('btn-timing-prev').addEventListener('click', ()=>{
  if (timingPartIdx > 0) { timingPartIdx--; updateTimingNav(); }
});
document.getElementById('btn-timing-next').addEventListener('click', ()=>{
  if (timingPartIdx < timingParts.length-1) { timingPartIdx++; updateTimingNav(); }
});

['timing-ylim','timing-colorlim'].forEach(id => {
  const el = document.getElementById(id);
  const valEl = document.getElementById(id+'-val');
  el.addEventListener('input', ()=>{ valEl.textContent = el.value + ' ms'; });
});

document.getElementById('btn-timing-plot').addEventListener('click', generateTimingPlot);

function generateTimingPlot() {
  if (!STATE.bigDF.length) { notify('Sem dados — processe na aba Agrupar primeiro', true); return; }
  if (!document.getElementById('timing-atividade').value) {
    populateTimingControls();
    updateTimingNav();
    if (!document.getElementById('timing-atividade').value) {
      notify('Nenhuma atividade disponível — verifique se os dados foram processados', true); return;
    }
  }
  const act = document.getElementById('timing-atividade').value;
  const ylim = parseFloat(document.getElementById('timing-ylim').value);
  const colorLim = parseFloat(document.getElementById('timing-colorlim').value);
  const agrupado = document.getElementById('timing-agrupado').checked;
  const showVals = document.getElementById('timing-show-values').checked;
  const area = document.getElementById('timing-plot-area');
  const empty = document.getElementById('timing-empty');
  area.innerHTML = ''; empty.style.display = 'none';

  const isLight = document.documentElement.classList.contains('light');
  const tc = isLight ? '#18202e' : '#dde1ef';
  const gc = isLight ? '#d2d6e8' : '#272d40';
  const base = { paper_bgcolor:'transparent', plot_bgcolor:'transparent',
    font:{color:isLight?'#50597a':'#6b748f', family:'DM Mono', size:11},
    xaxis:{gridcolor:gc, color:isLight?'#50597a':'#6b748f'},
    yaxis:{range:[-ylim,ylim], gridcolor:gc, zeroline:true, zerolinecolor:tc, zerolinewidth:1.5,
           title:'Erro (ms)', color:isLight?'#50597a':'#6b748f'},
    margin:{l:55,r:10,t:45,b:55}, autosize:true, height:320 };

  const df = STATE.bigDF.filter(r=>r.atividade===act && !isNaN(r.erro_tempo));
  if (!df.length) { empty.style.display='flex'; empty.textContent='Sem dados de erro_tempo para esta atividade.'; return; }

  function makeErrorTraces(rows, musico) {
    const color = musico ? '#2196f3' : '#e63946';
    const x = rows.map(r=>r.Tempo/1000);
    const y = rows.map(r=>r.erro_tempo);
    const errNorm = rows.map(r=>Math.min(Math.abs(r.erro_tempo)/colorLim,1));
    const traces = [
      { type:'scatter', mode:'lines', x, y, line:{color:'#aaa',width:1}, showlegend:false, hoverinfo:'skip' },
      { type:'scatter', mode:'markers', x, y,
        marker:{ size:9, color:errNorm.map(n=>{ const r=Math.round(n*255); return musico?`rgb(${Math.round(n*33)},${Math.round((1-n)*150+n*33)},${Math.round(n*253+(1-n)*33)})`:`rgb(${Math.round(n*255)},${Math.round((1-n)*100)},${Math.round((1-n)*122)})`; }),
          line:{color:'#555',width:.5} },
        text: showVals ? rows.map(r=>Math.round(r.erro_tempo)+'ms') : undefined,
        textposition:'top center', mode: showVals ? 'markers+text' : 'markers',
        showlegend:false }
    ];
    return traces;
  }

  if (agrupado) {
    const mRows = df.filter(r=>r.musico);
    const nmRows = df.filter(r=>!r.musico);
    // Group by Tempo_metronomo: average across participants
    function groupAvg(rows) {
      const byTempo = {};
      rows.forEach(r=>{ const k=r.Tempo_metronomo||r.Tempo; if(!byTempo[k]) byTempo[k]=[]; byTempo[k].push(r.erro_tempo); });
      return Object.entries(byTempo).sort((a,b)=>+a[0]-+b[0]).map(([t,errs])=>({ Tempo:+t, erro_tempo:mean(errs) }));
    }
    const mAvg = groupAvg(mRows), nmAvg = groupAvg(nmRows);
    const subplots = [
      {rows:mAvg, label:'Músicos', musico:true},
      {rows:nmAvg, label:'Não-Músicos', musico:false}
    ];
    const rowDiv = document.createElement('div');
    rowDiv.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px';
    subplots.forEach(({rows,label,musico})=>{
      const d = document.createElement('div'); d.className='plot-wrap';
      rowDiv.appendChild(d);
      Plotly.newPlot(d, makeErrorTraces(rows, musico),
        {...base, title:{text:label+' — '+act, font:{color:tc,size:13}}}, {responsive:true,displayModeBar:false});
    });
    area.appendChild(rowDiv);
    // Combined
    const combDiv = document.createElement('div'); combDiv.className='plot-wrap';
    area.appendChild(combDiv);
    const mT = makeErrorTraces(mAvg, true).map(t=>({...t, name:'Músicos'}));
    const nmT = makeErrorTraces(nmAvg, false).map(t=>({...t, name:'Não-Músicos'}));
    Plotly.newPlot(combDiv, [...mT,...nmT],
      {...base, height:280, title:{text:'Comparação — '+act, font:{color:tc,size:13}}}, {responsive:true,displayModeBar:false});
  } else {
    updateTimingNav();
    const part = timingParts[timingPartIdx];
    const pRows = df.filter(r=>r.participante===part).sort((a,b)=>a.Tempo-b.Tempo);
    const isM = pRows[0]?.musico;
    const d = document.createElement('div'); d.className='plot-wrap';
    area.appendChild(d);
    Plotly.newPlot(d, makeErrorTraces(pRows, isM),
      {...base, height:360, title:{text:`${part} — ${act}`, font:{color:tc,size:13}}}, {responsive:true,displayModeBar:false});
  }
  document.getElementById('btn-timing-save').disabled = false;
}
