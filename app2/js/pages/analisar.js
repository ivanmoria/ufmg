/* ═══════════════════════════════════════════
   T-MIRIM | MODULE: pages/analisar
   ═══════════════════════════════════════════ */

/* ╔═══════════════════════════════════════════════════════════
   ║ MODULE: pages/analisar
   ╚═══════════════════════════════════════════════════════════ */
// ═══════════════════════════════════════════════════════════
//  PAGE 3: ANALISAR
// ═══════════════════════════════════════════════════════════
function updateAnalysis() {
  if (!STATE.bigDF.length) return;

  // Sample characterization
  const parts = [...new Set(STATE.bigDF.map(r=>r.participante))];
  const musicos = parts.filter(p => STATE.bigDF.find(r=>r.participante===p)?.musico);
  const nMusicos = musicos.length, nNaoMusicos = parts.length-nMusicos;

  const demoMap = {};
  parts.forEach(p => {
    const rows = STATE.bigDF.filter(r=>r.participante===p);
    const first = rows[0];
    demoMap[p] = {
      participante: p,
      musico: first.musico,
      Idade: first.Idade,
      Genero: first.Genero,
      D: first.D, A: first.A, S: first.S
    };
  });
  STATE.demoData = demoMap;

  // Stats cards
  const idades = Object.values(demoMap).map(d=>d.Idade).filter(x=>!isNaN(x));
  renderStatCards({n:parts.length, nMusicos, nNaoMusicos, idadeMedia:mean(idades)});

  // Comparative analysis
  const activities = [...new Set(STATE.bigDF.map(r=>r.atividade))].filter(a=>a!=='DASS21');
  STATE.rankData = [];
  STATE.corrData = [];
  let comp = '=== CARACTERIZAÇÃO DA AMOSTRA (N=' + parts.length + ') ===\n';
  comp += `Músicos: ${nMusicos} | Não-Músicos: ${nNaoMusicos}\n`;
  comp += `Idade Média: ${fmt(mean(idades),1)} anos\n`;

  // DASS médias
  comp += '\n--- MÉDIAS DASS-21 ---\n';
  for (const [grpLabel, isM] of [['Músicos',true],['Não-Músicos',false]]) {
    const sub = Object.values(demoMap).filter(d=>d.musico===isM);
    if (sub.length) {
      comp += `${grpLabel}: D=${fmt(mean(sub.map(d=>d.D)),1)} | A=${fmt(mean(sub.map(d=>d.A)),1)} | S=${fmt(mean(sub.map(d=>d.S)),1)}\n`;
    }
  }
  comp += '\n' + '='.repeat(60) + '\n=== DESEMPENHO RÍTMICO POR ATIVIDADE ===\n';

  activities.forEach(act => {
    const rows = STATE.bigDF.filter(r=>r.atividade===act);
    const mRows = rows.filter(r=>r.musico===true);
    const nmRows = rows.filter(r=>r.musico===false);
    const cvM = mean(mRows.map(r=>r.CV).filter(x=>!isNaN(x)));
    const cvNM = mean(nmRows.map(r=>r.CV).filter(x=>!isNaN(x)));
    const nM = new Set(mRows.map(r=>r.participante)).size;
    const nNM = new Set(nmRows.map(r=>r.participante)).size;
    comp += `${act.padEnd(12)} | CV: M=${fmt(cvM,3)}, NM=${fmt(cvNM,3)} | N: M=${nM}, NM=${nNM}\n`;

    for (const p of [...new Set(rows.map(r=>r.participante))]) {
      const pr = rows.filter(r=>r.participante===p);
      STATE.rankData.push({
        Atividade: act, Participante: p,
        CV: mean(pr.map(r=>r.CV).filter(x=>!isNaN(x))),
        MAE: mean(pr.map(r=>r.MAE).filter(x=>!isNaN(x))),
        Musico: pr[0].musico,
        Idade: pr[0].Idade, Genero: pr[0].Genero,
        D: pr[0].D, A: pr[0].A, S: pr[0].S
      });
    }
  });

  // TOP 5 per group
  for (const [grpLabel, isM] of [['MÚSICOS',true],['NÃO-MÚSICOS',false]]) {
    comp += `\n${'='.repeat(20)} TOP 5 ${grpLabel} (Menor CV) ${'='.repeat(20)}\n`;
    const sub = STATE.rankData.filter(r=>r.Musico===isM).sort((a,b)=>a.CV-b.CV);
    const uniq = [];
    const seen = new Set();
    for (const r of sub) { if (!seen.has(r.Participante)){seen.add(r.Participante);uniq.push(r);} }
    uniq.slice(0,5).forEach((r,i)=>{ comp+=`  ${i+1}º ${r.Participante.padEnd(12)} | CV: ${fmt(r.CV,3)} | S: ${fmt(r.S,1)}\n`; });
  }

  // Pearson correlations
  comp += `\n${'='.repeat(15)} CORRELAÇÃO r (PEARSON) ${'='.repeat(15)}\n`;
  activities.forEach(act => {
    comp += `\n> ${act.toUpperCase()}:\n`;
    for (const [grpLabel, isM] of [['Músicos',true],['Não-Músicos',false]]) {
      const sub = STATE.rankData.filter(r=>r.Atividade===act&&r.Musico===isM);
      if (sub.length <= 3) { comp += `  ${grpLabel.padEnd(12)} | N insuficiente\n`; continue; }
      for (const escala of ['D','A','S']) {
        const pairs = sub.filter(r=>!isNaN(r.CV)&&!isNaN(r[escala]));
        if (pairs.length < 3) continue;
        const {r,p} = pearsonR(pairs.map(x=>x.CV), pairs.map(x=>x[escala]));
        const sig = p<0.05?' (SIG!!)':'';
        comp += `  ${grpLabel.padEnd(12)} CV × ${escala}: r=${fmt(r,2).padStart(5)} (p=${fmt(p,3)})${sig}\n`;
        STATE.corrData.push({Ativ:act, Grupo:grpLabel, Escala:escala, r, p, N:pairs.length});
      }
    }
  });

  // Individual analysis
  let indiv = '';
  for (const p of parts) {
    const pr = STATE.bigDF.filter(r=>r.participante===p);
    const first = pr[0];
    indiv += `=== ${p.toUpperCase()} (${first.musico?'Músico':'Não-Músico'}) ===\n`;
    indiv += `Idade: ${first.Idade||'-'} | Gênero: ${first.Genero||'-'} | DASS: D=${first.D||'-'} A=${first.A||'-'} S=${first.S||'-'}\n`;
    indiv += '-'.repeat(60) + '\n';
    indiv += `${'ATIVIDADE'.padEnd(15)} | ${'BPM'.padStart(8)} | ${'CV'.padStart(8)} | ${'MAE'.padStart(8)} | ${'Jitter'.padStart(8)}\n`;
    const acts = [...new Set(pr.map(r=>r.atividade))];
    acts.forEach(act => {
      const ar = pr.filter(r=>r.atividade===act);
      indiv += `${act.padEnd(15)} | ${fmt(mean(ar.map(r=>r.bpm_ponto_participante).filter(x=>!isNaN(x))),1).padStart(8)} | ${fmt(mean(ar.map(r=>r.CV).filter(x=>!isNaN(x))),3).padStart(8)} | ${fmt(mean(ar.map(r=>r.MAE).filter(x=>!isNaN(x))),1).padStart(8)} | ${fmt(mean(ar.map(r=>r.mean_jitter).filter(x=>!isNaN(x))),1).padStart(8)}\n`;
    });
    indiv += '\n';
  }

  document.getElementById('analysis-individual').textContent = indiv;
  document.getElementById('analysis-comparative').textContent = comp;

  // Correlations table
  const ctbody = document.getElementById('corr-tbody');
  ctbody.innerHTML = STATE.corrData.map(r=>`<tr>
    <td>${esc(r.Ativ)}</td><td>${esc(r.Grupo)}</td>
    <td>CV × ${r.Escala}</td>
    <td class="${r.r>0?'corr-pos':'corr-neg'}">${fmt(r.r,3)}</td>
    <td>${fmt(r.p,3)}</td><td>${r.N}</td>
    <td>${r.p<0.05?'<span class="corr-sig">★ p&lt;.05</span>':'—'}</td>
  </tr>`).join('');

  // Switch to analysis page
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelector('[data-page="analyze"]').classList.add('active');
  document.getElementById('page-analyze').classList.add('active');
}

