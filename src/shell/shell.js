import { loadPreferences, savePreferences } from '../core/preferences.js';
import { createIconButton } from '../ui/button/button.js';
import { createSidebar } from './sidebar/sidebar.js';
import { createAside } from './aside/aside.js';
import { createOverview } from './overview/overview.js';

const NARROW_QUERY = '(max-width: 1080px)';

export function mountShell(host) {
  if (!host) throw new Error('Shell mount target is required');

  const preferences = loadPreferences(window.localStorage);
  const media = window.matchMedia(NARROW_QUERY);
  let mobileNavOpen = false;
  let mobileAsideOpen = false;

  const shell = document.createElement('div');
  shell.className = 'pg-shell';

  const workspace = document.createElement('div');
  workspace.className = 'pg-shell__workspace';

  const header = document.createElement('header');
  header.className = 'pg-shell__header';

  const headingArea = document.createElement('div');
  headingArea.className = 'pg-shell__heading-area';

  const mobileNavButton = createIconButton({
    label: 'Відкрити меню',
    icon: 'menu',
    action: 'mobile-menu-toggle',
    onClick: () => {
      mobileAsideOpen = false;
      mobileNavOpen = !mobileNavOpen;
      updateView();
      if (mobileNavOpen) sidebar.toggleButton.focus();
    },
  });
  mobileNavButton.classList.add('pg-shell__mobile-menu');
  mobileNavButton.setAttribute('aria-controls', 'pg-sidebar-panel');

  const breadcrumb = document.createElement('div');
  breadcrumb.className = 'pg-shell__breadcrumb';
  const breadcrumbParent = document.createElement('span');
  breadcrumbParent.className = 'pg-shell__breadcrumb-parent';
  breadcrumbParent.textContent = 'Простір';
  const separator = document.createElement('span');
  separator.className = 'pg-shell__breadcrumb-separator';
  separator.setAttribute('aria-hidden', 'true');
  separator.textContent = '/';
  const breadcrumbCurrent = document.createElement('span');
  breadcrumbCurrent.textContent = 'Огляд';
  breadcrumb.append(breadcrumbParent, separator, breadcrumbCurrent);
  headingArea.append(mobileNavButton, breadcrumb);

  const headerActions = document.createElement('div');
  headerActions.className = 'pg-shell__header-actions';

  const contextButton = createIconButton({
    label: 'Сховати контекстну панель',
    icon: 'panel-right',
    action: 'aside-toggle',
    onClick: () => {
      if (media.matches) {
        mobileNavOpen = false;
        mobileAsideOpen = !mobileAsideOpen;
      } else {
        preferences.asideOpen = !preferences.asideOpen;
        persist();
      }
      updateView();
      if (mobileAsideOpen) aside.closeButton.focus();
    },
  });
  contextButton.setAttribute('aria-controls', 'pg-aside-panel');
  headerActions.append(contextButton);
  header.append(headingArea, headerActions);

  const content = document.createElement('main');
  content.className = 'pg-shell__content';
  content.id = 'pg-main-content';
  content.setAttribute('tabindex', '-1');
  content.append(createOverview());

  const sidebar = createSidebar({
    onToggle() {
      if (media.matches) {
        mobileNavOpen = false;
        mobileNavButton.focus();
      } else {
        preferences.sidebarCollapsed = !preferences.sidebarCollapsed;
        persist();
      }
      updateView();
    },
    onNavigate() {
      mobileNavOpen = false;
      updateView();
    },
  });

  const aside = createAside({
    theme: preferences.theme,
    onThemeChange(theme) {
      preferences.theme = theme;
      persist();
      updateView();
    },
    onClose() {
      if (media.matches) {
        mobileAsideOpen = false;
      } else {
        preferences.asideOpen = false;
        persist();
      }
      updateView();
      contextButton.focus();
    },
  });

  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'pg-shell__backdrop';
  backdrop.setAttribute('aria-label', 'Закрити відкриту панель');
  backdrop.addEventListener('click', () => {
    mobileNavOpen = false;
    mobileAsideOpen = false;
    updateView();
  });

  workspace.append(header, content);
  shell.append(sidebar.element, workspace, aside.element, backdrop);
  host.replaceChildren(shell);

  function persist() {
    savePreferences(window.localStorage, preferences);
  }

  function updateView() {
    const isNarrow = media.matches;
    const isAsideVisible = isNarrow ? mobileAsideOpen : preferences.asideOpen;
    const isNavVisible = isNarrow ? mobileNavOpen : true;
    const isOverlayOpen = isNarrow && (mobileNavOpen || mobileAsideOpen);

    shell.dataset.pgSidebarState = preferences.sidebarCollapsed ? 'collapsed' : 'expanded';
    shell.dataset.pgAsideState = isAsideVisible ? 'open' : 'closed';
    shell.dataset.pgMobileNav = mobileNavOpen ? 'open' : 'closed';

    document.documentElement.dataset.theme = preferences.theme;
    document.body.dataset.pgOverlay = isOverlayOpen ? 'open' : 'closed';

    aside.element.hidden = !isAsideVisible;
    aside.element.inert = !isAsideVisible;

    sidebar.element.inert = !isNavVisible;
    backdrop.hidden = !isOverlayOpen;

    sidebar.toggleButton.setAttribute('aria-label', isNarrow
      ? 'Закрити меню'
      : preferences.sidebarCollapsed ? 'Розгорнути навігацію' : 'Згорнути навігацію');

    mobileNavButton.setAttribute('aria-expanded', String(mobileNavOpen));
    mobileNavButton.setAttribute('aria-label', mobileNavOpen ? 'Закрити меню' : 'Відкрити меню');
    contextButton.setAttribute('aria-expanded', String(isAsideVisible));
    contextButton.setAttribute('aria-label',
      isAsideVisible ? 'Сховати контекстну панель' : 'Показати контекстну панель');
    aside.setTheme(preferences.theme);
  }

  function handleKeydown(event) {
    if (event.key === 'Escape' && (mobileNavOpen || mobileAsideOpen)) {
      const wasNavOpen = mobileNavOpen;
      mobileNavOpen = false;
      mobileAsideOpen = false;
      updateView();
      (wasNavOpen ? mobileNavButton : contextButton).focus();
    }
  }

  function handleMediaChange() {
    mobileNavOpen = false;
    mobileAsideOpen = false;
    updateView();
  }

  function handleStorage(event) {
    if (event.key !== 'pg:v1:shell:preferences') return;
    Object.assign(preferences, loadPreferences(window.localStorage));
    updateView();
  }

  document.addEventListener('keydown', handleKeydown);
  media.addEventListener('change', handleMediaChange);
  window.addEventListener('storage', handleStorage);
  updateView();

  return function unmountShell() {
    document.removeEventListener('keydown', handleKeydown);
    media.removeEventListener('change', handleMediaChange);
    window.removeEventListener('storage', handleStorage);
    delete document.body.dataset.pgOverlay;
    host.replaceChildren();
  };
}
