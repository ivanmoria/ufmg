/* ═══════════════════════════════════════════════════════════
   T-MIRIM | MODULE: pages/ritmic
   Testes Rítmicos — Tempo Espontâneo (TTE) + futuros
   ═══════════════════════════════════════════════════════════ */

// ── Sub-test switcher ─────────────────────────────────────
function switchRTest(id) {
  document.querySelectorAll('[data-rtest]').forEach(b =>
    b.classList.toggle('on', b.dataset.rtest === id));
  document.querySelectorAll('[id^="rtest-"]').forEach(p =>
    p.style.display = p.id === 'rtest-' + id ? 'flex' : 'none');
  document.querySelectorAll('[id^="rtest-"]').forEach(p => {
    if (p.style.display === 'flex') p.style.flexDirection = 'column';
  });
}

// ══════════════════════════════════════════════════════════
// TTE — Teste do Tempo Espontâneo
// ══════════════════════════════════════════════════════════
let _tteCount     = 0;
let _tteStartTime = null;
let _tteBeatTimes = [];   // ms desde início
let _tteChart     = null;
let _tteDone      = false;

function tteGetN() {
  return parseInt(document.getElementById('tte-n-beats')?.value) || 21;
}

function ttePulse() {
  if (_tteDone) return;
  const now = Date.now();
  const N   = tteGetN();

  if (_tteCount === 0) {
    _tteStartTime = now;
    _tteBeatTimes = [0];
  } else {
    _tteBeatTimes.push(now - _tteStartTime);
  }
  _tteCount++;

  // Visual feedback via CSS class (mais rápido — definida no novo bloco abaixo)
  document.getElementById('tte-pulse-btn')?.classList.add('pressed');
  setTimeout(() => document.getElementById('tte-pulse-btn')?.classList.remove('pressed'), 100);

  const countEl = document.getElementById('tte-count');
  const totalEl = document.getElementById('tte-total');
  if (countEl) countEl.textContent = _tteCount;
  if (totalEl) totalEl.textContent = N;

  if (_tteCount >= N) {
    _tteDone = true;
    tteFinish();
  }
}

