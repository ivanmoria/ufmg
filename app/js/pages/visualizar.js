/* ═══════════════════════════════════════════
   T-MIRIM | MODULE: pages/visualizar
   ═══════════════════════════════════════════ */

/* ╔═══════════════════════════════════════════════════════════
   ║ MODULE: pages/visualizar
   ╚═══════════════════════════════════════════════════════════ */
// ═══════════════════════════════════════════════════════════
//  PAGE 4 — VISUALIZAR
// ═══════════════════════════════════════════════════════════

const PALETTES = {
  pastel: ['#a8d8ea','#aa96da','#fcbad3','#b5ead7','#ffdac1','#ffffd2'],
  vivid:  ['#2196f3','#e63946','#4caf50','#ff9800','#9c27b0','#00bcd4'],
  earth:  ['#c0845f','#7d9b76','#c9a84c','#6b8cae','#a0785a','#7a9a7e'],
  cool:   ['#3ddba8','#6bcbf0','#a78bfa','#f472b6','#38bdf8','#34d399'],
};

// ── GEAR: toggle options panel ─────────────────────────────
document.getElementById('btn-viz-gear').addEventListener('click', function() {
  const panel = document.getElementById('viz-options-panel');
  const isOpen = panel.classList.toggle('open');
  this.classList.toggle('open', isOpen);
  this.title = isOpen ? 'Fechar opções' : 'Opções avançadas';
});

// ── ACTIVITY TOGGLES (populated after data loads) ──────────
function _buildActivityToggles() {
  const cont    = document.getElementById('activity-toggles');
  const takesEl = document.getElementById('take-toggles');

  const acts = [...STATE.allActivities].filter(a => a !== 'DASS21').sort();

  if (acts.length === 0) {
    cont.innerHTML = '<span id="act-placeholder" style="font-size:.72rem;color:var(--textsub);align-self:center">— processe dados primeiro —</span>';
  } else {
    cont.innerHTML = acts.map(a =>
      `<button class="tbtn act on" data-act="${esc(a)}">${esc(a)}</button>`
    ).join('');
    // NO individual listeners here — delegation in viz-topbar handles toggle
  }
  document.getElementById('btn-act-all').onclick  = e => { e.stopPropagation(); cont.querySelectorAll('[data-act]').forEach(b => b.classList.add('on')); };
  document.getElementById('btn-act-none').onclick = e => { e.stopPropagation(); cont.querySelectorAll('[data-act]').forEach(b => b.classList.remove('on')); };

  // Populate hidden take-toggles (all on, for JS compat)
  const allTakes = [...STATE.allTakes].sort((a,b) => a-b);
  takesEl.innerHTML = allTakes.map(t =>
    `<button class="tbtn on" data-take="${t}">T${t}</button>`
  ).join('');
  document.getElementById('btn-take-all').onclick = e => { e.stopPropagation();
    takesEl.querySelectorAll('[data-take]').forEach(b => b.classList.add('on')); };
}

function populateActivityToggles() {
  _buildActivityToggles();
  populateTimingControls();
  updateTimingNav();
  populateDASS();
  populateExplorer();
  populateParticipants();

  const badge = document.getElementById('badge-group');
  if (badge) { badge.textContent = Object.keys(STATE.participants).length; badge.classList.toggle('show', Object.keys(STATE.participants).length > 0); }
  const badgeDf = document.getElementById('badge-df');
  if (badgeDf) { badgeDf.textContent = STATE.bigDF.length; badgeDf.classList.add('show'); }
}

