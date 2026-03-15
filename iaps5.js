/* ══════════════════════════════════════════════════════════════
   LANG
══════════════════════════════════════════════════════════════ */
function setLang(l) {
  document.documentElement.lang = l;
  /* preserva classes extras como no-hero */
  var extra = document.body.className.replace(/\blang-[a-z]{2,}\b/g, '').trim();
  document.body.className = ('lang-' + l + (extra ? ' ' + extra : '')).trim();
  /* injeta regra CSS se idioma não reconhecido (adicionado dinamicamente) */
  if(!document.getElementById('dyn-lang-'+l)){
    var st=document.createElement('style'); st.id='dyn-lang-'+l;
    st.textContent='body.lang-'+l+' [data-lang="'+l+'"]{display:revert!important}';
    document.head.appendChild(st);
  }
  document.querySelectorAll('.lang-btn').forEach(b => {
    const on = b.getAttribute('lang') === l;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  /* vtoc: mostra apenas o label do idioma ativo */
  document.querySelectorAll('.vtoc-dot-label').forEach(el => {
    el.style.display = (el.dataset.lang && el.dataset.lang !== l) ? 'none' : '';
  });
  setupTableCells();
  if (TTS.active) TTS.stop();
}

/* ══════════════════════════════════════════════════════════════
   PROGRESS BAR
══════════════════════════════════════════════════════════════ */
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  document.getElementById('progress-bar').style.width =
    Math.min(h.scrollTop / (h.scrollHeight - h.clientHeight) * 100, 100) + '%';
}, { passive: true });

/* ══════════════════════════════════════════════════════════════
   TOC HIGHLIGHTS
══════════════════════════════════════════════════════════════ */
const vtocDots = document.querySelectorAll('.vtoc-dot');

document.querySelectorAll('section[id]').forEach(sec => {
  new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const id = e.target.id;
      vtocDots.forEach(d => d.classList.remove('active'));
      const vd = document.querySelector(`.vtoc-dot[data-href="#${id}"]`);
      if (vd) vd.classList.add('active');
    });
  }, { rootMargin: '-40% 0px -50% 0px' }).observe(sec);
});

