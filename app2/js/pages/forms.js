/* ═══════════════════════════════════════════════════════════
   T-MIRIM | MODULE: pages/forms
   TCLE · Anamnese & Histórico Musical · DASS-21
   ═══════════════════════════════════════════════════════════ */

/* ╔═══════════════════════════════════════════════════════════
   ║ MODULE: pages/forms
   ╚═══════════════════════════════════════════════════════════ */

// ── Sub-nav switch ────────────────────────────────────────
function switchForm(id) {
  document.querySelectorAll('[data-form]').forEach(b =>
    b.classList.toggle('on', b.dataset.form === id));
  document.querySelectorAll('.form-panel').forEach(p =>
    p.classList.toggle('active', p.id === 'form-' + id));
  if (id === 'tcle') {
    // Reset state so canvas always reinits fresh
    _sigCvs = null; _sigCtx = null;
    requestAnimationFrame(() => requestAnimationFrame(tcleInitCanvas));
  }
}

function populateForms() {
  const n   = localStorage.getItem('participantName') || '';
  const age = localStorage.getItem('participantAge')  || '';
  const dt  = localStorage.getItem('testDate') || new Date().toISOString().slice(0,10);
  const set = (id, v) => { const el=document.getElementById(id); if(el&&!el.value) el.value=v; };
  set('anm-nome', n); set('dass-nome', n); set('dass-idade', age);
  set('dass-data', dt); set('tcle-nome', n);
  // Init canvas — TCLE is the default active panel
  _sigCvs = null; _sigCtx = null;
  requestAnimationFrame(() => requestAnimationFrame(tcleInitCanvas));
}

// ── Collapsible form sections ─────────────────────────────
function fsecToggle(id) {
  const sec = document.getElementById(id);
  if (!sec) return;
  const open = sec.classList.toggle('open');
  const body = sec.querySelector('.fsec-body');
  if (body) body.style.display = open ? 'flex' : 'none';
}

// ── Conditional fields ────────────────────────────────────
function fcond(id, show) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('show', show);
}

// ══════════════════════════════════════════════════════════
// ANAMNESE
// ══════════════════════════════════════════════════════════
function anmProgress() {
  const nome = document.getElementById('anm-nome')?.value?.trim();
  const nasc = document.getElementById('anm-nasc')?.value;
  const gen  = document.querySelector('input[name="anm-genero"]:checked');
  const n    = [!!nome,!!nasc,!!gen].filter(Boolean).length;
  const el   = document.getElementById('anm-pbar');
  if (el) el.style.width = Math.round(n/3*100) + '%';
}

function anmCalcAge(dob) {
  if (!dob) return 'NaN';
  const t=new Date(), b=new Date(dob);
  let a=t.getFullYear()-b.getFullYear();
  const m=t.getMonth()-b.getMonth();
  if (m<0||(m===0&&t.getDate()<b.getDate())) a--;
  return a;
}

function anmGetGenero() {
  const sel=document.querySelector('input[name="anm-genero"]:checked');
  if (!sel) return 'NaN';
  if (sel.value==='Outro') return document.querySelector('[name="anm-genero-outro"]')?.value?.trim()||'Outro';
  return sel.value;
}

function anmCollect() {
  const data={};
  document.querySelectorAll('#form-anamnese [name]').forEach(el=>{
    if (el.type==='radio'){if(el.checked)data[el.name]=el.value;else if(!(el.name in data))data[el.name]='NaN';}
    else data[el.name]=el.value?.trim()||'NaN';
  });
  data['anm-genero']=anmGetGenero();
  data['idade']=anmCalcAge(data['anm-nasc']);
  data['data_teste']=new Date().toISOString().slice(0,10);
  return data;
}

