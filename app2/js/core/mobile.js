/* ══════════════════════════════════════════
   T-MIRIM — mobile.js  (clean rewrite)
   Regra de ouro: NUNCA usar capture:true,
   NUNCA usar stopPropagation em handlers globais.
   O nav.js é dono de .tab-btn — não interferir.
══════════════════════════════════════════ */
(function () {
  'use strict';

  function isMobile() { return window.innerWidth <= 700; }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  /* ── 1. DRAWER ────────────────────────── */
  const hamburger = $('#mobile-hamburger');
  const overlay   = $('#mobile-drawer-overlay');
  function openDrawer()  { document.body.classList.add('drawer-open'); }
  function closeDrawer() { document.body.classList.remove('drawer-open'); }
  hamburger?.addEventListener('click', () =>
    document.body.classList.contains('drawer-open') ? closeDrawer() : openDrawer());
  overlay?.addEventListener('click', closeDrawer);
  let _tx = 0;
  document.addEventListener('touchstart', e => { _tx = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', e => {
    if (document.body.classList.contains('drawer-open') && e.changedTouches[0].clientX - _tx < -60) closeDrawer();
  }, { passive: true });

  /* ── 2. TEMA ──────────────────────────── */
  function syncTheme() {
    const icon = document.documentElement.classList.contains('light') ? '🌙' : '☀️';
    $$('#btn-theme-mobile, #btn-theme-drawer').forEach(b => { if (b) b.textContent = icon; });
  }
  syncTheme();
  new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  function toggleTheme() { $('#btn-theme')?.click(); setTimeout(syncTheme, 50); }
  $('#btn-theme-mobile')?.addEventListener('click', toggleTheme);
  $('#btn-theme-drawer')?.addEventListener('click', toggleTheme);

  /* ── 3. NAVEGAÇÃO DO DRAWER ──────────── */
  /* Delega ao botão da sidenav desktop para que nav.js cuide de tudo */
  function navTo(page) {
    const desk = $(`.sidenav .tab-btn[data-page="${page}"]`);
    if (desk) {
      desk.click();
    } else {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      $$('.page').forEach(p => p.classList.remove('active'));
      $(`#page-${page}`)?.classList.add('active');
    }
    closeDrawer();
    syncActive(page);
  }
  function syncActive(page) {
    $$('#mobile-drawer-nav .tab-btn[data-page]').forEach(b =>
      b.classList.toggle('active', b.dataset.page === page));
    $$('#mobile-bottom-nav .mobile-bottom-nav__item[data-page]').forEach(b =>
      b.classList.toggle('active', b.dataset.page === page));
  }
  $$('#mobile-drawer-nav .tab-btn[data-page]').forEach(btn =>
    btn.addEventListener('click', () => navTo(btn.dataset.page)));
  $$('#mobile-bottom-nav .mobile-bottom-nav__item[data-page]').forEach(btn =>
    btn.addEventListener('click', () => navTo(btn.dataset.page)));
  $$('.sidenav .tab-btn[data-page]').forEach(btn =>
    btn.addEventListener('click', () => syncActive(btn.dataset.page)));

  /* ── 4. SUB-MENUS (somente chevron expande) ── */
  const SUBMENUS = [
    { page: 'forms', children: [
      { label: '📄 TCLE',     action: () => { if (typeof switchForm !== 'undefined') switchForm('tcle'); } },
      { label: '📝 Anamnese', action: () => { if (typeof switchForm !== 'undefined') switchForm('anamnese'); } },
      { label: '🧠 DASS-21',  action: () => { if (typeof switchForm !== 'undefined') switchForm('dass21'); } },
    ]},
    { page: 'ritmic', children: [
      { label: '⏱ Tempo Espontâneo',          action: () => { if (typeof switchRTest !== 'undefined') switchRTest('tte'); } },
      { label: '🎵 Metrônomo (em breve)',       action: () => {} },
      { label: '🔄 Sincronização (em breve)',   action: () => {} },
    ]},
  ];

  function buildSubmenus(navEl, isDrawer) {
    SUBMENUS.forEach(sm => {
      const parentBtn = navEl.querySelector(`.tab-btn[data-page="${sm.page}"]`);
      if (!parentBtn) return;

      /* Chevron — único responsável por expandir/colapsar */
      const chev = document.createElement('span');
      chev.className = 'tab-chevron';
      chev.textContent = '›';
      parentBtn.classList.add('tab-btn-has-sub');
      parentBtn.appendChild(chev);

      const sub = document.createElement('div');
      sub.className = 'sidenav-submenu';
      parentBtn.after(sub);

      sm.children.forEach(child => {
        const btn = document.createElement('button');
        btn.className = 'tab-btn sidenav-submenu-item';
        btn.textContent = child.label;
        btn.addEventListener('click', () => {
          if (isDrawer) {
            navTo(sm.page);
            setTimeout(child.action, 80);
          } else {
            /* Desktop: ativa a página pai sem fechar nada */
            $$('.tab-btn').forEach(b => b.classList.remove('active'));
            $$('.page').forEach(p => p.classList.remove('active'));
            parentBtn.classList.add('active');
            $(`#page-${sm.page}`)?.classList.add('active');
            if (sm.page === 'forms'  && typeof populateForms !== 'undefined') populateForms();
            setTimeout(child.action, 40);
          }
        });
        sub.appendChild(btn);
      });

      /* stopPropagation APENAS no chevron — não afeta nenhum outro elemento */
      chev.addEventListener('click', e => {
        e.stopPropagation();
        const open = sub.classList.toggle('open');
        parentBtn.classList.toggle('sub-open', open);
      });
    });
  }

  /* ── 5. VIZ TOPBAR ────────────────────── */
  function syncVizTopbar() {
    const mobile = $('#viz-tb-mobile-actions');
    if (!mobile) return;
    $$('.viz-topbar-section').forEach(s => {
      if (s.id === 'viz-tb-plot') return;
      if (s.id === 'viz-tb-mobile-actions') { s.style.display = isMobile() ? 'flex' : 'none'; return; }
      s.style.display = isMobile() ? 'none' : '';
    });
  }
  window.addEventListener('resize', syncVizTopbar);

  $('#btn-viz-gear-mobile')?.addEventListener('click', () => { syncDesktopToPopup(); openPopup('viz-config-popup-overlay'); });
  $('#btn-download-plots-mobile')?.addEventListener('click', () => { buildExportList(); openPopup('viz-export-popup-overlay'); });
  $('#btn-download-plots')?.addEventListener('click', () => { buildExportList(); openPopup('viz-export-popup-overlay'); });

  /* ── 6. POPUP HELPERS ─────────────────── */
  function openPopup(id)  { $('#' + id)?.classList.add('open'); }
  function closePopup(id) { $('#' + id)?.classList.remove('open'); }
  ['viz-config-popup-overlay','viz-export-popup-overlay'].forEach(id =>
    $('#' + id)?.addEventListener('click', function(e) { if (e.target === this) closePopup(id); }));
  window.closeVizConfigPopup = () => closePopup('viz-config-popup-overlay');
  window.closeVizExportPopup = () => closePopup('viz-export-popup-overlay');
  window.openVizConfigPopup  = () => { syncDesktopToPopup(); openPopup('viz-config-popup-overlay'); };

  /* ── 7. VIZ CONFIG SYNC ───────────────── */
  function syncDesktopToPopup() {
    [['[data-metric]','metricM'],['[data-pt]','ptM'],['[data-grp]','grpM'],['[data-dm]','dmM']]
      .forEach(([sel, mAttr]) => $$(sel).forEach(d => {
        const m = $(`[data-${mAttr}="${d.dataset[Object.keys(d.dataset)[0]]}"]`);
        m?.classList.toggle('on', d.classList.contains('on'));
      }));
    ['chk-plotar-junto','chk-show-names','chk-show-legend'].forEach(id => {
      const d = $(`#${id}`), m = $(`#${id}-m`);
      if (d && m) m.checked = d.checked;
    });
    ['tog-boxplot','tog-timeseries'].forEach(id => {
      const d = $(`#${id}`), m = $(`#${id}-m`);
      if (d && m) m.classList.toggle('on', d.classList.contains('on'));
    });
  }

  /* Single-select para tipo e modo no popup */
  [['[data-pt-m]'],['[data-dm-m]']].forEach(([sel]) =>
    $$(sel).forEach(btn => btn.addEventListener('click', () => {
      $$(sel).forEach(b => b.classList.remove('on')); btn.classList.add('on');
    })));

  window.applyVizConfigFromPopup = function() {
    /* Copia popup → desktop via atributo */
    const pairs = [
      ['[data-metric-m]', d => $(`[data-metric="${d.dataset.metricM}"]`)],
      ['[data-pt-m]',     d => $(`[data-pt="${d.dataset.ptM}"]`)],
      ['[data-grp-m]',    d => $(`[data-grp="${d.dataset.grpM}"]`)],
      ['[data-dm-m]',     d => $(`[data-dm="${d.dataset.dmM}"]`)],
    ];
    pairs.forEach(([sel, finder]) => $$(sel).forEach(m => finder(m)?.classList.toggle('on', m.classList.contains('on'))));
    ['chk-plotar-junto','chk-show-names','chk-show-legend'].forEach(id => {
      const d = $(`#${id}`), m = $(`#${id}-m`); if (d && m) d.checked = m.checked;
    });
    ['tog-boxplot','tog-timeseries'].forEach(id => {
      const d = $(`#${id}`), m = $(`#${id}-m`); if (d && m) d.classList.toggle('on', m.classList.contains('on'));
    });
    closeVizConfigPopup();
    $('#btn-plot')?.click();
  };

  /* ── 8. VIZ EXPORT ────────────────────── */
  let _fmt = 'svg';
  window.setExportFmt = function(f) {
    _fmt = f;
    $('#fmt-svg')?.classList.toggle('active', f === 'svg');
    $('#fmt-png')?.classList.toggle('active', f === 'png');
  };
  function buildExportList() {
    const list = $('#viz-export-graph-list');
    if (!list) return;
    const plots = $$('#plot-area .js-plotly-plot, #plot-area canvas');
    list.innerHTML = plots.length ? '' : '<p style="color:var(--textdim);font-size:.85rem;padding:10px">Plote os gráficos primeiro.</p>';
    plots.forEach((el, i) => {
      const label = el.closest('.viz-metric-block')?.querySelector('.viz-metric-header')?.textContent?.trim() || `Gráfico ${i+1}`;
      const item = document.createElement('div');
      item.className = 'viz-export-graph-item selected';
      item.dataset.idx = i;
      item.innerHTML = `<div class="viz-export-graph-item__check">✓</div><span class="viz-export-graph-item__label">${label}</span>`;
      item.addEventListener('click', () => item.classList.toggle('selected'));
      list.appendChild(item);
    });
  }
  window.selectAllExportGraphs  = () => $$('.viz-export-graph-item').forEach(el => el.classList.add('selected'));
  window.selectNoneExportGraphs = () => $$('.viz-export-graph-item').forEach(el => el.classList.remove('selected'));
  window.doExportSelected = function() {
    const plots = $$('#plot-area .js-plotly-plot, #plot-area canvas');
    $$('.viz-export-graph-item.selected').forEach(item => {
      const el = plots[+item.dataset.idx]; if (!el) return;
      const fname = item.querySelector('.viz-export-graph-item__label').textContent.replace(/\s+/g,'_');
      if (el.classList.contains('js-plotly-plot') && window.Plotly)
        Plotly.downloadImage(el, { format: _fmt === 'png' ? 'png' : 'svg', filename: fname });
      else if (el.tagName === 'CANVAS') {
        const a = document.createElement('a'); a.download = fname+'.png'; a.href = el.toDataURL(); a.click();
      }
    });
    closeVizExportPopup();
  };

  /* ── 9. ASSINATURA FULLSCREEN ─────────── */
  let _sfc, _sfctx, _sfd = false, _slx = 0, _sly = 0;
  window.openSigFullscreen = function() {
    $('#sig-fullscreen-overlay')?.classList.add('open');
    setTimeout(initSigCanvas, 120);
  };
  function initSigCanvas() {
    const wrap = $('#sig-fullscreen-canvas-wrap');
    if (!wrap) return;
    const fresh = document.createElement('canvas');
    fresh.id = 'sig-fullscreen-canvas';
    wrap.innerHTML = ''; wrap.appendChild(fresh);
    _sfc = fresh; fresh.width = wrap.clientWidth; fresh.height = wrap.clientHeight;
    _sfctx = fresh.getContext('2d');
    Object.assign(_sfctx, { strokeStyle: '#111', lineWidth: 2.5, lineCap: 'round', lineJoin: 'round' });
    function pos(e) { const r = fresh.getBoundingClientRect(), s = e.touches?.[0] || e; return [s.clientX-r.left, s.clientY-r.top]; }
    fresh.addEventListener('touchstart', e => { e.preventDefault(); _sfd=true; [_slx,_sly]=pos(e); }, { passive:false });
    fresh.addEventListener('touchmove',  e => { if (!_sfd) return; e.preventDefault(); const [x,y]=pos(e); _sfctx.beginPath(); _sfctx.moveTo(_slx,_sly); _sfctx.lineTo(x,y); _sfctx.stroke(); [_slx,_sly]=[x,y]; }, { passive:false });
    fresh.addEventListener('touchend',   () => { _sfd=false; }, { passive:true });
    fresh.addEventListener('mousedown',  e => { _sfd=true; [_slx,_sly]=pos(e); });
    fresh.addEventListener('mousemove',  e => { if (!_sfd) return; const [x,y]=pos(e); _sfctx.beginPath(); _sfctx.moveTo(_slx,_sly); _sfctx.lineTo(x,y); _sfctx.stroke(); [_slx,_sly]=[x,y]; });
    fresh.addEventListener('mouseup',    () => { _sfd=false; });
  }
  window.clearFullscreenSig = () => _sfctx && _sfc && _sfctx.clearRect(0,0,_sfc.width,_sfc.height);
  window.closeSigFullscreen = function(ok) {
    if (ok && _sfc) {
      const wrap = $('#tcle-sig-canvas-wrap');
      if (wrap) {
        wrap.style.display = 'block';
        let t = wrap.querySelector('canvas');
        if (!t) { t = document.createElement('canvas'); t.style.cssText='width:100%;height:120px'; wrap.appendChild(t); }
        t.width=_sfc.width; t.height=_sfc.height; t.getContext('2d').drawImage(_sfc,0,0);
      }
      const ts = $('#tcle-timestamp');
      if (ts) ts.textContent = 'Assinado por: '+($('#tcle-nome')?.value||'—')+' em '+new Date().toLocaleString('pt-BR');
    }
    $('#sig-fullscreen-overlay')?.classList.remove('open');
  };

  /* ── 10. FORMS DROPDOWN (mobile) ─────── */
  function initFormsDropdown() {
    const subNav = $('.form-sub-nav');
    if (!subNav || subNav.querySelector('.form-sub-nav-select')) return;
    const sel = document.createElement('select');
    sel.className = 'form-sub-nav-select';
    $$('.toggle-btn', subNav).forEach(btn => {
      const opt = document.createElement('option');
      opt.value = btn.dataset.form; opt.textContent = btn.textContent.trim();
      if (btn.classList.contains('on')) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => { if (typeof switchForm !== 'undefined') switchForm(sel.value); });
    subNav.appendChild(sel);
  }

  /* ── 11. PARTICIPANTES FILTROS ────────── */
  function setupPartFilters() {
    function activate(group, btn) {
      $$(`[data-pf-${group}]`).forEach(b => b.classList.remove('on'));
      btn.classList.add('on'); applyPartFilters();
    }
    $$('[data-pf-gender]').forEach(b => b.addEventListener('click', () => activate('gender', b)));
    $$('[data-pf-age]').forEach(b    => b.addEventListener('click', () => activate('age', b)));
  }
  window.applyPartFilters = function() {
    const g = $('[data-pf-gender].on')?.dataset.pfGender || '';
    const a = $('[data-pf-age].on')?.dataset.pfAge    || '';
    $$('.part-card').forEach(card => {
      let show = true;
      if (g) show = (card.dataset.gender||'').toUpperCase() === g;
      if (a && show) {
        const age = parseInt(card.dataset.age||0);
        if (a==='young' && age>=26) show=false;
        if (a==='mid'   && (age<26||age>40)) show=false;
        if (a==='senior'&& age<=40) show=false;
      }
      card.style.display = show ? '' : 'none';
    });
  };

  /* ── 12. ANALISAR LABELS CURTOS ────────── */
  function applyAnalyzeLabels() {
    if (!isMobile()) return;
    const map = { individual:'Individual', comparative:'Grupos', correlations:'Correl.' };
    $$('[data-abt]').forEach(btn => { if (map[btn.dataset.abt]) btn.textContent = map[btn.dataset.abt]; });
  }

  /* ── INIT ─────────────────────────────── */
  function init() {
    const sidenav   = $('.sidenav');
    const drawerNav = $('#mobile-drawer-nav');
    if (sidenav)   buildSubmenus(sidenav, false);
    if (drawerNav) buildSubmenus(drawerNav, true);
    setupPartFilters();
    applyAnalyzeLabels();
    syncVizTopbar();
    initFormsDropdown();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