function tteFinish() {
  const N         = tteGetN();
  const totalMs   = _tteBeatTimes[_tteBeatTimes.length - 1];
  const totalMins = totalMs / 60000;
  const bpm       = Math.round((N - 1) / totalMins);

  // IOI array (N-1 values)
  const ioi = [];
  for (let i = 1; i < _tteBeatTimes.length; i++) {
    ioi.push(_tteBeatTimes[i] - _tteBeatTimes[i - 1]);
  }

  const meanIOI = ioi.reduce((a,b) => a+b, 0) / ioi.length;
  const sdIOI   = Math.sqrt(ioi.reduce((a,b) => a + Math.pow(b - meanIOI, 2), 0) / ioi.length);
  const cv      = (sdIOI / meanIOI) * 100;

  // Rate of change (acceleration)
  const roc = [];
  for (let i = 1; i < ioi.length; i++) roc.push(ioi[i] - ioi[i-1]);

  // Linear regression on IOI
  const n    = ioi.length;
  const sumX = ioi.reduce((a,_,i) => a+i, 0);
  const sumY = ioi.reduce((a,b) => a+b, 0);
  const sumXY= ioi.reduce((a,b,i) => a+i*b, 0);
  const sumX2= ioi.reduce((a,_,i) => a+i*i, 0);
  const slope= (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
  const intercept = (sumY - slope*sumX) / n;
  const regLine = ioi.map((_,i) => slope*i + intercept);
  const upperCI = regLine.map(v => v + sdIOI);
  const lowerCI = regLine.map(v => v - sdIOI);

  // Set stat cards
  document.getElementById('tte-bpm-val').textContent    = bpm;
  document.getElementById('tte-mean-ioi').textContent   = Math.round(meanIOI);
  document.getElementById('tte-cv-val').textContent     = cv.toFixed(1);
  document.getElementById('tte-total-time').textContent = totalMs;

  // Show results
  document.getElementById('tte-results').style.display = 'block';
  document.getElementById('tte-export-btn').disabled   = false;
  document.getElementById('tte-pulse-btn').disabled    = true;
  document.getElementById('tte-pulse-btn').style.opacity = '0.5';

  // Chart
  if (_tteChart) { _tteChart.destroy(); _tteChart = null; }
  const isLight = document.documentElement.classList.contains('light');
  const gc  = isLight ? '#d2d6e8' : '#272d40';
  const tc  = isLight ? '#50597a' : '#6b748f';
  const ctx = document.getElementById('tte-chart')?.getContext('2d');
  if (!ctx) return;

  const labels = ioi.map((_, i) => `${i + 1}→${i + 2}`);

  _tteChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'IOI (ms)',
          data: ioi,
          borderColor: '#3ddba8',
          backgroundColor: 'rgba(61,219,168,.12)',
          fill: true,
          borderWidth: 2,
          pointRadius: 4,
          tension: 0.2,
        },
        {
          label: 'Taxa de variação',
          data: [null, ...roc],
          borderColor: '#ffcc44',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 3,
          tension: 0.3,
          borderDash: [4, 3],
        },
        {
          label: 'Média',
          data: new Array(n).fill(meanIOI),
          borderColor: '#7b8cff',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'Regressão linear',
          data: regLine,
          borderColor: '#ff5e7a',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          borderDash: [6, 3],
        },
        {
          label: 'IC superior',
          data: upperCI,
          borderColor: 'rgba(255,94,122,.25)',
          backgroundColor: 'rgba(255,94,122,.07)',
          borderWidth: 1,
          pointRadius: 0,
          fill: '+1',
        },
        {
          label: 'IC inferior',
          data: lowerCI,
          borderColor: 'rgba(255,94,122,.25)',
          backgroundColor: 'rgba(255,94,122,.07)',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      animation: { duration: 500 },
      plugins: {
        legend: {
          labels: { color: tc, font: { family: 'DM Mono', size: 11 }, boxWidth: 14 },
        },
        tooltip: { enabled: true },
      },
      scales: {
        x: {
          title: { display: true, text: 'Intervalo (batida N → N+1)', color: tc },
          ticks: { color: tc, font: { family: 'DM Mono', size: 10 } },
          grid:  { color: gc },
        },
        y: {
          title: { display: true, text: 'IOI (ms)', color: tc },
          ticks: { color: tc, font: { family: 'DM Mono', size: 10 } },
          grid:  { color: gc },
        },
      },
    },
  });

  // Trend text
  const trend = slope > 5 ? '📈 Desaceleração (IOI aumentando)' :
                slope < -5 ? '📉 Aceleração (IOI diminuindo)' :
                             '↔ Pulsação estável';
  const analysisEl = document.getElementById('tte-analysis');
  if (analysisEl) analysisEl.textContent = `Tendência: ${trend} · Slope = ${slope.toFixed(2)} ms/batida`;
}

function tteReset() {
  _tteCount = 0; _tteStartTime = null; _tteBeatTimes = []; _tteDone = false;
  if (_tteChart) { _tteChart.destroy(); _tteChart = null; }
  const btn = document.getElementById('tte-pulse-btn');
  if (btn) { btn.disabled = false; btn.style.opacity = ''; }
  document.getElementById('tte-count').textContent = '0';
  document.getElementById('tte-results').style.display = 'none';
  document.getElementById('tte-export-btn').disabled = true;
}