// ── WIRE TOPBAR TOGGLES via event delegation ───────────────
document.getElementById('viz-topbar').addEventListener('click', e => {
  const btn = e.target.closest('.tbtn');
  if (!btn) return;
  // btn-act-all / none / take-all have their own onclick handlers with stopPropagation
  if (btn.id === 'btn-act-all' || btn.id === 'btn-act-none' || btn.id === 'btn-take-all') return;
  if (btn.dataset.dm) {
    document.querySelectorAll('[data-dm]').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    document.getElementById('individual-nav').style.display =
      btn.dataset.dm === 'individual' ? 'flex' : 'none';
    updatePartIndicator();
  } else {
    btn.classList.toggle('on');
  }
});
document.getElementById('viz-options-panel').addEventListener('click', e => {
  const btn = e.target.closest('.tbtn');
  if (btn && !btn.id) btn.classList.toggle('on');
});
document.getElementById('tog-boxplot').addEventListener('click',    function(){ this.classList.toggle('on'); });
document.getElementById('tog-timeseries').addEventListener('click', function(){ this.classList.toggle('on'); });

// ── DISPLAY MODE NAV ───────────────────────────────────────
let currentPartIdx = 0, currentPartList = [];
document.getElementById('btn-prev-part').addEventListener('click', () => {
  if (currentPartIdx > 0) { currentPartIdx--; updatePartIndicator(); generatePlots(); }
});
document.getElementById('btn-next-part').addEventListener('click', () => {
  if (currentPartIdx < currentPartList.length-1) { currentPartIdx++; updatePartIndicator(); generatePlots(); }
});
function updatePartIndicator() {
  currentPartList = [...new Set(STATE.bigDF.map(r => r.participante))].sort();
  const el = document.getElementById('part-indicator');
  if (!currentPartList.length) { el.textContent = '—'; return; }
  if (currentPartIdx >= currentPartList.length) currentPartIdx = 0;
  el.textContent = `${currentPartList[currentPartIdx]} (${currentPartIdx+1}/${currentPartList.length})`;
}

function getTogglesOn(attr) {
  return [...document.querySelectorAll(`[data-${attr}].on`)].map(b => b.dataset[attr]);
}

// ── PLOT LAYOUT ────────────────────────────────────────────
function getPlotLayout(title, ylabel, h) {
  const light = document.documentElement.classList.contains('light');
  const tc = light ? '#18202e' : '#dde1ef';
  const dc = light ? '#50597a' : '#6b748f';
  const gc = light ? '#d2d6e8' : '#272d40';
  return {
    title:  { text: title, font: { color: tc, family: 'Syne', size: 13 } },
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font:   { color: dc, family: 'DM Mono', size: 11 },
    yaxis:  { title: ylabel, color: dc, gridcolor: gc, zeroline: true, zerolinecolor: dc, zerolinewidth: 1 },
    xaxis:  { color: dc, gridcolor: gc },
    legend: { bgcolor: 'transparent', font: { color: dc, size: 10 } },
    margin: { l: 55, r: 10, t: 42, b: 48 },
    height: h || 300, autosize: true,
  };
}

// ── GENERATE PLOTS ─────────────────────────────────────────
document.getElementById('btn-plot').addEventListener('click', generatePlots);

