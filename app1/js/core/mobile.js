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
