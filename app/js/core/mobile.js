/* ══════════════════════════════════════════
   T-MIRIM — mobile.js
   Controla drawer, bottom nav e header mobile.
   Integra com o sistema de navegação existente (nav.js).
══════════════════════════════════════════ */
(function () {
  'use strict';

  const hamburger    = document.getElementById('mobile-hamburger');
  const overlay      = document.getElementById('mobile-drawer-overlay');
  const drawer       = document.getElementById('mobile-drawer');
  const drawerNav    = document.getElementById('mobile-drawer-nav');
  const bottomNav    = document.getElementById('mobile-bottom-nav');
  const btnThemeMob  = document.getElementById('btn-theme-mobile');
  const btnThemeDrw  = document.getElementById('btn-theme-drawer');
  // O botão de tema original (desktop)
  const btnThemeDesk = document.getElementById('btn-theme');

  /* ── Drawer open/close ── */
  function openDrawer() {
    document.body.classList.add('drawer-open');
  }
  function closeDrawer() {
    document.body.classList.remove('drawer-open');
  }

  if (hamburger) hamburger.addEventListener('click', () => {
    document.body.classList.contains('drawer-open') ? closeDrawer() : openDrawer();
  });
  if (overlay) overlay.addEventListener('click', closeDrawer);

  /* ── Sincroniza tema mobile com desktop ── */
  function syncThemeIcon() {
    const isDark = !document.documentElement.classList.contains('light');
    const icon = isDark ? '☀️' : '🌙';
    if (btnThemeMob) btnThemeMob.textContent = icon;
    if (btnThemeDrw) btnThemeDrw.textContent = icon;
  }
  syncThemeIcon();

  function toggleTheme() {
    if (btnThemeDesk) btnThemeDesk.click(); // reusa lógica existente
    setTimeout(syncThemeIcon, 50);
  }
  if (btnThemeMob) btnThemeMob.addEventListener('click', toggleTheme);
  if (btnThemeDrw) btnThemeDrw.addEventListener('click', toggleTheme);

  // Observa mudanças de classe no html para manter ícones sincronizados
  new MutationObserver(syncThemeIcon).observe(
    document.documentElement,
    { attributes: true, attributeFilter: ['class'] }
  );

  /* ── Navegação mobile — drawer e bottom nav ── */
  function navigateTo(page) {
    // Tenta usar a função de navegação existente do nav.js
    if (typeof window.navTo === 'function') {
      window.navTo(page);
    } else {
      // Fallback: replica o comportamento padrão
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const target = document.getElementById('page-' + page);
      if (target) target.classList.add('active');

      // Atualiza tab-btn do desktop
      document.querySelectorAll('.sidenav .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
      });
    }

    // Atualiza tab-btn do drawer
    if (drawerNav) {
      drawerNav.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
      });
    }

    // Atualiza bottom nav
    if (bottomNav) {
      bottomNav.querySelectorAll('.mobile-bottom-nav__item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
      });
    }

    closeDrawer();
  }

  // Drawer nav links
  if (drawerNav) {
    drawerNav.querySelectorAll('.tab-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.page));
    });
  }

  // Bottom nav links
  if (bottomNav) {
    bottomNav.querySelectorAll('.mobile-bottom-nav__item[data-page]').forEach(item => {
      item.addEventListener('click', () => navigateTo(item.dataset.page));
    });
  }

  /* ── Intercepta cliques nos tab-btn do desktop para manter drawer sincronizado ── */
  document.querySelectorAll('.sidenav .tab-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      // Atualiza drawer e bottom nav sem navegar de novo
      if (drawerNav) {
        drawerNav.querySelectorAll('.tab-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.page === page);
        });
      }
      if (bottomNav) {
        bottomNav.querySelectorAll('.mobile-bottom-nav__item').forEach(b => {
          b.classList.toggle('active', b.dataset.page === page);
        });
      }
    });
  });

  /* ── Swipe para fechar o drawer ── */
  let touchStartX = 0;
  document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (document.body.classList.contains('drawer-open') && dx < -60) {
      closeDrawer();
    }
  }, { passive: true });

})();

/* ══════════════════════════════════════════════════════════
   MELHORIAS MOBILE — RODADA 2
══════════════════════════════════════════════════════════ */

/* ── 1. ANALISAR: trunca labels dos botões no mobile ── */
function applyAnalyzeLabels() {
  if (window.innerWidth > 700) return;
  const labels = { individual: 'Individual', comparative: 'Grupos', correlations: 'Correl.' };
  document.querySelectorAll('[data-abt]').forEach(btn => {
    const key = btn.dataset.abt;
    if (labels[key]) btn.textContent = labels[key];
  });
}
document.addEventListener('DOMContentLoaded', applyAnalyzeLabels);