async function generatePlots() {
  if (!STATE.bigDF.length) { notify('Carregue e processe dados (aba Agrupar)', true); return; }

  const metrics      = getTogglesOn('metric');
  const plotTypes    = getTogglesOn('pt');
  const statOpts     = getTogglesOn('st');
  const groups       = getTogglesOn('grp');
  const outlierPct   = parseFloat(document.getElementById('outlier-pct').value) || 0;
  const showBoxplot    = document.getElementById('tog-boxplot').classList.contains('on');
  const showTimeseries = document.getElementById('tog-timeseries').classList.contains('on');
  const plotarJunto    = document.getElementById('chk-plotar-junto').checked;
  const useGroupColor  = document.getElementById('chk-group-color').checked;
  const musColor  = document.getElementById('color-musico').value;
  const nmusColor = document.getElementById('color-nao').value;
  const palette   = PALETTES[document.getElementById('palette-select').value] || PALETTES.pastel;
  const isIndividual = document.querySelector('[data-dm].on')?.dataset?.dm === 'individual';

  let selectedActs = [...document.querySelectorAll('#activity-toggles [data-act].on')].map(b => b.dataset.act);
  if (!selectedActs.length) selectedActs = [...new Set(STATE.bigDF.map(r => r.atividade))].filter(a => a !== 'DASS21');
  const selectedTakes = [...document.querySelectorAll('#take-toggles [data-take].on')].map(b => parseInt(b.dataset.take));

  updatePartIndicator();
  const selectedPart = isIndividual ? currentPartList[currentPartIdx] : null;

  const area  = document.getElementById('plot-area');
  const empty = document.getElementById('plot-empty');
  area.innerHTML = '';
  empty.style.display = 'none';

  const YLABEL = { IOI:'IOI (ms)', Velocity:'Velocity', Density:'Densidade', BPM_Local:'BPM Local' };
  let anyPlots = false;

  for (const metric of metrics) {
    let mData = gatherMetricData(metric, selectedActs, selectedTakes, useGroupColor, musColor, nmusColor, palette);
    if (isIndividual && selectedPart) mData = mData.filter(d => d.nome === selectedPart);
    if (!mData.length) continue;
    anyPlots = true;

    const ylabel = YLABEL[metric] || metric;
    const mMus   = mData.filter(d =>  d.isMusico);
    const mNao   = mData.filter(d => !d.isMusico);
    const mkDiv  = () => { const d = document.createElement('div'); d.className = 'plot-wrap'; return d; };

    const block = document.createElement('div');
    block.className = 'viz-metric-block';
    const hdr = document.createElement('div');
    hdr.className = 'viz-metric-header';
    hdr.innerHTML = `<span>${metric}</span>`;
    block.appendChild(hdr);

    if (isIndividual) {
      if (showTimeseries) { const d=mkDiv(); block.appendChild(d); Plotly.newPlot(d, buildTSTraces(mData,groups,statOpts,plotTypes,musColor,nmusColor,useGroupColor), getPlotLayout(`${metric} — ${selectedPart}`,ylabel,360), {responsive:true,displayModeBar:false}); }
      if (showBoxplot)    { const d=mkDiv(); block.appendChild(d); Plotly.newPlot(d, buildBPTraces(mData,groups,outlierPct,musColor,nmusColor,useGroupColor),            getPlotLayout(`Boxplot ${metric} — ${selectedPart}`,ylabel,300), {responsive:true,displayModeBar:false}); }
    } else if (plotarJunto) {
      if (showTimeseries) {
        const showM=groups.includes('musicos')&&mMus.length, showNM=groups.includes('nao')&&mNao.length;
        if (showM||showNM) {
          const row=document.createElement('div'); row.className=showM&&showNM?'viz-row-2col':'viz-row-full';
          if(showM)  { const d=mkDiv(); row.appendChild(d); Plotly.newPlot(d,buildTSTraces(mMus,['musicos'],statOpts,plotTypes,musColor,nmusColor,useGroupColor),getPlotLayout(`Músicos — ${metric}`,ylabel,300),{responsive:true,displayModeBar:false}); }
          if(showNM) { const d=mkDiv(); row.appendChild(d); Plotly.newPlot(d,buildTSTraces(mNao,['nao'],    statOpts,plotTypes,musColor,nmusColor,useGroupColor),getPlotLayout(`Não-Músicos — ${metric}`,ylabel,300),{responsive:true,displayModeBar:false}); }
          block.appendChild(row);
        }
        const rowG=document.createElement('div'); rowG.className='viz-row-full';
        const dG=mkDiv(); rowG.appendChild(dG);
        Plotly.newPlot(dG, buildTSTraces(mData,groups,statOpts,plotTypes,musColor,nmusColor,useGroupColor), getPlotLayout(`Geral — ${metric}`,ylabel,320), {responsive:true,displayModeBar:false});
        block.appendChild(rowG);
      }
      if (showBoxplot) {
        const showM=groups.includes('musicos')&&mMus.length, showNM=groups.includes('nao')&&mNao.length;
        if (showM||showNM) {
          const row=document.createElement('div'); row.className=showM&&showNM?'viz-row-2col':'viz-row-full';
          if(showM)  { const d=mkDiv(); row.appendChild(d); Plotly.newPlot(d,buildBPTraces(mMus,['musicos'],outlierPct,musColor,nmusColor,useGroupColor),getPlotLayout(`Boxplot Músicos — ${metric}`,ylabel,280),{responsive:true,displayModeBar:false}); }
          if(showNM) { const d=mkDiv(); row.appendChild(d); Plotly.newPlot(d,buildBPTraces(mNao,['nao'],    outlierPct,musColor,nmusColor,useGroupColor),getPlotLayout(`Boxplot Não-Músicos — ${metric}`,ylabel,280),{responsive:true,displayModeBar:false}); }
          block.appendChild(row);
        }
      }
    } else {
      mData.forEach(d => {
        if (showTimeseries) { const div=mkDiv(); block.appendChild(div); Plotly.newPlot(div,buildTSTraces([d],groups,statOpts,plotTypes,musColor,nmusColor,useGroupColor),getPlotLayout(`${metric} — ${d.nome}`,ylabel,280),{responsive:true,displayModeBar:false}); }
      });
    }
    area.appendChild(block);
  }

  document.getElementById('btn-download-plots').disabled = !anyPlots;
  if (!anyPlots) empty.style.display = 'flex';
}

