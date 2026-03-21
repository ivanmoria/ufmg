/* ═══════════════════════════════════════════
   T-MIRIM | MODULE: pages/dass
   ═══════════════════════════════════════════ */

/* ╔═══════════════════════════════════════════════════════════
   ║ MODULE: pages/dass
   ╚═══════════════════════════════════════════════════════════ */
// ═══════════════════════════════════════════════════════════
//  PAGE 6 — DASS-21
// ═══════════════════════════════════════════════════════════
function populateDASS() {
  if (!STATE.bigDF.length) return;
  const isLight = document.documentElement.classList.contains('light');
  const tc = isLight ? '#18202e' : '#dde1ef';
  const gc = isLight ? '#d2d6e8' : '#272d40';
  const plotBase = { paper_bgcolor:'transparent', plot_bgcolor:'transparent',
    font:{color:isLight?'#50597a':'#6b748f', family:'DM Mono', size:11},
    margin:{l:50,r:10,t:40,b:50}, autosize:true };

  // Unique per participant
  const parts = [...new Set(STATE.bigDF.map(r=>r.participante))];
  const demoRows = parts.map(p=>{
    const r = STATE.bigDF.find(x=>x.participante===p);
    return { p, musico:r.musico, D:r.D, A:r.A, S:r.S };
  }).filter(r=>!isNaN(r.D)||!isNaN(r.A)||!isNaN(r.S));

  if (!demoRows.length) {
    document.getElementById('dass-bar-plot').innerHTML =
      '<div style="color:var(--textdim);padding:20px;text-align:center">' +
      '<p style="font-size:1.1rem;margin-bottom:8px">📭 Sem dados DASS-21</p>' +
      '<p style="font-size:.85rem">Certifique-se de carregar arquivos DASS21_*.csv junto com os takes.<br>Os dados DASS são extraídos automaticamente ao processar a pasta.</p>' +
      '</div>';
    document.getElementById('dass-stat-cards').innerHTML =
      '<div class="stat-card" style="min-width:100%"><div class="val" style="font-size:1rem;color:var(--textdim)">Processe dados na aba Agrupar com arquivos DASS21 incluídos</div></div>';
    return;
  }

  // Stat cards
  const cards = document.getElementById('dass-stat-cards');
  const mRows = demoRows.filter(r=>r.musico), nmRows = demoRows.filter(r=>!r.musico);
  const classifyDASS = (val, scale) => {
    const thresholds = {D:[15,19,26,34],A:[8,10,15,20],S:[10,14,21,28]};
    const labels = ['Normal','Leve','Moderado','Severo','Extremamente Severo'];
    const t = thresholds[scale]||thresholds.D;
    for(let i=0;i<t.length;i++) if(val<t[i]) return labels[i];
    return labels[4];
  };
  const statList = [
    {val:demoRows.length, lbl:'Com DASS-21'},
    {val:fmt(mean(demoRows.map(r=>r.D).filter(x=>!isNaN(x))),1), lbl:'Média Depressão'},
    {val:fmt(mean(demoRows.map(r=>r.A).filter(x=>!isNaN(x))),1), lbl:'Média Ansiedade'},
    {val:fmt(mean(demoRows.map(r=>r.S).filter(x=>!isNaN(x))),1), lbl:'Média Estresse'},
  ];
  cards.innerHTML = statList.map(s=>`<div class="stat-card"><div class="val">${s.val}</div><div class="lbl">${s.lbl}</div></div>`).join('');

  // ── RADAR TRIANGULAR ────────────────────────────────────────────
  function buildRadar(groupMode) {
    const MAX = 42;
    const angles = [0, 2*Math.PI/3, 4*Math.PI/3]; // 3 eixos: D, A, S
    const labels = ['Depressão','Ansiedade','Estresse'];
    const keys   = ['D','A','S'];
    const isLight = document.documentElement.classList.contains('light');

    // Palettes
    const PALETTES = {
      musico:   { 'Músicos':'#2196f3', 'Não-Músicos':'#e63946' },
      genero:   { 'M':'#7b8cff', 'F':'#ff5e7a', 'N/I':'#ffcc44' },
      idade:    { '< 20':'#3ddba8', '20–29':'#2196f3', '30–39':'#ffcc44', '40+':'#ff5e7a' },
      individual: {},
    };
    const ageGroup = idade => {
      const a = parseFloat(idade);
      if (isNaN(a)) return 'N/I';
      if (a < 20)  return '< 20';
      if (a < 30)  return '20–29';
      if (a < 40)  return '30–39';
      return '40+';
    };

    // Build groups: { label → [rows] }
    let groups = {};
    if (groupMode === 'individual') {
      demoRows.forEach(r => { groups[r.p] = [r]; });
    } else if (groupMode === 'musico') {
      groups['Músicos']     = demoRows.filter(r=>r.musico);
      groups['Não-Músicos'] = demoRows.filter(r=>!r.musico);
    } else if (groupMode === 'genero') {
      demoRows.forEach(r => {
        const g = STATE.bigDF.find(x=>x.participante===r.p)?.Genero || 'N/I';
        (groups[g] = groups[g]||[]).push(r);
      });
    } else { // idade
      demoRows.forEach(r => {
        const idade = STATE.bigDF.find(x=>x.participante===r.p)?.Idade;
        const ag = ageGroup(idade);
        (groups[ag] = groups[ag]||[]).push(r);
      });
    }

    // Compute traces
    const traces = [];
    const palette = PALETTES[groupMode] || {};
    const fallbackColors = ['#3ddba8','#2196f3','#e63946','#ffcc44','#7b8cff','#ff5e7a','#aaa'];
    let ci = 0;

    // Axis lines (structural — drawn as scatter)
    // Grid circles at 14, 28, 42
    const gridR = [14/MAX, 28/MAX, 42/MAX];
    const nPts = 120;
    gridR.forEach(r => {
      const xs = [], ys = [];
      for (let i=0; i<=nPts; i++) {
        const a = (i/nPts)*2*Math.PI;
        xs.push(r * Math.cos(a - Math.PI/2));
        ys.push(r * Math.sin(a - Math.PI/2));
      }
      traces.push({
        x:xs, y:ys, mode:'lines', hoverinfo:'skip', showlegend:false,
        line:{color: isLight ? '#d2d6e8' : '#272d40', width:1, dash:'dot'},
      });
    });

    // Axis spokes + D/A/S labels
    angles.forEach((a, i) => {
      const ax = Math.cos(a - Math.PI/2), ay = Math.sin(a - Math.PI/2);
      traces.push({
        x:[0, ax], y:[0, ay], mode:'lines', hoverinfo:'skip', showlegend:false,
        line:{color: isLight ? '#bfc4d8' : '#323a52', width:1.5},
      });
      // Axis label (D / A / S)
      traces.push({
        x:[ax*1.2], y:[ay*1.2], mode:'text',
        text:[['D','A','S'][i]], hoverinfo:'skip', showlegend:false,
        textfont:{color: isLight?'#18202e':'#dde1ef', size:13, family:'DM Mono'},
        textposition:'middle center',
      });
      // Tick labels at 14, 28, 42
      [14,28,42].forEach(v => {
        const r = v/MAX;
        traces.push({
          x:[r*ax + Math.cos(a - Math.PI/2 + 0.15)*0.04],
          y:[r*ay + Math.sin(a - Math.PI/2 + 0.15)*0.04],
          mode:'text', text:[String(v)], hoverinfo:'skip', showlegend:false,
          textfont:{color: isLight?'#8890a8':'#4a5168', size:9, family:'DM Mono'},
          textposition:'middle center',
        });
      });
    });

    // Data traces
    Object.entries(groups).forEach(([label, rows]) => {
      if (!rows.length) return;
      const color = palette[label] || fallbackColors[ci++ % fallbackColors.length];
      const isGroup = groupMode !== 'individual';

      if (isGroup) {
        // Mean polygon
        const meanVals = keys.map(k => mean(rows.map(r=>r[k]).filter(x=>!isNaN(x))));
        const pts = angles.map((a,i) => {
          const r = (meanVals[i]||0)/MAX;
          return [r*Math.cos(a-Math.PI/2), r*Math.sin(a-Math.PI/2)];
        });
        pts.push(pts[0]);
        traces.push({
          x:pts.map(p=>p[0]), y:pts.map(p=>p[1]),
          mode:'lines', name:label, legendgroup:label,
          line:{color, width:2.5},
          fill:'toself', fillcolor:color.replace(')',',0.12)').replace('rgb','rgba').replace('#','').length > 9
            ? color : hexAlpha(color,0.12),
          hovertemplate: `<b>${label}</b><br>D:${fmt(meanVals[0],1)} A:${fmt(meanVals[1],1)} S:${fmt(meanVals[2],1)}<extra></extra>`,
        });
      } else {
        // Individual: one polygon per participant
        rows.forEach(r => {
          const pts = angles.map((a,i) => {
            const val = r[keys[i]] || 0;
            const rv = val/MAX;
            return [rv*Math.cos(a-Math.PI/2), rv*Math.sin(a-Math.PI/2)];
          });
          pts.push(pts[0]);
          const c = palette[label] || fallbackColors[ci % fallbackColors.length];
          traces.push({
            x:pts.map(p=>p[0]), y:pts.map(p=>p[1]),
            mode:'lines', name:displayName(r.p), legendgroup:r.p,
            line:{color:c, width:1.8},
            fill:'toself', fillcolor:hexAlpha(c,0.08),
            hovertemplate:`<b>${displayName(r.p)}</b><br>D:${isNaN(r.D)?'—':fmt(r.D,1)} A:${isNaN(r.A)?'—':fmt(r.A,1)} S:${isNaN(r.S)?'—':fmt(r.S,1)}<extra></extra>`,
          });
          ci++;
        });
      }
    });

    const radarDiv = document.getElementById('dass-radar-plot');
    Plotly.newPlot(radarDiv, traces, {
      paper_bgcolor:'transparent', plot_bgcolor:'transparent',
      font:{color: isLight?'#50597a':'#6b748f', family:'DM Mono', size:11},
      xaxis:{visible:false, range:[-1.35,1.35], fixedrange:true},
      yaxis:{visible:false, range:[-1.35,1.35], fixedrange:true, scaleanchor:'x'},
      margin:{l:20,r:20,t:10,b:10},
      legend:{orientation:'h', y:-0.05, x:0.5, xanchor:'center',
        font:{color: isLight?'#50597a':'#6b748f', size:11},
        bgcolor:'transparent'},
      height:360, autosize:true,
    }, {responsive:true, displayModeBar:false});
  }

  function hexAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  buildRadar(document.getElementById('radar-group-sel')?.value || 'individual');

  document.getElementById('btn-radar-update').onclick = () => {
    buildRadar(document.getElementById('radar-group-sel').value);
  };
  document.getElementById('radar-group-sel').onchange = () => {
    buildRadar(document.getElementById('radar-group-sel').value);
  };

  // Bar chart grouped
  const groups = mRows.length ? [{label:'Músicos',rows:mRows,color:'#2196f3'},{label:'Não-Músicos',rows:nmRows,color:'#e63946'}]
                               : [{label:'Todos',rows:demoRows,color:'#3ddba8'}];
  const traces = groups.flatMap(({label,rows,color})=>
    ['D','A','S'].map(sc=>({
      type:'bar', name:`${label} — ${sc}`, x:[sc], y:[mean(rows.map(r=>r[sc]).filter(x=>!isNaN(x)))],
      marker:{color:color, opacity: sc==='D'?1:sc==='A'?.7:.45},
      error_y:{type:'data', array:[std(rows.map(r=>r[sc]).filter(x=>!isNaN(x)))], visible:true},
      legendgroup:label, showlegend:sc==='D',
    }))
  );
  const barDiv = document.getElementById('dass-bar-plot');
  Plotly.newPlot(barDiv, traces, {...plotBase, barmode:'group', height:260,
    title:{text:'', font:{color:tc,size:12}},
    xaxis:{gridcolor:gc,color:isLight?'#50597a':'#6b748f'},
    yaxis:{title:'Score DASS-21',gridcolor:gc,color:isLight?'#50597a':'#6b748f'}
  }, {responsive:true,displayModeBar:false});

  // Classification table — horizontal layout
  const tbody = document.getElementById('dass-table-body');
  const clsColor = (v, scale) => {
    const cls = classifyDASS(v, scale);
    const map = {'Normal':'var(--accent)','Leve':'var(--accent3)','Moderado':'#ff9800','Severo':'var(--accent2)','Extremamente Severo':'var(--accent2)'};
    return map[cls] || 'var(--textdim)';
  };
  tbody.innerHTML = demoRows.map(r=>`<tr>
    <td style="font-weight:700">${esc(displayName(r.p))}</td>
    <td><span class="chip ${r.musico?'m':'nm'}">${r.musico?'Músico':'Não-Músico'}</span></td>
    <td class="num" style="font-weight:700">${isNaN(r.D)?'—':fmt(r.D,1)}</td>
    <td style="color:${isNaN(r.D)?'var(--textsub)':clsColor(r.D,'D')};font-size:.78rem">${isNaN(r.D)?'—':classifyDASS(r.D,'D')}</td>
    <td class="num" style="font-weight:700">${isNaN(r.A)?'—':fmt(r.A,1)}</td>
    <td style="color:${isNaN(r.A)?'var(--textsub)':clsColor(r.A,'A')};font-size:.78rem">${isNaN(r.A)?'—':classifyDASS(r.A,'A')}</td>
    <td class="num" style="font-weight:700">${isNaN(r.S)?'—':fmt(r.S,1)}</td>
    <td style="color:${isNaN(r.S)?'var(--textsub)':clsColor(r.S,'S')};font-size:.78rem">${isNaN(r.S)?'—':classifyDASS(r.S,'S')}</td>
  </tr>`).join('');

  // Scatter handler
  document.getElementById('btn-dass-scatter').onclick = () => {
    const scale = document.getElementById('dass-scale-sel').value;
    const metric = document.getElementById('dass-metric-sel').value;
    const pairs = parts.map(p=>{
      const rows = STATE.bigDF.filter(r=>r.participante===p&&!isNaN(r[metric]));
      const r0 = STATE.bigDF.find(r=>r.participante===p);
      return { x:mean(rows.map(r=>r[metric])), y:r0?.[scale], musico:r0?.musico, p };
    }).filter(r=>!isNaN(r.x)&&!isNaN(r.y));
    const mP = pairs.filter(r=>r.musico), nmP = pairs.filter(r=>!r.musico);
    const scatTraces = [
      {type:'scatter', mode:'markers+text', name:'Músicos',
       x:mP.map(r=>r.x), y:mP.map(r=>r.y), text:mP.map(r=>displayName(r.p)),
       textposition:'top center', marker:{color:'#2196f3',size:10,opacity:.8}},
      {type:'scatter', mode:'markers+text', name:'Não-Músicos',
       x:nmP.map(r=>r.x), y:nmP.map(r=>r.y), text:nmP.map(r=>displayName(r.p)),
       textposition:'top center', marker:{color:'#e63946',size:10,opacity:.8}},
    ];
    if (pairs.length > 2) {
      const {r,p} = pearsonR(pairs.map(x=>x.x), pairs.map(x=>x.y));
      const {slope,intercept} = linReg(pairs.map(x=>x.x), pairs.map(x=>x.y));
      const xs = pairs.map(x=>x.x).sort((a,b)=>a-b);
      scatTraces.push({type:'scatter', mode:'lines', name:`r=${fmt(r,2)} p=${fmt(p,3)}${p<.05?' ★':''}`,
        x:xs, y:xs.map(x=>slope*x+intercept), line:{dash:'dot',color:'#ffcc44',width:2}});
    }
    const scatDiv = document.getElementById('dass-scatter-plot');
    Plotly.newPlot(scatDiv, scatTraces, {...plotBase, height:280,
      title:{text:`${scale} × ${metric}`, font:{color:tc,size:12}},
      xaxis:{title:metric, gridcolor:gc, color:isLight?'#50597a':'#6b748f'},
      yaxis:{title:scale, gridcolor:gc, color:isLight?'#50597a':'#6b748f'}
    }, {responsive:true,displayModeBar:false});
  };
}