/* ── 2. PARTICIPANTES: filtros de género/idade ── */
(function setupPartFilters() {
  function activate(group, btn) {
    document.querySelectorAll(`[data-pf-${group}]`).forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    filterParticipantCards();
  }
  document.querySelectorAll('[data-pf-gender]').forEach(btn =>
    btn.addEventListener('click', () => activate('gender', btn)));
  document.querySelectorAll('[data-pf-age]').forEach(btn =>
    btn.addEventListener('click', () => activate('age', btn)));

  window.filterParticipantCards = function() {
    const gender = document.querySelector('[data-pf-gender].on')?.dataset.pfGender || '';
    const age    = document.querySelector('[data-pf-age].on')?.dataset.pfAge || '';
    document.querySelectorAll('.part-card').forEach(card => {
      let show = true;
      if (gender) {
        const g = (card.dataset.gender || '').toUpperCase();
        if (g !== gender) show = false;
      }
      if (age && show) {
        const a = parseInt(card.dataset.age || '0');
        if (age === 'young'  && a >= 26) show = false;
        if (age === 'mid'    && (a < 26 || a > 40)) show = false;
        if (age === 'senior' && a <= 40) show = false;
      }
      card.style.display = show ? '' : 'none';
    });
  };
})();

/* ── 3. VISUALIZAR: topbar mobile ── */
(function setupVizMobile() {
  function isMobile() { return window.innerWidth <= 700; }

  function syncTopbar() {
    const plot   = document.getElementById('viz-tb-plot');
    const mobile = document.getElementById('viz-tb-mobile-actions');
    const desktop= document.querySelectorAll('.viz-topbar-section:not(#viz-tb-plot):not(#viz-tb-mobile-actions)');
    if (isMobile()) {
      if (mobile) mobile.style.display = 'flex';
      desktop.forEach(s => s.style.display = 'none');
    } else {
      if (mobile) mobile.style.display = 'none';
      desktop.forEach(s => s.style.display = '');
    }
  }
  window.addEventListener('resize', syncTopbar);
  document.addEventListener('DOMContentLoaded', syncTopbar);
  setTimeout(syncTopbar, 100);

  // Gear mobile → open config popup
  document.getElementById('btn-viz-gear-mobile')?.addEventListener('click', openVizConfigPopup);
  // Export mobile → open export popup
  document.getElementById('btn-download-plots-mobile')?.addEventListener('click', openVizExportPopup);
  // Desktop export → also open export popup
  document.getElementById('btn-download-plots')?.addEventListener('click', function(e) {
    e.stopPropagation();
    openVizExportPopup();
  });
})();

/* ── 4. VIZ CONFIG POPUP ── */
window.openVizConfigPopup = function() {
  document.getElementById('viz-config-popup-overlay').classList.add('open');
  // Sync mobile popup state from desktop controls
  syncDesktopToPopup();
};
window.closeVizConfigPopup = function() {
  document.getElementById('viz-config-popup-overlay').classList.remove('open');
};
document.getElementById('viz-config-popup-overlay')?.addEventListener('click', function(e) {
  if (e.target === this) closeVizConfigPopup();
});

function syncDesktopToPopup() {
  // Métricas
  document.querySelectorAll('[data-metric]').forEach(btn => {
    const m = btn.dataset.metric;
    const mob = document.querySelector(`[data-metric-m="${m}"]`);
    if (mob) mob.classList.toggle('on', btn.classList.contains('on'));
  });
  // Tipo
  document.querySelectorAll('[data-pt]').forEach(btn => {
    const mob = document.querySelector(`[data-pt-m="${btn.dataset.pt}"]`);
    if (mob) mob.classList.toggle('on', btn.classList.contains('on'));
  });
  // Grupos
  document.querySelectorAll('[data-grp]').forEach(btn => {
    const mob = document.querySelector(`[data-grp-m="${btn.dataset.grp}"]`);
    if (mob) mob.classList.toggle('on', btn.classList.contains('on'));
  });
  // Modo
  document.querySelectorAll('[data-dm]').forEach(btn => {
    const mob = document.querySelector(`[data-dm-m="${btn.dataset.dm}"]`);
    if (mob) mob.classList.toggle('on', btn.classList.contains('on'));
  });
  // Checkboxes
  ['chk-plotar-junto','chk-show-names','chk-show-legend'].forEach(id => {
    const desk = document.getElementById(id);
    const mob  = document.getElementById(id + '-m');
    if (desk && mob) mob.checked = desk.checked;
  });
  ['tog-boxplot','tog-timeseries'].forEach(id => {
    const desk = document.getElementById(id);
    const mob  = document.getElementById(id + '-m');
    if (desk && mob) mob.classList.toggle('on', desk.classList.contains('on'));
  });
}