function renderStatCards({n, nMusicos, nNaoMusicos, idadeMedia}) {
  const row = document.getElementById('stat-cards-row');
  const stats = [
    {val:n, lbl:'Participantes'},
    {val:nMusicos, lbl:'Músicos'},
    {val:nNaoMusicos, lbl:'Não-Músicos'},
    {val:isNaN(idadeMedia)?'—':fmt(idadeMedia,1), lbl:'Idade Média'},
    {val:STATE.bigDF.length, lbl:'Registros'},
  ];
  row.innerHTML = stats.map(s=>`<div class="stat-card"><div class="val">${s.val}</div><div class="lbl">${s.lbl}</div></div>`).join('');
}

// Analysis sub-tabs
document.querySelectorAll('[data-abt]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-abt]').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
    ['individual','comparative','correlations'].forEach(id=>{
      const el = document.getElementById('analysis-'+id);
      if (el) el.style.display = id===btn.dataset.abt ? '' : 'none';
    });
  });
});

document.getElementById('btn-export-analysis').addEventListener('click', () => {
  const active = document.querySelector('[data-abt].on')?.dataset?.abt;
  const el = document.getElementById('analysis-'+active);
  if (el) { navigator.clipboard.writeText(el.textContent); notify('✓ Copiado'); }
});
document.getElementById('btn-export-analysis-xl').addEventListener('click', () => exportGroupedExcel());