function anmSave() {
  const nome=document.getElementById('anm-nome')?.value?.trim();
  if (!nome){notify('⚠ Informe o nome do participante',true);return;}
  const data=anmCollect();
  localStorage.setItem('participantName',nome);
  localStorage.setItem('participantAge',data['idade']);
  localStorage.setItem('participantGender',data['anm-genero']||'');
  const keys=Object.keys(data);
  const csv=keys.join(',')+'\n'+keys.map(k=>`"${String(data[k]).replace(/"/g,'""')}"`).join(',');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`${nome}_anamnese.csv`;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
  notify('✓ Anamnese exportada');
}

function anmGoToDASS() {
  const nome=document.getElementById('anm-nome')?.value?.trim();
  if (!nome){notify('⚠ Informe o nome antes de continuar',true);return;}
  localStorage.setItem('participantName',nome);
  const age=anmCalcAge(document.getElementById('anm-nasc')?.value);
  if (!isNaN(parseInt(age))){const d=document.getElementById('dass-idade');if(d)d.value=age;}
  const gen=document.querySelector('input[name="anm-genero"]:checked')?.value;
  if(gen)document.querySelectorAll('input[name="dass-genero"]').forEach(r=>{r.checked=r.value===gen;});
  const d=document.getElementById('dass-nome');if(d)d.value=nome;
  switchForm('dass21');
}

function anmReset() {
  if(!confirm('Limpar todos os campos?'))return;
  document.querySelectorAll('#form-anamnese input,#form-anamnese textarea').forEach(el=>{
    if(el.type==='radio'||el.type==='checkbox')el.checked=false;else el.value='';
  });
  document.querySelectorAll('#form-anamnese .fcond').forEach(c=>c.classList.remove('show'));
  anmProgress();
}

// ══════════════════════════════════════════════════════════
// DASS-21
// ══════════════════════════════════════════════════════════
const DASS_Q = {
  masculino:[
    "Achei difícil me acalmar.",
    "Senti minha boca seca.",
    "Não consegui vivenciar nenhum sentimento positivo.",
    "Tive dificuldade em respirar em alguns momentos (respiração ofegante ou falta de ar — sem esforço físico).",
    "Achei difícil ter iniciativa para fazer as coisas.",
    "Tive a tendência de reagir de forma exagerada às situações.",
    "Senti tremores (por exemplo — nas mãos).",
    "Senti que estava sempre nervoso.",
    "Preocupei-me com situações em que eu pudesse entrar em pânico e parecesse ridículo.",
    "Senti que não tinha nada a desejar.",
    "Senti-me agitado.",
    "Achei difícil relaxar.",
    "Senti-me depressivo ou sem ânimo.",
    "Fui intolerante com as coisas que me impediam de continuar o que eu estava fazendo.",
    "Senti que ia entrar em pânico.",
    "Não consegui me entusiasmar com nada.",
    "Senti que não tinha valor como pessoa.",
    "Senti que estava um pouco emotivo ou sensível demais.",
    "Sabia que meu coração estava alterado mesmo sem esforço físico (aumento da frequência cardíaca).",
    "Senti medo sem motivo.",
    "Senti que a vida não tinha sentido."
  ],
  feminino:[
    "Achei difícil me acalmar.",
    "Senti minha boca seca.",
    "Não consegui vivenciar nenhum sentimento positivo.",
    "Tive dificuldade em respirar em alguns momentos (respiração ofegante ou falta de ar — sem esforço físico).",
    "Achei difícil ter iniciativa para fazer as coisas.",
    "Tive a tendência de reagir de forma exagerada às situações.",
    "Senti tremores (por exemplo — nas mãos).",
    "Senti que estava sempre nervosa.",
    "Preocupei-me com situações em que eu pudesse entrar em pânico e parecesse ridícula.",
    "Senti que não tinha nada a desejar.",
    "Senti-me agitada.",
    "Achei difícil relaxar.",
    "Senti-me depressiva ou sem ânimo.",
    "Fui intolerante com as coisas que me impediam de continuar o que eu estava fazendo.",
    "Senti que ia entrar em pânico.",
    "Não consegui me entusiasmar com nada.",
    "Senti que não tinha valor como pessoa.",
    "Senti que estava um pouco emotiva ou sensível demais.",
    "Sabia que meu coração estava alterado mesmo sem esforço físico (aumento da frequência cardíaca).",
    "Senti medo sem motivo.",
    "Senti que a vida não tinha sentido."
  ]
};