function syncPopupToDesktop() {
  // Métricas
  document.querySelectorAll('[data-metric-m]').forEach(mob => {
    const desk = document.querySelector(`[data-metric="${mob.dataset.metricM}"]`);
    if (desk) desk.classList.toggle('on', mob.classList.contains('on'));
  });
  // Tipo
  document.querySelectorAll('[data-pt-m]').forEach(mob => {
    const desk = document.querySelector(`[data-pt="${mob.dataset.ptM}"]`);
    if (desk) { desk.classList.remove('on'); }
  });
  const activePt = document.querySelector('[data-pt-m].on');
  if (activePt) {
    const desk = document.querySelector(`[data-pt="${activePt.dataset.ptM}"]`);
    if (desk) desk.classList.add('on');
  }
  // Grupos
  document.querySelectorAll('[data-grp-m]').forEach(mob => {
    const desk = document.querySelector(`[data-grp="${mob.dataset.grpM}"]`);
    if (desk) desk.classList.toggle('on', mob.classList.contains('on'));
  });
  // Modo
  document.querySelectorAll('[data-dm-m]').forEach(mob => {
    const desk = document.querySelector(`[data-dm="${mob.dataset.dmM}"]`);
    if (desk) desk.classList.toggle('on', mob.classList.contains('on'));
  });
  // Checkboxes
  ['chk-plotar-junto','chk-show-names','chk-show-legend'].forEach(id => {
    const desk = document.getElementById(id);
    const mob  = document.getElementById(id + '-m');
    if (desk && mob) desk.checked = mob.checked;
  });
  ['tog-boxplot','tog-timeseries'].forEach(id => {
    const desk = document.getElementById(id);
    const mob  = document.getElementById(id + '-m');
    if (desk && mob) desk.classList.toggle('on', mob.classList.contains('on'));
  });
}

// Toggle groups in popup (single-select for tipo/modo)
document.querySelectorAll('[data-pt-m]').forEach(btn =>
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-pt-m]').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
  }));
document.querySelectorAll('[data-dm-m]').forEach(btn =>
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-dm-m]').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
  }));

window.applyVizConfigFromPopup = function() {
  syncPopupToDesktop();
  closeVizConfigPopup();
  document.getElementById('btn-plot')?.click();
};

/* ── 5. VIZ EXPORT POPUP ── */
let _exportFmt = 'svg';

window.openVizExportPopup = function() {
  buildExportList();
  document.getElementById('viz-export-popup-overlay').classList.add('open');
};
window.closeVizExportPopup = function() {
  document.getElementById('viz-export-popup-overlay').classList.remove('open');
};
document.getElementById('viz-export-popup-overlay')?.addEventListener('click', function(e) {
  if (e.target === this) closeVizExportPopup();
});

window.setExportFmt = function(fmt) {
  _exportFmt = fmt;
  document.getElementById('fmt-svg').classList.toggle('active', fmt === 'svg');
  document.getElementById('fmt-png').classList.toggle('active', fmt === 'png');
};

function buildExportList() {
  const list = document.getElementById('viz-export-graph-list');
  if (!list) return;
  list.innerHTML = '';
  const plots = document.querySelectorAll('#plot-area .js-plotly-plot, #plot-area canvas');
  if (!plots.length) {
    list.innerHTML = '<p style="color:var(--textdim);font-size:.85rem;padding:10px">Plote os gráficos primeiro.</p>';
    return;
  }
  plots.forEach((el, i) => {
    const label = el.closest('.viz-metric-block')?.querySelector('.viz-metric-header')?.textContent?.trim()
      || `Gráfico ${i + 1}`;
    const item = document.createElement('div');
    item.className = 'viz-export-graph-item selected';
    item.dataset.plotIndex = i;
    item.innerHTML = `<div class="viz-export-graph-item__check">✓</div><span class="viz-export-graph-item__label">${label}</span>`;
    item.addEventListener('click', () => {
      item.classList.toggle('selected');
    });
    list.appendChild(item);
  });
}

window.selectAllExportGraphs  = () => document.querySelectorAll('.viz-export-graph-item').forEach(el => el.classList.add('selected'));
window.selectNoneExportGraphs = () => document.querySelectorAll('.viz-export-graph-item').forEach(el => el.classList.remove('selected'));

