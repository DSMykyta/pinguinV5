import { applyTheme } from '../core/theme.js';

export function createShellView({ shell, sidebar, aside, backdrop, mobileNavButton,
  contextButton, preferences, viewport, systemColor }) {
  return function renderShellView(mobileNavOpen) {
      const isNarrow = viewport.matches;
      const isAsideVisible = preferences.asideOpen;
      const isNavVisible = !isNarrow || mobileNavOpen;
      const isOverlayOpen = isNarrow && mobileNavOpen;
  
      shell.dataset.pgSidebarState = preferences.sidebarCollapsed ? 'collapsed' : 'expanded';
      shell.dataset.pgAsideState = isAsideVisible ? 'open' : 'closed';
      shell.dataset.pgMobileNav = mobileNavOpen ? 'open' : 'closed';
      shell.dataset.pgOverlayState = isOverlayOpen ? 'open' : 'closed';
  
      applyTheme(document.documentElement, preferences.theme, systemColor.matches);
      document.body.dataset.pgOverlay = isOverlayOpen ? 'open' : 'closed';
  
      aside.element.inert = !isAsideVisible;
      aside.element.setAttribute('aria-hidden', String(!isAsideVisible));
      sidebar.element.inert = !isNavVisible;
      sidebar.brand.inert = !isNarrow && preferences.sidebarCollapsed;
  
      backdrop.inert = !isOverlayOpen;
      backdrop.setAttribute('aria-hidden', String(!isOverlayOpen));
  
      sidebar.toggleButton.setAttribute('aria-expanded',
        String(isNarrow ? mobileNavOpen : !preferences.sidebarCollapsed));
      sidebar.toggleButton.setAttribute('aria-label',
        isNarrow ? 'Закрити меню' :
          preferences.sidebarCollapsed ? 'Розгорнути навігацію' : 'Згорнути навігацію');
  
      mobileNavButton.setAttribute('aria-expanded', String(mobileNavOpen));
      mobileNavButton.setAttribute('aria-label',
        mobileNavOpen ? 'Закрити меню' : 'Відкрити меню');
  
      contextButton.setAttribute('aria-expanded', String(isAsideVisible));
      contextButton.setAttribute('aria-label',
        isAsideVisible ? 'Закрити контекстне меню' : 'Відкрити контекстне меню');
  
      sidebar.setTheme(preferences.theme);
  };
}