const _B='https://ivanmoria.github.io/media/audio/audiosdass21/';
const DASS_AUDIO={
  homem_masculino:Array.from({length:21},(_,i)=>`${_B}danielmasc/danm${i+1}.wav`),
  homem_feminino:[
    ...[1,2,3,4,5,6,7].map(i=>`${_B}danielmasc/danm${i}.wav`),
    `${_B}danielfem/danielfem1.wav`,`${_B}danielfem/danielfem2.wav`,
    `${_B}danielmasc/danm10.wav`,`${_B}danielfem/danielfem3.wav`,
    `${_B}danielmasc/danm12.wav`,`${_B}danielfem/danielfem4.wav`,
    `${_B}danielmasc/danm14.wav`,`${_B}danielmasc/danm15.wav`,
    `${_B}danielmasc/danm16.wav`,`${_B}danielmasc/danm17.wav`,
    `${_B}danielfem/danielfem5.wav`,
    `${_B}danielmasc/danm19.wav`,`${_B}danielmasc/danm20.wav`,`${_B}danielmasc/danm21.wav`,
  ],
  mulher_masculino:[
    ...[1,2,3,4,5,6,7].map(i=>`${_B}lilyfem/lilyfem${i}.wav`),
    `${_B}lilymasc/lilymasc8.wav`,`${_B}lilymasc/lilymasc9.wav`,
    `${_B}lilyfem/lilyfem10.wav`,`${_B}lilymasc/lilymasc11.wav`,
    `${_B}lilyfem/lilyfem12.wav`,`${_B}lilymasc/lilymasc13.wav`,
    `${_B}lilyfem/lilyfem14.wav`,`${_B}lilyfem/lilyfem15.wav`,
    `${_B}lilyfem/lilyfem16.wav`,`${_B}lilyfem/lilyfem17.wav`,
    `${_B}lilymasc/lilymasc18.wav`,
    `${_B}lilyfem/lilyfem19.wav`,`${_B}lilyfem/lilyfem20.wav`,`${_B}lilyfem/lilyfem21.wav`,
  ],
  mulher_feminino:Array.from({length:21},(_,i)=>`${_B}lilyfem/lilyfem${i+1}.wav`),
};
const DASS_IDX={D:[2,4,9,12,15,16,20],A:[1,3,6,8,14,18,19],E:[0,5,7,10,11,13,17]};
let _dQ=0; const _dAns=new Array(21).fill(undefined);
let _dName='',_dAge='',_dGender='',_dDate='';

function dassToggleAudio(){
  const on=document.getElementById('dass-audio-chk')?.checked;
  document.getElementById('dass-audio-opts').style.display=on?'block':'none';
  document.getElementById('dass-audio-track').style.background=on?'var(--accent)':'';
  document.getElementById('dass-audio-thumb').style.left=on?'19px':'3px';
}

function dassScreen(id){
  ['dass-screen-setup','dass-screen-questions','dass-screen-results'].forEach(s=>{
    const el=document.getElementById(s);
    if(el)el.style.display=s==='dass-screen-'+id?'block':'none';
  });
}

function dassStart(){
  _dName=document.getElementById('dass-nome')?.value?.trim();
  _dAge=document.getElementById('dass-idade')?.value?.trim();
  _dGender=document.querySelector('input[name="dass-genero"]:checked')?.value||'';
  _dDate=document.getElementById('dass-data')?.value||new Date().toISOString().slice(0,10);
  if(!_dName){notify('⚠ Informe o nome',true);return;}
  if(!_dAge){notify('⚠ Informe a idade',true);return;}
  if(!_dGender){notify('⚠ Selecione o gênero',true);return;}
  _dQ=0;_dAns.fill(undefined);
  dassScreen('questions');dassShowQ();
}

