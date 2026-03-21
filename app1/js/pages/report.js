/* ═══════════════════════════════════════════
   T-MIRIM | MODULE: pages/report
   ═══════════════════════════════════════════ */

/* ╔═══════════════════════════════════════════════════════════
   ║ MODULE: pages/report
   ╚═══════════════════════════════════════════════════════════ */
// ═══════════════════════════════════════════════════════════
//  PAGE 7 — RELATÓRIO CIENTÍFICO
// ═══════════════════════════════════════════════════════════
let reportText = '';

document.getElementById('btn-generate-report').addEventListener('click', generateReport);
document.getElementById('btn-download-report').addEventListener('click', ()=>{
  if (!reportText) return;
  const fmt = document.getElementById('rpt-format').value;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([reportText], {type:'text/plain'}));
  a.download = `tmirim_relatorio.${fmt==='csv'?'csv':'txt'}`;
  a.click();
});
document.getElementById('btn-copy-report').addEventListener('click', ()=>{
  navigator.clipboard.writeText(reportText);
  notify('✓ Relatório copiado');
});

function generateReport() {
  if (!STATE.bigDF.length) { notify('Sem dados — processe na aba Agrupar primeiro', true); return; }
  // Ensure timing controls are populated (safe even if already done)
  try { populateTimingControls(); updateTimingNav(); } catch(e) {}
  const inc = id => { const el = document.getElementById(id); return el ? el.checked : false; };
  const lines = [];
  const sep = (t='') => lines.push(t ? `
${'═'.repeat(60)}
${t.toUpperCase()}
${'═'.repeat(60)}` : '─'.repeat(60));
  const parts = [...new Set(STATE.bigDF.map(r=>r.participante))];
  const mParts = parts.filter(p=>STATE.bigDF.find(r=>r.participante===p)?.musico);
  const nmParts = parts.filter(p=>!STATE.bigDF.find(r=>r.participante===p)?.musico);

  lines.push('RELATÓRIO T-MIRIM — Análise Rítmica em Musicoterapia');
  lines.push('Gerado em: ' + new Date().toLocaleString('pt-BR'));

  if (inc('rpt-sample')) {
    sep('Caracterização da Amostra');
    const idades = parts.map(p=>STATE.bigDF.find(r=>r.participante===p)?.Idade).filter(x=>!isNaN(x));
    lines.push(`N total: ${parts.length}  |  Músicos: ${mParts.length}  |  Não-Músicos: ${nmParts.length}`);
    lines.push(`Idade média: ${fmt(mean(idades),1)} anos (DP: ${fmt(std(idades),1)})`);
    lines.push(`Músicos: ${mParts.join(', ')}`);
    lines.push(`Não-Músicos: ${nmParts.join(', ')}`);
  }

  if (inc('rpt-rhythmic')) {
    sep('Desempenho Rítmico Geral');
    const acts = [...new Set(STATE.bigDF.map(r=>r.atividade))].filter(a=>a!=='DASS21').sort();
    acts.forEach(act=>{
      lines.push(`
${act}:`);
      ['CV','MAE','mean_jitter'].forEach(m=>{
        const mVals = STATE.bigDF.filter(r=>r.atividade===act&&r.musico&&!isNaN(r[m])).map(r=>r[m]);
        const nmVals = STATE.bigDF.filter(r=>r.atividade===act&&!r.musico&&!isNaN(r[m])).map(r=>r[m]);
        lines.push(`  ${m.padEnd(14)} Músicos: M=${fmt(mean(mVals),3)} DP=${fmt(std(mVals),3)} | Não-Músicos: M=${fmt(mean(nmVals),3)} DP=${fmt(std(nmVals),3)}`);
      });
    });
  }

  if (inc('rpt-groups')) {
    sep('Comparação entre Grupos (t-test aproximado)');
    const acts = [...new Set(STATE.bigDF.map(r=>r.atividade))].filter(a=>a!=='DASS21').sort();
    acts.forEach(act=>{
      const mCV = STATE.bigDF.filter(r=>r.atividade===act&&r.musico&&!isNaN(r.CV)).map(r=>r.CV);
      const nmCV = STATE.bigDF.filter(r=>r.atividade===act&&!r.musico&&!isNaN(r.CV)).map(r=>r.CV);
      if (mCV.length<2||nmCV.length<2) return;
      const diffMeans = Math.abs(mean(mCV)-mean(nmCV));
      const pooledSD = Math.sqrt((std(mCV)**2/mCV.length)+(std(nmCV)**2/nmCV.length));
      const t = pooledSD>0 ? diffMeans/pooledSD : 0;
      lines.push(`${act}: t≈${fmt(t,2)} | ΔMédias=${fmt(diffMeans,4)} | M(Mus)=${fmt(mean(mCV),3)} M(NM)=${fmt(mean(nmCV),3)}`);
    });
  }

  if (inc('rpt-dass')) {
    sep('DASS-21 — Saúde Mental');
    const classifyDASS=(v,s)=>{const t={D:[15,19,26,34],A:[8,10,15,20],S:[10,14,21,28]};const l=['Normal','Leve','Moderado','Severo','Ext.Severo'];const th=t[s]||t.D;for(let i=0;i<th.length;i++)if(v<th[i])return l[i];return l[4];};
    [[true,'Músicos'],[false,'Não-Músicos']].forEach(([isM,label])=>{
      const sub = parts.filter(p=>!!STATE.bigDF.find(r=>r.participante===p)?.musico===isM);
      if (!sub.length) return;
      lines.push(`
${label}:`);
      ['D','A','S'].forEach(sc=>{
        const vals = sub.map(p=>STATE.bigDF.find(r=>r.participante===p)?.[sc]).filter(x=>!isNaN(x));
        lines.push(`  ${sc}: M=${fmt(mean(vals),1)} — ${classifyDASS(mean(vals),sc)}`);
      });
    });
  }

  if (inc('rpt-corr')) {
    sep('Correlações (Pearson r)');
    if (STATE.corrData.length) {
      STATE.corrData.forEach(r=>{
        const sig = r.p<0.05?' ★ SIGNIFICATIVO':'';
        lines.push(`${r.Ativ} | ${r.Grupo} | CV×${r.Escala}: r=${fmt(r.r,3)} p=${fmt(r.p,3)} N=${r.N}${sig}`);
      });
    } else { lines.push('Execute a análise na aba ② para gerar correlações.'); }
  }

  if (inc('rpt-individual')) {
    sep('Perfil Individual');
    parts.forEach(p=>{
      const pRows = STATE.bigDF.filter(r=>r.participante===p);
      const first = pRows[0];
      lines.push(`
${p.toUpperCase()} (${first.musico?'Músico':'Não-Músico'}) — Idade: ${first.Idade||'N/I'} | Gênero: ${first.Genero||'N/I'}`);
      lines.push(`DASS: D=${first.D||'—'} A=${first.A||'—'} S=${first.S||'—'}`);
      const acts = [...new Set(pRows.map(r=>r.atividade))].filter(a=>a!=='DASS21');
      acts.forEach(act=>{
        const ar = pRows.filter(r=>r.atividade===act);
        lines.push(`  ${act.padEnd(12)} BPM=${fmt(mean(ar.map(r=>r.bpm_ponto_participante).filter(x=>!isNaN(x))),1)} CV=${fmt(mean(ar.map(r=>r.CV).filter(x=>!isNaN(x))),3)} MAE=${fmt(mean(ar.map(r=>r.MAE).filter(x=>!isNaN(x))),1)} Jitter=${fmt(mean(ar.map(r=>r.mean_jitter).filter(x=>!isNaN(x))),1)}`);
      });
    });
  }

  reportText = lines.join('\n');
  document.getElementById('report-preview').textContent = reportText;
  document.getElementById('btn-download-report').disabled = false;
  document.getElementById('btn-copy-report').disabled = false;
  notify('✓ Relatório gerado');
}