window.doExportSelected = function() {
  const selected = document.querySelectorAll('.viz-export-graph-item.selected');
  const plots    = document.querySelectorAll('#plot-area .js-plotly-plot, #plot-area canvas');
  selected.forEach(item => {
    const i  = parseInt(item.dataset.plotIndex);
    const el = plots[i];
    if (!el) return;
    const label = item.querySelector('.viz-export-graph-item__label').textContent.replace(/\s+/g,'_');
    if (el.classList.contains('js-plotly-plot') && window.Plotly) {
      if (_exportFmt === 'svg') {
        Plotly.downloadImage(el, { format:'svg', filename: label });
      } else {
        Plotly.downloadImage(el, { format:'png', filename: label });
      }
    } else if (el.tagName === 'CANVAS') {
      const a = document.createElement('a');
      a.download = label + '.' + (_exportFmt === 'png' ? 'png' : 'svg');
      a.href = el.toDataURL('image/png');
      a.click();
    }
  });
  closeVizExportPopup();
};

/* ── 6. ASSINATURA FULLSCREEN ── */
let _sigFullCanvas = null;
let _sigFullCtx    = null;
let _sigDrawing    = false;
let _sigLastX = 0, _sigLastY = 0;

window.openSigFullscreen = function() {
  const overlay = document.getElementById('sig-fullscreen-overlay');
  overlay.classList.add('open');
  // Força orientação landscape via CSS (só visual)
  overlay.style.cssText = 'display:flex';
  setTimeout(() => {
    initFullscreenCanvas();
  }, 100);
};

function initFullscreenCanvas() {
  const wrap = document.getElementById('sig-fullscreen-canvas-wrap');
  const canvas = document.getElementById('sig-fullscreen-canvas');
  _sigFullCanvas = canvas;
  canvas.width  = wrap.clientWidth;
  canvas.height = wrap.clientHeight;
  _sigFullCtx = canvas.getContext('2d');
  _sigFullCtx.strokeStyle = '#000';
  _sigFullCtx.lineWidth   = 2.5;
  _sigFullCtx.lineCap     = 'round';
  _sigFullCtx.lineJoin    = 'round';

  // Touch events
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    _sigDrawing = true;
    const t = e.touches[0];
    const r = canvas.getBoundingClientRect();
    _sigLastX = t.clientX - r.left;
    _sigLastY = t.clientY - r.top;
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!_sigDrawing) return;
    const t = e.touches[0];
    const r = canvas.getBoundingClientRect();
    const x = t.clientX - r.left;
    const y = t.clientY - r.top;
    _sigFullCtx.beginPath();
    _sigFullCtx.moveTo(_sigLastX, _sigLastY);
    _sigFullCtx.lineTo(x, y);
    _sigFullCtx.stroke();
    _sigLastX = x; _sigLastY = y;
  }, { passive: false });
  canvas.addEventListener('touchend', () => { _sigDrawing = false; });
  // Mouse
  canvas.addEventListener('mousedown', e => {
    _sigDrawing = true;
    const r = canvas.getBoundingClientRect();
    _sigLastX = e.clientX - r.left; _sigLastY = e.clientY - r.top;
  });
  canvas.addEventListener('mousemove', e => {
    if (!_sigDrawing) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    _sigFullCtx.beginPath();
    _sigFullCtx.moveTo(_sigLastX, _sigLastY);
    _sigFullCtx.lineTo(x, y);
    _sigFullCtx.stroke();
    _sigLastX = x; _sigLastY = y;
  });
  canvas.addEventListener('mouseup', () => { _sigDrawing = false; });
}

window.clearFullscreenSig = function() {
  if (_sigFullCtx && _sigFullCanvas) {
    _sigFullCtx.clearRect(0, 0, _sigFullCanvas.width, _sigFullCanvas.height);
  }
};

window.closeSigFullscreen = function(confirm) {
  if (confirm && _sigFullCanvas) {
    // Transfere a assinatura para o canvas inline original
    const targetWrap = document.getElementById('tcle-sig-canvas-wrap');
    if (targetWrap) {
      targetWrap.style.display = 'block';
      let targetCanvas = targetWrap.querySelector('canvas');
      if (!targetCanvas) {
        targetCanvas = document.createElement('canvas');
        targetCanvas.style.width  = '100%';
        targetCanvas.style.height = '120px';
        targetWrap.appendChild(targetCanvas);
      }
      targetCanvas.width  = _sigFullCanvas.width;
      targetCanvas.height = _sigFullCanvas.height;
      targetCanvas.getContext('2d').drawImage(_sigFullCanvas, 0, 0);
    }
    // Atualiza timestamp
    const ts = document.getElementById('tcle-timestamp');
    if (ts) ts.textContent = 'Assinado por: ' + (document.getElementById('tcle-nome')?.value || '—') + ' em ' + new Date().toLocaleString('pt-BR');
  }
  document.getElementById('sig-fullscreen-overlay').classList.remove('open');
};