function dassShowQ(){
  const qg=document.querySelector('input[name="dass-qgender"]:checked')?.value||'masculino';
  const el=document.getElementById('dass-qtext');
  const num=document.getElementById('dass-qnum');
  const prev=document.getElementById('dass-btn-prev');
  const next=document.getElementById('dass-btn-next');
  const pbar=document.getElementById('dass-pbar');
  if(el)el.textContent=`${_dQ+1}. ${DASS_Q[qg][_dQ]}`;
  if(num)num.textContent=`Pergunta ${_dQ+1} de 21`;
  if(prev)prev.style.visibility=_dQ>0?'visible':'hidden';
  if(next)next.textContent=_dQ<20?'Próxima →':'Concluir ✓';
  if(pbar)pbar.style.width=Math.round((_dQ+1)/21*100)+'%';
  [0,1,2,3].forEach(i=>document.getElementById('dass-a'+i)?.classList.toggle('sel',_dAns[_dQ]===i));
  dassPlayAudio();
}

function dassPlayAudio(){
  const on=document.getElementById('dass-audio-chk')?.checked;
  const st=document.getElementById('dass-audio-status');
  if(!on){if(st)st.textContent='';return;}
  const voice=document.querySelector('input[name="dass-voice"]:checked')?.value||'homem';
  const gender=document.querySelector('input[name="dass-qgender"]:checked')?.value||'masculino';
  const src=DASS_AUDIO[`${voice}_${gender}`]?.[_dQ];
  if(!src)return;
  const player=document.getElementById('dass-audio');
  if(!player)return;
  player.src=src;
  if(st)st.textContent='🔊 Reproduzindo…';
  player.play().catch(()=>{if(st)st.textContent='⚠ Áudio indisponível';});
  player.onended=()=>{if(st)st.textContent='';};
}

function dassSelect(val){
  _dAns[_dQ]=val;
  [0,1,2,3].forEach(i=>document.getElementById('dass-a'+i)?.classList.toggle('sel',i===val));
}

function dassNext(){
  if(_dAns[_dQ]===undefined){notify('Selecione uma resposta antes de continuar',true);dassPlayAudio();return;}
  if(_dQ<20){_dQ++;dassShowQ();}else dassFinish();
}

function dassPrev(){if(_dQ>0){_dQ--;dassShowQ();}}

function dassClassify(s,t){
  const lv=['Normal','Leve','Moderado','Severo','Extremamente Severo'];
  const cl=['var(--accent)','var(--accent3)','#ff9800','var(--accent2)','var(--accent2)'];
  let i=4;
  if(t==='D'){if(s<10)i=0;else if(s<=13)i=1;else if(s<=20)i=2;else if(s<=27)i=3;}
  else if(t==='A'){if(s<8)i=0;else if(s<=9)i=1;else if(s<=14)i=2;else if(s<=19)i=3;}
  else{if(s<15)i=0;else if(s<=18)i=1;else if(s<=25)i=2;else if(s<=33)i=3;}
  return[lv[i],cl[i]];
}

function dassFinish(){
  const d=DASS_IDX.D.reduce((s,i)=>s+(_dAns[i]||0),0)*2;
  const a=DASS_IDX.A.reduce((s,i)=>s+(_dAns[i]||0),0)*2;
  const e=DASS_IDX.E.reduce((s,i)=>s+(_dAns[i]||0),0)*2;
  document.getElementById('dass-res-id').textContent=`${_dName} · ${_dAge} anos · ${_dGender} · ${_dDate}`;
  const set=(px,sc,tp)=>{
    document.getElementById(`dass-${px}val`).textContent=sc;
    const[lb,cl]=dassClassify(sc,tp);
    const el=document.getElementById(`dass-${px}cls`);
    if(el){el.textContent=lb;el.style.color=cl;el.style.fontWeight='700';}
  };
  set('d',d,'D');set('a',a,'A');set('e',e,'E');
  const p=document.getElementById('dass-pbar');if(p)p.style.width='100%';
  dassScreen('results');notify('✓ DASS-21 concluído');
}