function tteExportCSV() {
  if (!_tteBeatTimes.length) return;
  const N   = tteGetN();
  const ioi = [];
  for (let i = 1; i < _tteBeatTimes.length; i++) ioi.push(_tteBeatTimes[i] - _tteBeatTimes[i-1]);
  const meanIOI = ioi.reduce((a,b) => a+b,0) / ioi.length;
  const sdIOI   = Math.sqrt(ioi.reduce((a,b) => a+Math.pow(b-meanIOI,2),0) / ioi.length);
  const cv      = (sdIOI/meanIOI)*100;
  const totalMs = _tteBeatTimes[_tteBeatTimes.length-1];
  const bpm     = Math.round((N-1)/(totalMs/60000));
  const nome    = document.getElementById('tte-participante')?.value?.trim() || 'participante';
  const date    = new Date().toISOString().slice(0,10);

  const rows = [
    ['Participante', nome],
    ['Data', date],
    ['N batidas', N],
    ['BPM', bpm],
    ['IOI médio (ms)', Math.round(meanIOI)],
    ['DP IOI (ms)', Math.round(sdIOI)],
    ['CV (%)', cv.toFixed(2)],
    ['Tempo total (ms)', totalMs],
    [],
    ['Batida', 'Instante (ms)', 'IOI (ms)'],
    ..._tteBeatTimes.map((t, i) => [i+1, t, i===0 ? '' : ioi[i-1]]),
  ];

  const csv  = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `TTE_${nome}_${date}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (typeof notify === 'function') notify('✓ TTE exportado');
}

// ── Separação touch/mouse para evitar duplo disparo ──────────
// No mobile, ontouchstart dispara ttePulseMobile e o onclick
// seria chamado em seguida — bloqueamos com flag.
let _lastTouchTime = 0;

function ttePulseMobile(e) {
  e.preventDefault(); // bloqueia click subsequente e zoom
  _lastTouchTime = Date.now();
  ttePulse();
}

function ttePulseDesktop(e) {
  // Se veio de touch (< 500ms atrás), ignora o click sintético
  if (Date.now() - _lastTouchTime < 500) return;
  ttePulse();
}

// ── Tela de setup mobile ──────────────────────────────────────
function tteStartSession() {
  const setup = document.getElementById('tte-setup-screen');
  const panel = document.getElementById('rtest-tte');
  if (setup) setup.style.display = 'none';
  if (panel) { panel.style.display = 'flex'; panel.style.flexDirection = 'column'; }
  // Atualiza total no contador
  const totalEl = document.getElementById('tte-total');
  if (totalEl) totalEl.textContent = tteGetN();
}

// ── Live IOI display ──────────────────────────────────────────
function tteUpdateLiveIOI() {
  const el = document.getElementById('tte-last-ioi');
  if (!el || _tteBeatTimes.length < 2) return;
  const last = _tteBeatTimes[_tteBeatTimes.length - 1];
  const prev = _tteBeatTimes[_tteBeatTimes.length - 2];
  el.textContent = last - prev;
}

// ── Override ttePulse para incluir live IOI ───────────────────
const _ttePulseOrig = ttePulse;
// Patch: já está definida acima, então apenas adicionamos o live IOI no fim
const _ttePulsePatched = ttePulse;
// Substituímos a referência global
window.ttePulse = function() {
  _ttePulsePatched();
  tteUpdateLiveIOI();
};
// Reaponta as funções que chamam ttePulse diretamente via string onclick
function ttePulse() {
  if (_tteDone) return;
  const now = Date.now();
  const N   = tteGetN();

  if (_tteCount === 0) {
    _tteStartTime = now;
    _tteBeatTimes = [0];
  } else {
    _tteBeatTimes.push(now - _tteStartTime);
  }
  _tteCount++;

  // Visual feedback via classe CSS (mais rápido que style inline)
  const btn = document.getElementById('tte-pulse-btn');
  if (btn) {
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 100);
  }

  const countEl = document.getElementById('tte-count');
  const totalEl = document.getElementById('tte-total');
  if (countEl) countEl.textContent = _tteCount;
  if (totalEl) totalEl.textContent = N;

  tteUpdateLiveIOI();

  if (_tteCount >= N) {
    _tteDone = true;
    tteFinish();
  }
}

// Override tteReset para voltar à tela de setup no mobile
const _tteResetOrig = tteReset;
window.tteReset = function() {
  _tteCount = 0; _tteStartTime = null; _tteBeatTimes = []; _tteDone = false;
  if (_tteChart) { _tteChart.destroy(); _tteChart = null; }
  const btn = document.getElementById('tte-pulse-btn');
  if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.classList.remove('pressed'); }
  const countEl = document.getElementById('tte-count');
  if (countEl) countEl.textContent = '0';
  const results = document.getElementById('tte-results');
  if (results) results.style.display = 'none';
  const exportBtn = document.getElementById('tte-export-btn');
  if (exportBtn) exportBtn.disabled = true;
  const liveEl = document.getElementById('tte-last-ioi');
  if (liveEl) liveEl.textContent = '—';

  // Volta para setup no mobile
  if (window.innerWidth <= 700) {
    const setup = document.getElementById('tte-setup-screen');
    const panel = document.getElementById('rtest-tte');
    if (setup) setup.style.display = 'flex';
    if (panel) panel.style.display = 'none';
  }
};

// No desktop, mostra o painel direto (sem tela de setup)
if (window.innerWidth > 700) {
  const panel = document.getElementById('rtest-tte');
  if (panel) { panel.style.display = 'flex'; panel.style.flexDirection = 'column'; }
}

// Spacebar shortcut when on ritmic tab
document.addEventListener('keydown', e => {
  if (e.code !== 'Space') return;
  const active = document.querySelector('.tab-btn.active')?.dataset?.page;
  if (active !== 'ritmic') return;
  e.preventDefault();
  ttePulse();
});