function gatherMetricData(metric, selectedActs, selectedTakes, useGroupColor, musColor, nmusColor, palette) {
  const seen = {};
  STATE.bigDF.forEach(r => {
    if (selectedActs  && selectedActs.length  > 0 && !selectedActs.includes(r.atividade))   return;
    if (selectedTakes && selectedTakes.length > 0 && !selectedTakes.includes(r.take))        return;
    const key = r.participante+'||'+r.atividade+'||'+r.take;
    if (!seen[key]) seen[key] = { nome:r.participante, isMusico:r.musico, rows:[] };
    seen[key].rows.push(r);
  });
  const result=[]; let pi=0;
  Object.values(seen).forEach(({nome,isMusico,rows}) => {
    rows.sort((a,b)=>a.Tempo-b.Tempo);
    let yVals;
    if      (metric==='IOI')       yVals=rows.map(r=>r.ioi_real);
    else if (metric==='Velocity')  yVals=rows.map(r=>r.Velocity);
    else if (metric==='Density')   yVals=rows.map(r=>{const i=r.ioi_real,p=r.Press_dur||NaN;return(i&&i>0&&!isNaN(p))?p/i:NaN;});
    else if (metric==='BPM_Local') yVals=rows.map(r=>r.bpm_ponto_participante);
    const valid=yVals.filter(v=>!isNaN(v)&&v!==null);
    if (!valid.length) return;
    const isMetro=nome.toLowerCase().includes('metro');
    const x=isMetro?rows.map((_,i)=>i):rows.map(r=>r.Tempo/1000);
    const color=useGroupColor?(isMusico?musColor:nmusColor):palette[pi++%palette.length];
    result.push({nome,isMusico,x,y:yVals,media:mean(valid),color});
  });
  return result;
}

function buildBPTraces(data,groups,outlierPct,musColor,nmusColor,useGroupColor){
  const showScatterBox = document.getElementById('chk-scatter-box')?.checked;
  const showNames      = document.getElementById('chk-show-names')?.checked;
  const traces = [];
  data.filter(d=>d.isMusico?groups.includes('musicos'):groups.includes('nao')).forEach(d=>{
    const col=useGroupColor?(d.isMusico?musColor:nmusColor):d.color;
    const clipped=clipOutliers(d.y.filter(v=>!isNaN(v)),outlierPct);
    const label = showNames ? displayName(d.nome) : (d.isMusico?'Músico':'Não-Músico');
    traces.push({type:'box',name:label,
      y:clipped,marker:{color:col},line:{color:col},boxmean:true,showlegend:true});
    if(showScatterBox){
      traces.push({type:'scatter',mode:'markers',name:label,y:clipped,x:clipped.map(()=>label),
        marker:{color:col,size:5,opacity:.4},showlegend:false});
    }
  });
  return traces;
}