function dassExportCSV(){
  const d=DASS_IDX.D.reduce((s,i)=>s+(_dAns[i]||0),0)*2;
  const a=DASS_IDX.A.reduce((s,i)=>s+(_dAns[i]||0),0)*2;
  const e=DASS_IDX.E.reduce((s,i)=>s+(_dAns[i]||0),0)*2;
  const[dL]=dassClassify(d,'D'),[aL]=dassClassify(a,'A'),[eL]=dassClassify(e,'E');
  const rows=[
    ['Pergunta','Resposta'],
    ..._dAns.map((ans,i)=>[i+1,['Nunca','Às vezes','Frequentemente','Quase sempre'][ans]??'Sem resposta']),
    [],['Nome','Gênero','Idade','Data'],[_dName,_dGender,_dAge,_dDate],
    [],['Escala','Score','Classificação'],['Depressão',d,dL],['Ansiedade',a,aL],['Estresse',e,eL],
  ];
  const csv=rows.map(r=>r.join(' ')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download=`DASS21_${_dDate}_${_dName}.csv`;
  document.body.appendChild(link);link.click();document.body.removeChild(link);
  URL.revokeObjectURL(url);notify('✓ CSV exportado');
}

function dassReset(){
  _dAns.fill(undefined);_dQ=0;
  const p=document.getElementById('dass-pbar');if(p)p.style.width='0%';
  dassScreen('setup');
}

document.addEventListener('keydown',e=>{
  const active=document.querySelector('.tab-btn.active')?.dataset?.page;
  if(active!=='forms')return;
  const qs=document.getElementById('dass-screen-questions');
  if(!qs||qs.style.display==='none')return;
  if(e.key>='1'&&e.key<='4')dassSelect(parseInt(e.key)-1);
  if(e.key===' '){e.preventDefault();dassNext();}
  if(e.key==='ArrowRight')dassNext();
  if(e.key==='ArrowLeft')dassPrev();
});

// ══════════════════════════════════════════════════════════
// TCLE — Assinatura Digital
// ══════════════════════════════════════════════════════════
let _sigCvs=null,_sigCtx=null,_sigDrawing=false,_sigEmpty=true;

function tcleInitCanvas(){
  const wrap = document.getElementById('tcle-sig-canvas-wrap');
  if (!wrap) return;

  // Style the wrapper
  wrap.style.cssText='position:relative;border:1.5px solid #aaa;border-radius:8px;background:#fff;overflow:hidden;cursor:crosshair;height:130px;touch-action:none;-webkit-user-select:none;user-select:none;';
  _sigDrawing=false; _sigEmpty=true; _sigCvs=null; _sigCtx=null;
  wrap.innerHTML='';

  const ph=document.createElement('div');
  ph.id='tcle-sig-ph';
  ph.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:.85rem;pointer-events:none;z-index:0;';
  ph.textContent='✍ Assine aqui';
  wrap.appendChild(ph);

  const cvs=document.createElement('canvas');
  cvs.style.cssText='position:absolute;inset:0;z-index:1;touch-action:none;display:block;';
  wrap.appendChild(cvs);
  _sigCvs=cvs;

  function init() {
    const W=wrap.offsetWidth||400, H=130, dpr=window.devicePixelRatio||1;
    cvs.width=W*dpr; cvs.height=H*dpr;
    cvs.style.width=W+'px'; cvs.style.height=H+'px';
    _sigCtx=cvs.getContext('2d');
    _sigCtx.scale(dpr,dpr);
    _sigCtx.strokeStyle='#111'; _sigCtx.lineWidth=2.2;
    _sigCtx.lineCap='round'; _sigCtx.lineJoin='round';
  }
  requestAnimationFrame(init);

  function xy(e){
    const r=cvs.getBoundingClientRect();
    const s=e.changedTouches?e.changedTouches[0]:e.touches?e.touches[0]:e;
    return{x:s.clientX-r.left,y:s.clientY-r.top};
  }
  function down(e){
    e.preventDefault();e.stopPropagation();
    if(!_sigCtx)init();
    _sigDrawing=true;_sigEmpty=false;
    ph.style.display='none';
    const{x,y}=xy(e);_sigCtx.beginPath();_sigCtx.moveTo(x,y);
  }
  function move(e){
    if(!_sigDrawing||!_sigCtx)return;
    e.preventDefault();e.stopPropagation();
    const{x,y}=xy(e);_sigCtx.lineTo(x,y);_sigCtx.stroke();
    _sigCtx.beginPath();_sigCtx.moveTo(x,y);
  }
  function up(e){
    if(!_sigDrawing)return;
    e.preventDefault();_sigDrawing=false;
    if(_sigCtx)_sigCtx.beginPath();
  }
  cvs.addEventListener('mousedown',down,false);
  cvs.addEventListener('mousemove',move,false);
  cvs.addEventListener('mouseup',up,false);
  cvs.addEventListener('mouseleave',up,false);
  cvs.addEventListener('touchstart',down,{passive:false});
  cvs.addEventListener('touchmove',move,{passive:false});
  cvs.addEventListener('touchend',up,{passive:false});
  cvs.addEventListener('touchcancel',up,{passive:false});
}

function tcleClearSig(){
  if(!_sigCtx||!_sigCvs)return;
  _sigCtx.clearRect(0,0,_sigCvs.width,_sigCvs.height);
  _sigEmpty=true;
  const ph=document.getElementById('tcle-sig-ph');
  if(ph)ph.style.display='flex';
}

// ── Fetch image as base64 ─────────────────────────────────
async function fetchBase64(url) {
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    return await new Promise(r => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result);
      fr.readAsDataURL(blob);
    });
  } catch { return null; }
}