/* Vertical TOC click + keyboard */
vtocDots.forEach(dot => {
  const go = () => {
    const t = document.querySelector(dot.dataset.href);
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  dot.addEventListener('click', go);
  dot.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
});

/* ══════════════════════════════════════════════════════════════
   TABLE CELL TTS SETUP
   — wraps each visible TD in .levels-table so it becomes
     individually clickable and highlight-able.
   — marks TH cells with data-tts-col so getText() can prefix
     the column header before reading each cell.
   — runs once on load; re-runs on lang change via setLang().
══════════════════════════════════════════════════════════════ */
function setupTableCells() {
  const cls = document.body.className.match(/lang-([a-z]{2})/);
  const lang = cls ? cls[1] : 'en';

  document.querySelectorAll('.levels-table').forEach(tbl => {
    /* collect header labels per column index */
    const headers = [...tbl.querySelectorAll('thead th')].map(th => {
      const sp = th.querySelector(`span[data-lang="${lang}"]`);
      return (sp || th).textContent.trim();
    });

    /* mark every TD: add class tts-cell, store col header + text */
    tbl.querySelectorAll('tbody td').forEach(td => {
      td.classList.add('tts-cell');
      const sp = td.querySelector(`span[data-lang="${lang}"]`);
      const cellText = (sp || td).textContent.trim();
      const colIdx = td.cellIndex;
      td.dataset.ttsHeader = headers[colIdx] || '';
      td.dataset.ttsText   = cellText;
    });
  });
}
setupTableCells();

/* ══════════════════════════════════════════════════════════════
   TTS ENGINE
══════════════════════════════════════════════════════════════ */
const TTS = (() => {
  const synth = window.speechSynthesis;
  const S = { IDLE: 0, PLAYING: 1, PAUSED: 2 };

  let state  = S.IDLE;
  let queue  = [];
  let curEl  = null;
  let ticket = 0;
  const origHTML = new Map();

  /* refs DOM — lazy */
  let B = null;
  function getB() {
    return B || (B = {
      btnPlay:  document.getElementById('btn-play'),
      btnPause: document.getElementById('btn-pause'),
      iPlay:    document.getElementById('icon-play'),
      iStop:    document.getElementById('icon-stop'),
      iPause:   document.getElementById('icon-pause'),
      iResume:  document.getElementById('icon-resume'),
      tip:      document.getElementById('read-tip'),
    });
  }

  /* ── seletor de elementos legíveis ── */
  const READABLE_SEL = '.rp, h2.sec-title, h3.subsec-title, ' +
    '.levels-table thead th, .levels-table tbody td, ' +
    '.profile-row, .step-item, .scales-list li, .i-list li, ' +
    '.grad-chip, .pull-quote blockquote, figure.media-figure figcaption, ' +
    '.note, aside.tip';

  function getLang() {
    const cls = document.body.className.match(/lang-([a-z]{2})/);
    return cls ? cls[1] : 'en';
  }

  function getReadables() {
    const lang = getLang();
    const out  = [];
    document.querySelectorAll(READABLE_SEL).forEach(el => {
      if (el.offsetParent === null) return;
      /* filtro de idioma: célula de tabela — sempre inclusa (o texto certo já está em data-ttsText) */
      if (el.tagName === 'TD' || el.tagName === 'TH') {
        out.push(el);
        return;
      }
      const lp = el.closest('[data-lang]');
      if (lp && lp.getAttribute('data-lang') !== lang) return;
      out.push(el);
    });
    return out;
  }

  /* ── extrai texto para TTS ── */
  function getText(el) {
    const lang = getLang();

    if (el.tagName === 'H2' && el.classList.contains('sec-title'))
      return el.textContent.trim();

    if (el.tagName === 'H3')
      return el.textContent.trim();

    if (el.tagName === 'H4')
      return el.textContent.trim();

    /* latex-block: converte LaTeX em fala legível */
    if (el.classList && el.classList.contains('latex-block')) {
      return _latexToSpeech(el.dataset.latex || el.textContent.trim());
    }

    /* pula elementos sem texto */
    if (el.tagName === 'HR' || el.tagName === 'BR') return '';

    /* LI inline: formata checklist */
    if (el.tagName === 'LI' && !el.closest('.scales-list') && !el.closest('.i-list')) {
      const t = _cleanTTS(el);
      if (t.startsWith('☐')) return 'Tarefa: ' + t.replace('☐','').trim();
      if (/✓/.test(t))       return t.replace(/\s*✓\s*$/, '') + '. Concluída.';
      return t;
    }

    if (el.tagName === 'BLOCKQUOTE') return _cleanTTS(el);
    if (el.tagName === 'DIV' || el.tagName === 'ASIDE') return _cleanTTS(el);


    if (el.classList.contains('profile-row')) {
      const lbl   = el.querySelector('.profile-name-label')?.textContent?.trim() || '';
      const ds    = el.querySelector('.profile-desc')?.textContent?.trim() || '';
      const grads = el.getAttribute('data-grads') || '';
      return lbl + '. ' + ds + (grads ? ' Espectro: ' + grads : '');
    }

    if (el.classList.contains('step-item'))
      return (el.querySelector('.step-n')?.textContent?.trim()||'') + ': ' +
             (el.querySelector('.step-t')?.textContent?.trim()||'');

    /* TH — cabeçalho de coluna */
    if (el.tagName === 'TH') {
      const sp = el.querySelector(`span[data-lang="${lang}"]`);
      return (sp || el).textContent.trim();
    }

    /* TD — célula: lê "Coluna X: texto da célula" */
    if (el.tagName === 'TD') {
      const header = el.dataset.ttsHeader || '';
      const text   = el.dataset.ttsText   || el.textContent.trim();
      return header ? header + ': ' + text : text;
    }

    if (el.classList.contains('grad-chip')) {
      const lbl = el.querySelector(`.grad-chip-lbl[data-lang="${lang}"]`);
      return lbl ? lbl.textContent.trim() : el.textContent.trim();
    }

    if (el.tagName === 'BLOCKQUOTE')
      return el.textContent.trim();

    if (el.tagName === 'FIGCAPTION')
      return el.textContent.trim();

    if (el.tagName === 'LI') {
      const s = el.querySelector('strong');
      if (s) return s.textContent.trim() + ': ' + el.textContent.replace(s.textContent,'').trim();
    }

    return _cleanTTS(el);
  }

  /* converte LaTeX em português legível */
  function _latexToSpeech(src) {
    if (!src) return 'equação';
    let s = src.trim();
    s = s.replace(/\\begin\{pmatrix\}([\s\S]*?)\\end\{pmatrix\}/g, 'matriz $1');
    s = s.replace(/\\begin\{[a-z*]+\}([\s\S]*?)\\end\{[a-z*]+\}/g, '$1');
    s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 sobre $2');
    s = s.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, 'raiz $1 de $2');
    s = s.replace(/\\sqrt\{([^}]+)\}/g, 'raiz quadrada de $1');
    s = s.replace(/\^\{([^}]+)\}/g, ' elevado a $1');
    s = s.replace(/\^([^\s{])/g, ' elevado a $1');
    s = s.replace(/_\{([^}]+)\}/g, ' índice $1');
    s = s.replace(/_([^\s{])/g, ' índice $1');
    s = s.replace(/\\sum(?:_\{([^}]*)\})?(?:\^\{([^}]*)\})?/g, 'somatório de $1 até $2');
    s = s.replace(/\\int(?:_\{([^}]*)\})?(?:\^\{([^}]*)\})?/g, 'integral de $1 até $2');
    s = s.replace(/\\lim(?:_\{([^}]*)\})?/g, 'limite quando $1');
    const sym = {alpha:'alfa',beta:'beta',gamma:'gama',delta:'delta',epsilon:'épsilon',
      zeta:'zeta',eta:'eta',theta:'teta',iota:'iota',kappa:'capa',lambda:'lambda',
      mu:'mu',nu:'nu',xi:'xi',pi:'pi',rho:'rô',sigma:'sigma',tau:'tau',
      upsilon:'úpsilon',phi:'fi',chi:'qui',psi:'psi',omega:'ômega',
      Alpha:'Alfa',Beta:'Beta',Gamma:'Gama',Delta:'Delta',Sigma:'Sigma',Omega:'Ômega',
      times:'vezes',cdot:'vezes',div:'dividido por',pm:'mais ou menos',
      infty:'infinito',partial:'parcial',nabla:'nabla',
      approx:'aproximadamente',neq:'diferente de',leq:'menor ou igual a',geq:'maior ou igual a',
      in:'pertence a',notin:'não pertence a',subset:'subconjunto de',
      forall:'para todo',exists:'existe',land:'e',lor:'ou',
      to:'tende a',rightarrow:'seta direita',leftarrow:'seta esquerda',
      vec:'vetor de',hat:'chapéu de',dot:'derivada de',tilde:'til de',
      overline:'barra sobre',underline:'sublinhado'};
    s = s.replace(/\\([a-zA-Z]+)/g, (m,w) => sym[w] !== undefined ? sym[w] : w);
    s = s.replace(/[{}\\]/g,' ').replace(/\s+/g,' ').trim();
    return s || 'equação';
  }

  /* extrai texto limpo — remove KaTeX renderizado, converte equações */
  function _cleanTTS(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('svg').forEach(e => e.remove());
    /* KaTeX: usa annotation como fonte LaTeX */
    clone.querySelectorAll('.katex').forEach(k => {
      const ann = k.querySelector('annotation');
      const spoken = ann ? _latexToSpeech(ann.textContent) : '';
      k.replaceWith(document.createTextNode(' ' + spoken + ' '));
    });
    /* span.tts-latex escondido com data-latex */
    clone.querySelectorAll('.tts-latex').forEach(s => {
      s.replaceWith(document.createTextNode(' ' + _latexToSpeech(s.dataset.latex||'') + ' '));
    });
    let t = clone.textContent || '';
    t = t.replace(/\$\$[\s\S]*?\$\$/g,'').replace(/\$[^$\n]*?\$/g,'');
    t = t.replace(/\u00a0/g,' ');
    return t.replace(/\s+/g,' ').trim();
  }

  /* ── elementos que suportam highlight palavra a palavra ── */
  function canHighlight(el) {
    if (el.tagName === 'HR' || el.tagName === 'BR') return false;
    /* qualquer elemento com .rp já é highlightable;
       mais os elementos nativos do iaps que não têm .rp */
    return el.classList.contains('rp')
      || el.classList.contains('note')
      || el.tagName === 'ASIDE'
      || el.classList.contains('sec-title')
      || el.tagName === 'FIGCAPTION'
      || el.tagName === 'TH'
      || el.tagName === 'TD';
  }

  /* wrapWords: divide o texto *visível* (data-ttsText para TD/TH) em spans.w */
  function wrapWords(el) {
    if (!canHighlight(el)) return;
    if (!origHTML.has(el)) origHTML.set(el, el.innerHTML);

    /* Para TD/TH, cria wrapper de highlight sobreposto sem mexer no DOM real.
       Usamos um overlay posicionado dentro da célula. */
    if (el.tagName === 'TD' || el.tagName === 'TH') {
      const lang = getLang();
      /* pega ou cria o span de overlay */
      let ov = el.querySelector('.tts-cell-overlay');
      if (!ov) {
        ov = document.createElement('span');
        ov.className = 'tts-cell-overlay';
        el.appendChild(ov);
      }
      const sp = el.querySelector(`span[data-lang="${lang}"]`);
      const rawText = (sp || el).textContent.trim();
      let i = 0, html = '';
      for (const tok of rawText.split(/(\s+)/))
        html += /\S/.test(tok)
          ? '<span class="w" data-i="' + (i++) + '">' + tok + '</span>'
          : tok;
      ov.innerHTML = html;
      ov.style.display = '';
      el._ttsOverlay = ov;
      el._ttsRaw = rawText;
      return;
    }

    /* usa getText() — retorna texto limpo (sem KaTeX, sem $) que foi falado */
    const spokenText = getText(el);
    if (!spokenText) return;
    el._ttsRaw = spokenText;
    let i = 0, html = '';
    for (const tok of spokenText.split(/(\s+)/))
      html += /\S/.test(tok) ? '<span class="w" data-i="' + (i++) + '">' + tok + '</span>' : tok;
    el.innerHTML = html;
  }

  function unwrap(el) {
    if (!el) return;
    /* remove overlay de célula */
    if ((el.tagName === 'TD' || el.tagName === 'TH') && el._ttsOverlay) {
      el._ttsOverlay.style.display = 'none';
      el._ttsOverlay.innerHTML = '';
      delete el._ttsOverlay;
      delete el._ttsRaw;
    } else if (origHTML.has(el)) {
      el.innerHTML = origHTML.get(el);
    }
    el.classList.remove('rp-active');
  }

  function ui() {
    const b      = getB();
    const idle   = state === S.IDLE;
    const paused = state === S.PAUSED;
    const pt     = getLang() === 'pt';

    b.iPlay.style.display  = idle ? '' : 'none';
    b.iStop.style.display  = idle ? 'none' : '';
    b.btnPlay.classList.toggle('is-active', !idle);
    b.btnPlay.setAttribute('aria-label',
      idle ? (pt ? 'Iniciar leitura' : 'Start reading')
           : (pt ? 'Parar leitura'   : 'Stop reading'));

    b.btnPause.style.display = idle ? 'none' : '';
    b.iPause.style.display   = paused ? 'none' : '';
    b.iResume.style.display  = paused ? '' : 'none';
    b.btnPause.classList.toggle('is-active', paused);
    b.btnPause.setAttribute('aria-label',
      paused ? (pt ? 'Continuar' : 'Resume') : (pt ? 'Pausar' : 'Pause'));

    if (idle) {
      b.tip.classList.remove('show');
    } else {
      b.tip.textContent = paused ? (pt?'Pausado':'Paused') : (pt?'Lendo…':'Reading…');
      b.tip.classList.add('show');
    }
  }

  function speakEl(el) {
    unwrap(curEl);
    curEl = el;
    const myTicket = ++ticket;

    el.classList.add('rp-active');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    wrapWords(el);

    const text = getText(el);
    if (!text) { _advance(); return; }

    const utt = new SpeechSynthesisUtterance(text);
    const _ttsMap = {en:'en-US',pt:'pt-BR',fr:'fr-FR',de:'de-DE',es:'es-ES'};
    const _lg = getLang();
    utt.lang  = _ttsMap[_lg] || _lg;
    utt.rate  = parseFloat(document.getElementById('speed-sel').value) || 1;

    if (canHighlight(el)) {
      /* raw = texto efectivamente falado */
      const raw = el._ttsRaw || el.textContent;

      /* offset: para TD, getText() prefixa "Coluna: "; o charIndex da API começa
         no início do utterance, então precisamos calcular o offset do prefixo */
      const prefix = (el.tagName === 'TD' && el.dataset.ttsHeader)
        ? (el.dataset.ttsHeader + ': ').length
        : 0;

      utt.onboundary = evt => {
        if (ticket !== myTicket || evt.name !== 'word') return;
        const ci = evt.charIndex - prefix;   /* ajusta pelo prefixo do cabeçalho */
        if (ci < 0) return;                  /* ainda lendo o prefixo */

        const container = el._ttsOverlay || el;
        if (!container) return;

        let wi = 0, pos = 0;
        for (const tok of raw.split(/(\s+)/)) {
          if (/\S/.test(tok)) {
            if (ci >= pos && ci < pos + tok.length) {
              container.querySelectorAll('.w').forEach(s =>
                s.classList.toggle('w-on', +s.dataset.i === wi));
              return;
            }
            wi++;
          }
          pos += tok.length;
        }
      };
    }

    utt.onend = utt.onerror = () => {
      if (ticket !== myTicket) return;
      if (state === S.PLAYING) { unwrap(el); _advance(); }
    };

    synth.speak(utt);
  }

  function _advance() {
    if (state !== S.PLAYING || !queue.length) { _stopNow(true); return; }
    speakEl(queue.shift());
  }

  function _stopNow(renderUI) {
    ticket++;
    synth.cancel();
    unwrap(curEl);
    curEl = null;
    queue = [];
    state = S.IDLE;
    if (renderUI) ui();
  }

  function _play(fromEl) {
    _stopNow(false);
    const all = getReadables();
    if (!all.length) { ui(); return; }
    const idx = fromEl ? Math.max(all.indexOf(fromEl), 0) : 0;
    queue = all.slice(idx + 1);
    state = S.PLAYING;
    ui();
    speakEl(all[idx]);
  }

  return {
    togglePlay()  { state !== S.IDLE ? _stopNow(true) : _play(null); },
    togglePause() {
      if      (state === S.PLAYING) { synth.pause();  state = S.PAUSED;  ui(); }
      else if (state === S.PAUSED)  { synth.resume(); state = S.PLAYING; ui(); }
    },
    speedChange() { if (state !== S.IDLE) _play(curEl); },
    clickPara(el) {
      if (state !== S.IDLE) {
        _play(el);
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    get active()  { return state !== S.IDLE; }
  };
})();

function ttsTogglePlay()  { TTS.togglePlay(); }
function ttsTogglePause() { TTS.togglePause(); }
function ttsSpeedChange() { TTS.speedChange(); }

/* ── Click handler ─────────────────────────────────────────── */
let _pdX = 0, _pdY = 0;
document.addEventListener('pointerdown', e => { _pdX = e.clientX; _pdY = e.clientY; }, { capture: true, passive: true });

document.addEventListener('click', e => {
  if (e.target.closest('#audio-controls, .lang-toggle, #vtoc')) return;
  if (Math.abs(e.clientX - _pdX) > 5 || Math.abs(e.clientY - _pdY) > 5) return;

  const el = e.target.closest(
    '.rp, h2.sec-title, h3.subsec-title, ' +
    '.levels-table thead th, .levels-table tbody td, ' +
    '.profile-row, .step-item, .scales-list li, .i-list li, ' +
    '.grad-chip, .pull-quote blockquote, figure.media-figure figcaption, ' +
    '.note, aside.tip'
  );
  if (!el) return;

  e.stopPropagation();
  TTS.clickPara(el);
}, true);

if (!window.speechSynthesis) document.getElementById('audio-controls').style.display = 'none';