/* ── 7. FORMS: dropdown de sub-formulários no mobile ── */
(function setupFormsMobileNav() {
  const subNav = document.querySelector('.form-sub-nav');
  if (!subNav) return;

  // Cria o select mobile
  const sel = document.createElement('select');
  sel.className = 'form-sub-nav-select';
  subNav.querySelectorAll('.toggle-btn').forEach(btn => {
    const opt = document.createElement('option');
    opt.value = btn.dataset.form;
    opt.textContent = btn.textContent.trim();
    if (btn.classList.contains('on')) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    if (typeof switchForm === 'function') switchForm(sel.value);
    // Mantém select em sincronia quando muda pelo botão desktop
    subNav.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.classList.toggle('on', btn.dataset.form === sel.value);
    });
  });
  subNav.appendChild(sel);

  // Observa mudanças nos botões desktop para sincronizar o select
  const observer = new MutationObserver(() => {
    const active = subNav.querySelector('.toggle-btn.on');
    if (active) sel.value = active.dataset.form;
  });
  subNav.querySelectorAll('.toggle-btn').forEach(btn =>
    observer.observe(btn, { attributes: true, attributeFilter: ['class'] }));
})();

/* ── 8. SIDENAV: sub-menus expansíveis (desktop + drawer) ── */
(function setupSubmenus() {
  const submenus = [
    { page: 'forms',   label: '📋 Formulários',     icon: '📋', children: [
      { page: 'forms-tcle',     label: '📄 TCLE',     action: () => { if (typeof switchForm==='function') switchForm('tcle'); } },
      { page: 'forms-anamnese', label: '📝 Anamnese', action: () => { if (typeof switchForm==='function') switchForm('anamnese'); } },
      { page: 'forms-dass21',   label: '🧠 DASS-21',  action: () => { if (typeof switchForm==='function') switchForm('dass21'); } },
    ]},
    { page: 'ritmic',  label: '🥁 Testes Rítmicos', icon: '🥁', children: [
      { page: 'ritmic-tte',   label: '⏱ Tempo Espontâneo', action: () => { if (typeof switchRTest==='function') switchRTest('tte'); } },
      { page: 'ritmic-metro', label: '🎵 Metrônomo',        action: () => {} },
      { page: 'ritmic-sync',  label: '🔄 Sincronização',    action: () => {} },
    ]},
  ];

  function buildSubmenu(navEl) {
    submenus.forEach(sm => {
      const parentBtn = navEl.querySelector(`.tab-btn[data-page="${sm.page}"]`);
      if (!parentBtn) return;

      // Adiciona chevron e classe
      parentBtn.classList.add('tab-btn-has-sub');
      const chev = document.createElement('span');
      chev.className = 'tab-chevron';
      chev.textContent = '›';
      parentBtn.appendChild(chev);

      // Cria sub-menu
      const sub = document.createElement('div');
      sub.className = 'sidenav-submenu';
      sm.children.forEach(child => {
        const btn = document.createElement('button');
        btn.className = 'tab-btn';
        btn.dataset.page = sm.page; // navega para a tab pai
        btn.textContent = child.label;
        btn.addEventListener('click', e => {
          e.stopPropagation();
          // Navega para a tab pai primeiro
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
          parentBtn.classList.add('active');
          document.getElementById('page-' + sm.page)?.classList.add('active');
          // Executa a ação de sub-item
          child.action();
          closeDrawer();
        });
        sub.appendChild(btn);
      });

      parentBtn.parentNode.insertBefore(sub, parentBtn.nextSibling);

      // Toggle sub-menu ao clicar no pai
      parentBtn.addEventListener('click', e => {
        const isOpen = parentBtn.classList.contains('sub-open');
        parentBtn.classList.toggle('sub-open', !isOpen);
        sub.classList.toggle('open', !isOpen);
        e.stopPropagation();
        // Não navega ao clicar em pai com sub-menu — só expande
      }, true); // capture para interceptar antes do nav.js
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Desktop sidenav
    buildSubmenu(document.querySelector('.sidenav'));
    // Mobile drawer
    const drawerNav = document.getElementById('mobile-drawer-nav');
    if (drawerNav) buildSubmenu(drawerNav);
  });
})();