async function tcleSavePDF() {
  const nome = document.getElementById('tcle-nome')?.value?.trim();
  if (!nome)     { notify('⚠ Informe seu nome antes de salvar', true); return; }
  if (_sigEmpty) { notify('⚠ Assine o documento antes de salvar', true); return; }

  // Load jsPDF only (no html2canvas needed with the new approach)
  const loadScript = src => new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  } catch { notify('⚠ Erro ao carregar bibliotecas PDF', true); return; }

  notify('Gerando PDF…');

  // Timestamp
  const agora = new Date();
  const dt = `${agora.getDate()}/${agora.getMonth()+1}/${agora.getFullYear()} às ${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`;

  // Get participant signature as base64
  const partSigB64 = _sigEmpty ? '' : _sigCvs.toDataURL('image/png');

  // Fetch researcher signature as base64 (only now, not in HTML)
  const resSigB64 = await fetchBase64('https://ivanmoria.github.io/assinatura_pesquisador.png');

  // Build a clean standalone A4 HTML — zero app CSS, pure document
  const tcleHTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111;
         background: #fff; padding: 2cm; width: 21cm; }
  h1 { text-align: center; font-size: 16px; font-weight: bold;
       margin-bottom: 20px; text-transform: uppercase; }
  p { text-align: justify; line-height: 1.7; margin-bottom: 10px; }
  strong { font-weight: bold; }
  .sigs { display: flex; justify-content: space-between; gap: 40px;
          margin-top: 32px; align-items: flex-start; }
  .sig-col { flex: 1; }
  .sig-label { font-size: 11px; font-weight: bold; text-transform: uppercase;
               letter-spacing: 1px; color: #555; margin-bottom: 8px; }
  .sig-name { font-size: 13px; font-weight: bold; margin-bottom: 8px; }
  .sig-line { border-bottom: 1px solid #333; margin-bottom: 6px;
              padding-bottom: 4px; font-size: 13px; }
  .sig-img { max-width: 160px; height: auto; display: block; margin-top: 10px; }
  .sig-canvas-img { width: 100%; max-width: 220px; height: 80px;
                    object-fit: contain; border: 1px solid #ccc; display: block; }
  .timestamp { text-align: center; margin-top: 18px; font-size: 11px;
               color: #555; border-top: 1px solid #ddd; padding-top: 10px; }
  .footer { font-size: 11px; color: #666; margin-top: 20px; line-height: 1.6;
            border-top: 1px solid #ddd; padding-top: 10px; text-align: justify; }
</style>
</head>
<body>
<h1>Termo de Consentimento Livre e Esclarecido</h1>

<p>Você está sendo convidado a participar da pesquisa realizada na Universidade Federal de Minas Gerais - UFMG, no Programa de Pós-Graduação em Música intitulada <strong>"Tecnologias de Extração e Processamento de Informações Musicais em Musicoterapia: Microanálises de Vestígios Musicais e possíveis interfaces com a Cognição Social"</strong>. Sua participação é importante e voluntária e contribuirá com informações que serão úteis para indicar melhores tratamentos musicoterapêuticos e para o entendimento de como os recursos tecnológicos podem ser utilizados para desenvolver pesquisas e intervenções musicoterapêuticas.</p>

<p>Os objetivos deste estudo são: <strong>1)</strong> Verificar a viabilidade de utilização de ferramentas tecnológicas para a coleta e análise de dados da produção musical na avaliação em Musicoterapia; <strong>2)</strong> Desenvolver uma revisão de literatura sobre coleta e análise de improvisações musicais e suas interfaces com a cognição social; <strong>3)</strong> Desenvolver uma ferramenta tecnológica para a coleta e análise de dados da produção musical que auxiliem no processo de interpretação e tomada de decisões na prática clínica musicoterapêutica; <strong>4)</strong> Desenvolver estudos iniciais de validação de face, conteúdo e construto do uso de recursos tecnológicos, relacionando habilidades e competências musicais e cognição social; <strong>5)</strong> Cartografar a utilização de ferramentas tecnológicas por musicoterapeutas e pesquisadores no Brasil e na América Latina.</p>