function buildTSTraces(data,groups,statOpts,plotTypes,musColor,nmusColor,useGroupColor){
  const traces=[];
  const showLine=plotTypes.includes('line'),showScatter=plotTypes.includes('scatter');
  data.forEach(d=>{
    if(d.isMusico&&!groups.includes('musicos')) return;
    if(!d.isMusico&&!groups.includes('nao'))    return;
    const col=useGroupColor?(d.isMusico?musColor:nmusColor):d.color;
    const showNames2 = document.getElementById('chk-show-names')?.checked;
    const showLeg    = document.getElementById('chk-show-legend')?.checked;
    const label = showNames2 ? displayName(d.nome) : (d.isMusico?'Músico':'Não-Músico');
    if(showLine)    traces.push({type:'scatter',mode:'lines',  x:d.x,y:d.y,name:label,line:{color:col,width:1},opacity:.45,showlegend:!!showLeg});
    if(showScatter) traces.push({type:'scatter',mode:'markers',x:d.x,y:d.y,name:label,marker:{color:col,size:4},opacity:.35,showlegend:false});
  });
  for(const[key,label,col]of[['musicos','Músicos',musColor],['nao','Não-Músicos',nmusColor]]){
    if(!groups.includes(key)&&!groups.includes('geral')) continue;
    addStatsTraces(traces,data.filter(d=>key==='musicos'?d.isMusico:!d.isMusico),col,label,statOpts);
  }
  return traces;
}

function addStatsTraces(traces,data,color,label,statOpts){
  if(!data.length) return;
  const allY=data.flatMap(d=>d.y.filter(v=>!isNaN(v)));
  const allX=data.flatMap(d=>d.x.filter((_,i)=>!isNaN(d.y[i])));
  if(!allY.length) return;
  const xMin=Math.min(...allX),xMax=Math.max(...allX);
  if(statOpts.includes('media'))    traces.push({type:'scatter',mode:'lines',x:[xMin,xMax],y:[mean(allY),mean(allY)],name:`Média ${label}`,line:{color,width:2.5}});
  if(statOpts.includes('mediana'))  traces.push({type:'scatter',mode:'lines',x:[xMin,xMax],y:[median(allY),median(allY)],name:`Mediana ${label}`,line:{color,width:2.5,dash:'dash'}});
  if(statOpts.includes('regressao')){
    const pairs=allX.map((x,i)=>({x,y:allY[i]})).filter(p=>!isNaN(p.y));
    const xs=pairs.map(p=>p.x).sort((a,b)=>a-b);
    const{slope,intercept}=linReg(pairs.map(p=>p.x),pairs.map(p=>p.y));
    traces.push({type:'scatter',mode:'lines',x:[xs[0],xs[xs.length-1]],y:[slope*xs[0]+intercept,slope*xs[xs.length-1]+intercept],name:`Regr. ${label}`,line:{color,width:3,dash:'dot'}});
  }
}

document.getElementById('btn-download-plots').addEventListener('click',()=>{
  let i=0; document.querySelectorAll('.plot-wrap').forEach(div=>{
    if(div.data) Plotly.downloadImage(div,{format:'svg',filename:`tmirim_plot_${++i}`});
  }); notify('SVGs baixando…');
});
document.getElementById('btn-reset-colors').addEventListener('click',()=>{
  document.getElementById('color-musico').value='#2196f3';
  document.getElementById('color-nao').value='#e63946';
  notify('Cores restauradas');
});
