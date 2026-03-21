/* ═══════════════════════════════════════════
   T-MIRIM | MODULE: pages/participantes
   ═══════════════════════════════════════════ */

/* ╔═══════════════════════════════════════════════════════════
   ║ MODULE: pages/participantes
   ╚═══════════════════════════════════════════════════════════ */
// ═══════════════════════════════════════════════════════════
//  PAGE — PARTICIPANTES
// ═══════════════════════════════════════════════════════════
function populateParticipants() {
  const grid  = document.getElementById('part-cards-grid');
  const empty = document.getElementById('part-cards-empty');
  if (!STATE.bigDF.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const parts = [...new Set(STATE.bigDF.map(r=>r.participante))].sort();
  const classifyDASS = (val, scale) => {
    const t = {D:[15,19,26,34],A:[8,10,15,20],S:[10,14,21,28]};
    const l = ['Normal','Leve','Moderado','Severo','Ext. Severo'];
    const th = t[scale]||t.D;
    for(let i=0;i<th.length;i++) if(val<th[i]) return l[i];
    return l[4];
  };

  grid.innerHTML = parts.map(p => {
    const first = STATE.bigDF.find(r=>r.participante===p);
    const isMusico = first?.musico;
    const idade = first?.Idade || '—';
    const genero = first?.Genero || '—';
    const D = parseFloat(first?.D), A = parseFloat(first?.A), S = parseFloat(first?.S);
    const hasDass = !isNaN(D) || !isNaN(A) || !isNaN(S);
    const acts = [...new Set(STATE.bigDF.filter(r=>r.participante===p).map(r=>r.atividade))].filter(a=>a!=='DASS21');

    // Mini radar SVG
    let radarSvg = '';
    if (hasDass) {
      const MAX = 42, R = 30, CX = 44, CY = 44;
      const angles = [0, 2*Math.PI/3, 4*Math.PI/3].map(a => a - Math.PI/2);
      const vals = [isNaN(D)?0:D, isNaN(A)?0:A, isNaN(S)?0:S];
      const color = isMusico ? '#2196f3' : '#e63946';

      const gridCircles = [14,28,42].map(v => {
        const r = (v/MAX)*R;
        return `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.2"/>`;
      }).join('');

      const spokes = angles.map(a =>
        `<line x1="${CX}" y1="${CY}" x2="${CX+Math.cos(a)*R}" y2="${CY+Math.sin(a)*R}" stroke="currentColor" stroke-width="0.5" opacity="0.25"/>`
      ).join('');

      const pts = vals.map((v,i) => {
        const r = (v/MAX)*R;
        return `${CX+Math.cos(angles[i])*r},${CY+Math.sin(angles[i])*r}`;
      }).join(' ');

      const axisLabels = ['D','A','S'].map((lbl,i) => {
        const r = R + 9;
        const x = CX + Math.cos(angles[i])*r;
        const y = CY + Math.sin(angles[i])*r;
        return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="7" fill="currentColor" opacity="0.7" font-weight="700">${lbl}</text>`;
      }).join('');

      radarSvg = `<svg width="88" height="88" style="flex-shrink:0;color:var(--textdim)" viewBox="0 0 88 88">
        ${gridCircles}${spokes}
        <polygon points="${pts}" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="1.5"/>
        ${axisLabels}
      </svg>`;
    }

    return `<div class="part-card ${isMusico?'musico':'nmusico'}" data-part="${esc(p)}" onclick="openParticipant('${esc(p)}')">
      <div style="display:flex;gap:8px;align-items:flex-start">
        <div style="flex:1;min-width:0">
          <div class="pc-name">${esc(displayName(p))}</div>
          <div class="pc-badge">${isMusico?'Músico':'Não-Músico'}</div>
          <div class="pc-meta">
            ${idade!=='—'?`Idade: ${idade}<br>`:''}
            ${genero!=='—'?`Gênero: ${genero}<br>`:''}
            ${acts.length} atividade${acts.length!==1?'s':''}
          </div>
          ${hasDass?`<div class="pc-dass">D:${isNaN(D)?'—':fmt(D,0)} A:${isNaN(A)?'—':fmt(A,0)} S:${isNaN(S)?'—':fmt(S,0)}</div>`:''}
        </div>
        ${radarSvg}
      </div>
    </div>`;
  }).join('');

  // Filters
  const showFilter = () => {
    const showM  = document.getElementById('pf-musico')?.classList.contains('on');
    const showNM = document.getElementById('pf-nmusico')?.classList.contains('on');
    grid.querySelectorAll('.part-card').forEach(card => {
      const isM = card.classList.contains('musico');
      card.style.display = (isM && showM) || (!isM && showNM) ? '' : 'none';
    });
  };
  ['pf-musico','pf-nmusico'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.onclick = () => { btn.classList.toggle('on'); showFilter(); };
  });
  const allBtn = document.getElementById('pf-all');
  if (allBtn) allBtn.onclick = () => {
    document.getElementById('pf-musico').classList.add('on');
    document.getElementById('pf-nmusico').classList.add('on');
    showFilter();
  };
}

function openParticipant(p) {
  const overlay = document.getElementById('part-detail-overlay');
  const rows = STATE.bigDF.filter(r=>r.participante===p);
  const first = rows[0];
  if (!first) return;

  document.getElementById('pd-name').textContent = displayName(p);
  document.getElementById('pd-sub').textContent =
    `${first.musico?'Músico':'Não-Músico'}${first.Genero?' · '+first.Genero:''}${first.Idade?' · '+first.Idade+' anos':''}`;

  // DASS KPIs
  const classifyDASS = (val, scale) => {
    const t = {D:[15,19,26,34],A:[8,10,15,20],S:[10,14,21,28]};
    const l = ['Normal','Leve','Moderado','Severo','Ext. Severo'];
    const th = t[scale]||t.D;
    for(let i=0;i<th.length;i++) if(val<th[i]) return l[i];
    return l[4];
  };
  const D=first.D, A=first.A, S=first.S;
  const dassKpis = document.getElementById('pd-dass-kpis');
  if (isNaN(D) && isNaN(A) && isNaN(S)) {
    dassKpis.innerHTML = '<span style="color:var(--textdim);font-size:.8rem">Sem dados DASS-21</span>';
    document.getElementById('pd-dass-radar').innerHTML = '';
  } else {
    dassKpis.innerHTML = [['D','Depressão',D],['A','Ansiedade',A],['S','Estresse',S]].map(([k,lbl,v])=>`
      <div class="pd-kpi">
        <div class="k-val">${isNaN(v)?'—':fmt(v,1)}</div>
        <div class="k-lbl">${lbl}</div>
        ${!isNaN(v)?`<div style="font-size:.65rem;margin-top:2px;color:var(--textdim)">${classifyDASS(v,k)}</div>`:''}
      </div>`).join('');

    // Radar DASS no popup
    const MAX = 42, R = 1.0;
    const isLight = document.documentElement.classList.contains('light');
    const color = first.musico ? '#2196f3' : '#e63946';
    const axAngles = [0, 2*Math.PI/3, 4*Math.PI/3].map(a => a - Math.PI/2);
    const axLabels = ['Depressão','Ansiedade','Estresse'];
    const vals = [isNaN(D)?0:D, isNaN(A)?0:A, isNaN(S)?0:S];
    const gridR = [14/MAX, 28/MAX, 42/MAX];
    const nPts = 120;
    const gc = isLight ? '#d2d6e8' : '#323a52';
    const radarTraces = [];

    // Grid circles
    gridR.forEach(r => {
      const xs=[], ys=[];
      for(let i=0;i<=nPts;i++){const a=(i/nPts)*2*Math.PI; xs.push(r*Math.cos(a)); ys.push(r*Math.sin(a));}
      radarTraces.push({x:xs,y:ys,mode:'lines',hoverinfo:'skip',showlegend:false,line:{color:gc,width:1,dash:'dot'}});
    });
    // Spokes + tick labels
    axAngles.forEach((a,i) => {
      const ax=Math.cos(a), ay=Math.sin(a);
      radarTraces.push({x:[0,ax],y:[0,ay],mode:'lines',hoverinfo:'skip',showlegend:false,line:{color:gc,width:1.2}});
      radarTraces.push({x:[ax*1.25],y:[ay*1.25],mode:'text',text:[axLabels[i]],hoverinfo:'skip',showlegend:false,
        textfont:{color:isLight?'#18202e':'#dde1ef',size:11,family:'Plus Jakarta Sans'},textposition:'middle center'});
      [14,28,42].forEach(v => {
        const rv=v/MAX;
        radarTraces.push({x:[rv*ax+Math.cos(a+0.3)*0.04],y:[rv*ay+Math.sin(a+0.3)*0.04],
          mode:'text',text:[String(v)],hoverinfo:'skip',showlegend:false,
          textfont:{color:isLight?'#8890a8':'#4a5168',size:8,family:'DM Mono'},textposition:'middle center'});
      });
    });
    // Data polygon
    const dpts = axAngles.map((a,i)=>{const r=vals[i]/MAX; return [r*Math.cos(a),r*Math.sin(a)];});
    dpts.push(dpts[0]);
    radarTraces.push({x:dpts.map(p=>p[0]),y:dpts.map(p=>p[1]),mode:'lines',name:'DASS',showlegend:false,
      line:{color,width:2.5},fill:'toself',fillcolor:color.replace('#','').length===6?
        `rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)},0.15)`:color,
      hovertemplate:`D:${fmt(D,1)} A:${fmt(A,1)} S:${fmt(S,1)}<extra></extra>`});

    Plotly.newPlot('pd-dass-radar', radarTraces, {
      paper_bgcolor:'transparent', plot_bgcolor:'transparent',
      xaxis:{visible:false,range:[-1.45,1.45],fixedrange:true,scaleanchor:'y'},
      yaxis:{visible:false,range:[-1.45,1.45],fixedrange:true},
      margin:{l:0,r:0,t:0,b:0}, height:200, width:200,
    }, {responsive:false, displayModeBar:false});
  }

  // Activity plot
  const acts = [...new Set(rows.filter(r=>r.atividade!=='DASS21').map(r=>r.atividade))].sort();
  const isLight = document.documentElement.classList.contains('light');
  const plotBase = { paper_bgcolor:'transparent', plot_bgcolor:'transparent',
    font:{color:isLight?'#50597a':'#6b748f', family:'DM Mono', size:10},
    margin:{l:45,r:10,t:10,b:60}, autosize:true };
  const metrics = ['CV','MAE','mean_jitter'];
  const colors  = ['#3ddba8','#ffcc44','#7b8cff'];
  const pTraces = metrics.map((m,i) => ({
    type:'bar', name:m,
    x: acts,
    y: acts.map(a => mean(rows.filter(r=>r.atividade===a&&!isNaN(r[m])).map(r=>r[m]))),
    marker:{color:colors[i]},
  }));
  Plotly.newPlot('pd-activity-plot', pTraces, {
    ...plotBase, barmode:'group', height:260,
    xaxis:{gridcolor:isLight?'#d2d6e8':'#272d40', color:isLight?'#50597a':'#6b748f', tickangle:-30},
    yaxis:{gridcolor:isLight?'#d2d6e8':'#272d40', color:isLight?'#50597a':'#6b748f'},
    legend:{orientation:'h',y:1.1,bgcolor:'transparent'},
  }, {responsive:true, displayModeBar:false});

  // Detailed table
  const cols = ['atividade','take','bpm_ponto_participante','CV','MAE','mean_jitter'];
  const thead = document.getElementById('pd-table-head');
  const tbody = document.getElementById('pd-table-body');
  thead.innerHTML = cols.map(c=>`<th>${c}</th>`).join('');
  const actRows = rows.filter(r=>r.atividade!=='DASS21');
  tbody.innerHTML = actRows.map(r=>`<tr>${cols.map(c=>`<td class="${typeof r[c]==='number'?'num':''}">${r[c]===undefined||r[c]===null?'—':typeof r[c]==='number'?fmt(r[c],3):esc(String(r[c]))}</td>`).join('')}</tr>`).join('');

  overlay.classList.add('open');
}

document.getElementById('pd-close-btn').addEventListener('click', () => {
  document.getElementById('part-detail-overlay').classList.remove('open');
});
document.getElementById('part-detail-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});