<p>Você será convidado a responder um questionário online e a uma escala de níveis de ansiedade, estresse e depressão. Depois você participará presencialmente de algumas tarefas musicais envolvendo sincronização e percepção do tempo musical. As tarefas musicais serão realizadas em uma única sessão com duração aproximada de trinta minutos em um Laboratório na UFMG. Você realizará as tarefas uma vez, não sendo necessário conhecimento prévio sobre o uso dos equipamentos musicais utilizados.</p>

<p>Esses procedimentos oferecem risco mínimo à saúde, tais como eventual cansaço ou desconforto em alguma pergunta dos questionários ou participação das tarefas musicais. Fica assegurado o seu direito de desistir de participar da pesquisa a qualquer momento, sem nenhum prejuízo a sua pessoa. Esta pesquisa não lhe trará benefícios diretos. Não há despesas pessoais para o participante como exames ou consultas, assim como não há nenhum tipo de compensação financeira pela sua participação na pesquisa. É garantido o direito a indenização por eventuais danos decorrentes da pesquisa, pelo pesquisador.</p>

<p>Fica assegurado o seu direito à confidencialidade das informações, não sendo divulgada nenhuma identificação pessoal dos participantes da pesquisa. Os dados e o material das avaliações serão utilizados somente para fins desta pesquisa e de apresentações em congressos e palestras, guardando a identidade dos sujeitos avaliados. A condução desta pesquisa observa o que está disposto na Resolução CNS/MS 510/16 e na Resolução CNS/MS 466/2012 do Conselho Nacional de Saúde/Ministério da Saúde. Os dados ficarão armazenados pelo período de 10 anos no Laboratório de Musicoterapia da UFMG, sem qualquer identificação que conecte os seus dados a você.</p>

<p>Acredito ter sido suficientemente informado sobre a descrição da pesquisa. Eu discuti com <strong>Ivan Moriá Borges Rodrigues</strong> sobre a minha decisão em participar nesse estudo. Ficaram claros para mim quais são os propósitos do estudo, os procedimentos a serem realizados, as garantias de confidencialidade e de esclarecimentos permanentes. Ficou claro também que minha participação é isenta de despesas. Concordo voluntariamente em participar deste estudo e poderei retirar o meu consentimento a qualquer momento, sem penalidades ou prejuízo.</p>

<div class="sigs">
  <div class="sig-col">
    <div class="sig-label">Participante</div>
    <div class="sig-line">${nome}</div>
    <div style="font-size:11px;color:#777;margin-bottom:4px">Assinatura:</div>
    ${partSigB64 ? `<img class="sig-canvas-img" src="${partSigB64}">` : '<div style="height:80px;border:1px solid #ccc"></div>'}
  </div>
  <div class="sig-col">
    <div class="sig-label">Pesquisador</div>
    <div class="sig-name">Ivan Moriá Borges Rodrigues</div>
    ${resSigB64 ? `<img class="sig-img" src="${resSigB64}">` : '<div style="height:60px"></div>'}
  </div>
</div>

<div class="timestamp">Assinado por: <strong>${nome}</strong> em ${dt}</div>

<div class="footer">
  Caso tenha alguma dúvida sobre a pesquisa, o(a) sr(a). poderá entrar em contato com o coordenador responsável pelo estudo: Ivan Moriá Borges Rodrigues, na Escola de Música da UFMG (31-3409-4700), e-mail ivanmoriabr@gmail.com, telefone (31) 9 8466 7554. Em caso de dúvidas éticas: COEP/UFMG — Av. Presidente Antônio Carlos, 6627, Pampulha - BH/MG, coep@prpq.ufmg.br, (31) 3409-4592.
</div>
</body>
</html>`;

  try {
    // Render the clean standalone HTML into an offscreen iframe
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:794px;height:1123px;border:none;';
    document.body.appendChild(iframe);

    await new Promise(res => {
      iframe.onload = res;
      iframe.srcdoc  = tcleHTML;
    });

    // Wait one more frame for images inside iframe to load
    await new Promise(res => setTimeout(res, 600));

    const cvs = await html2canvas(iframe.contentDocument.body, {
      scale: 2, useCORS: true,
      backgroundColor: '#ffffff',
      width: 794, height: iframe.contentDocument.body.scrollHeight,
      windowWidth: 794,
    });

    document.body.removeChild(iframe);

    const imgData = cvs.toDataURL('image/jpeg', 0.95);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'px', format: 'a4' });
    const pw  = pdf.internal.pageSize.getWidth();
    const ph  = pdf.internal.pageSize.getHeight();
    const iw  = cvs.width  / 2;
    const ih  = cvs.height / 2;
    // If content taller than one page, add pages
    const pagesNeeded = Math.ceil(ih / ph);
    for (let i = 0; i < pagesNeeded; i++) {
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, -i * ph, pw, iw > 0 ? pw * (ih / iw) : ph);
    }
    pdf.save(`${nome.replace(/\s+/g,'_')}_TCLE.pdf`);
    localStorage.setItem('participantName', nome);
    notify('✓ TCLE salvo como PDF');
  } catch (err) {
    notify('⚠ Erro ao gerar PDF: ' + err.message, true);
    console.error(err);
  }
}
