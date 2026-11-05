/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHELL ORCHESTRATOR                                                                  ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Зв'язує панелі, Router, outlet та стан.                                               ║
 * ║ ЗАЛЕЖНОСТІ: core, app, sidebar, aside, shell-view.                                                 ║
 * ║ ПУБЛІЧНИЙ API: mountShell().                                                                       ║
 * ║ ПРИНЦИП: П'ять глобальних зон; жодних інструментів або їхніх стилів.                                                   ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { loadPreferences, savePreferences, SHELL_STORAGE_KEY, LEGACY_THEME_KEY } from '../core/preferences.js';
import { applyTheme, getNextTheme } from '../core/theme.js';
import { createShellView } from './shell-view.js';
import { createPageOutlet } from './page-outlet.js';
import { createRouter } from '../app/router.js';
import { pageRegistry } from '../app/page-registry.js';
import { createIconButton } from '../ui/button/button.js';
import { createSidebar } from './sidebar/sidebar.js';
import { createAside } from './aside/aside.js';
import { createAsideFab } from './aside/fab.js';
import { createSearch } from './search/search.js';

const NARROW_QUERY = '(max-width: 1080px)';

export function mountShell(host) {
  if (!host) throw new Error('Shell mount target is required');

  let storage = null;
  try {
    storage = window.localStorage;
  } catch {
    // The shell still works when browser privacy settings block storage.
  }

  const preferences = loadPreferences(storage);
  const viewport = window.matchMedia(NARROW_QUERY);
  const systemColor = window.matchMedia('(prefers-color-scheme: dark)');
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
    icon: 'panel-left',
    action: 'mobile-menu-toggle',
    onClick: () => {
      mobileNavOpen = !mobileNavOpen;
      mobileAsideOpen = false;
      if (!preferences.asidePinned) preferences.asideOpen = false;
      updateView();
      mobileNavButton.focus();
    },
  });
  mobileNavButton.classList.add('pg-shell__mobile-menu', 'pg-icon-button--corner');
  mobileNavButton.setAttribute('aria-controls', 'pg-sidebar-panel');

  const pageName = document.createElement('h1');
  pageName.className = 'pg-shell__page-name';
  pageName.textContent = 'Інструменти';
  headingArea.append(mobileNavButton, pageName);

  // Global secondary navigation below the page title, for every route.
  const localNavigation = document.createElement('div');
  localNavigation.className = 'pg-shell__local-nav';
  localNavigation.id = 'pg-local-navigation';

  const headerActions = document.createElement('div');
  headerActions.className = 'pg-shell__header-actions';

  const contextButton = createIconButton({
    label: 'Відкрити контекстне меню',
    icon: 'sliders',
    action: 'aside-toggle',
    onClick: () => {
      search.close();
      if (viewport.matches) {
        mobileAsideOpen = !mobileAsideOpen;
      } else if (preferences.asidePinned) {
        preferences.asidePinned = false;
        preferences.asideOpen = false;
        persist();
      } else {
        preferences.asideOpen = !preferences.asideOpen;
      }
      mobileNavOpen = false;
      updateView();
      contextButton.focus();
    },
  });
  contextButton.classList.add('pg-shell__context-button', 'pg-icon-button--corner');
  contextButton.setAttribute('aria-controls', 'pg-aside-panel');
  contextButton.setAttribute('aria-haspopup', 'true');
  const search = createSearch({
    onOpen() {
      mobileNavOpen = false;
      mobileAsideOpen = false;
      if (!preferences.asidePinned) preferences.asideOpen = false;
      updateView();
    },
  });
  headerActions.append(search.element, contextButton);
  header.append(headingArea, headerActions);

  const content = document.createElement('main');
  content.className = 'pg-shell__content';
  content.id = 'pg-main-content';
  content.setAttribute('tabindex', '-1');

  // The sidebar only renders registered, functional pages.
  const sidebar = createSidebar({
    pages: pageRegistry.getNavigation(),
    onToggle() {
      if (viewport.matches) {
        mobileNavOpen = false;
        mobileNavButton.focus();
      } else {
        preferences.sidebarCollapsed = !preferences.sidebarCollapsed;
        persist();
      }
      updateView();
    },
    onNavigate(path) {
      mobileNavOpen = false;
      mobileAsideOpen = false;
      if (!preferences.asidePinned) preferences.asideOpen = false;
      updateView();
      router.navigate(path);
    },
    onCycleTheme() {
      preferences.theme = getNextTheme(preferences.theme);
      persist();
      updateView();
    },
  });

  const aside = createAside({
    onPinToggle() {
      if (viewport.matches) return;
      preferences.asidePinned = !preferences.asidePinned;
      preferences.asideOpen = true;
      persist();
      updateView();
    },
  });

  // Persistent fourth corner control, independent from the inert/hidden aside panel.
  const asideFab = createAsideFab();

  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'pg-shell__backdrop';
  backdrop.setAttribute('aria-label', 'Закрити меню');
  backdrop.addEventListener('click', () => {
    mobileNavOpen = false;
    updateView();
    mobileNavButton.focus();
  });

  // Dedicated empty 56px footer rail, aligned to the compact sidebar width.
  const footer = document.createElement('footer');
  footer.className = 'pg-shell__footer';
  footer.setAttribute('aria-hidden', 'true');

  workspace.append(header, localNavigation, content, footer);
  shell.append(sidebar.element, workspace, aside.element, asideFab.element, backdrop);
  host.replaceChildren(shell);

  function persist() {
    savePreferences(storage, preferences);
  }

  const renderShellView = createShellView({
    shell, sidebar, aside, backdrop, mobileNavButton, contextButton,
    preferences, viewport, systemColor,
  });
  function updateView() {
    renderShellView(mobileNavOpen, mobileAsideOpen);
  }

  let pageSearchEntries = [];
  function refreshSearch() {
    const pages = pageRegistry.getNavigation().map(page => ({
      id: 'route:' + page.id,
      label: page.title,
      group: 'Розділ',
      activate: () => router.navigate(page.route),
    }));
    search.setEntries([...pages, ...pageSearchEntries]);
  }

  const pageOutlet = createPageOutlet({
    content, pageName, sidebar, localNavigation,
    onNavigate: path => router.navigate(path),
    onAsideContext: context => {
      aside.setContext(context);
      asideFab.setContext(context);
    },
    onSearchEntries: entries => {
      pageSearchEntries = entries;
      refreshSearch();
    },
    onRouteChange() {
      search.close();
      asideFab.close();
      pageSearchEntries = [];
      refreshSearch();
      mobileNavOpen = false;
      mobileAsideOpen = false;
      if (!preferences.asidePinned) preferences.asideOpen = false;
      updateView();
    },
  });

  const router = createRouter({
    browserWindow: window,
    registry: pageRegistry,
    defaultRoute: '/tools',
    onChange: pageOutlet.displayPage,
  });

  function handleKeydown(event) {
    if (event.key !== 'Escape') return;
    if (asideFab.isOpen()) {
      asideFab.close();
      asideFab.button.focus();
      return;
    }
    if (viewport.matches && mobileAsideOpen) {
      mobileAsideOpen = false;
      updateView();
      contextButton.focus();
    } else if (!viewport.matches && preferences.asideOpen && !preferences.asidePinned) {
      preferences.asideOpen = false;
      updateView();
      contextButton.focus();
    } else if (mobileNavOpen) {
      mobileNavOpen = false;
      updateView();
      mobileNavButton.focus();
    }
  }

  function handlePointerDown(event) {
    if (asideFab.isOpen() && !asideFab.element.contains(event.target)) asideFab.close();
    const isOpen = viewport.matches ? mobileAsideOpen : preferences.asideOpen;
    if (!isOpen || (!viewport.matches && preferences.asidePinned)) return;
    if (aside.element.contains(event.target) || contextButton.contains(event.target)) return;
    if (viewport.matches) mobileAsideOpen = false;
    else preferences.asideOpen = false;
    updateView();
  }

  function handleMediaChange() {
    search.close();
    asideFab.close();
    mobileNavOpen = false;
    mobileAsideOpen = false;
    updateView();
  }

  function handleSystemColorChange() {
    if (preferences.theme === 'system') {
      applyTheme(document.documentElement, 'system', systemColor.matches);
    }
  }

  function handleStorage(event) {
    if (event.key !== SHELL_STORAGE_KEY && event.key !== LEGACY_THEME_KEY) return;
    Object.assign(preferences, loadPreferences(storage));
    updateView();
  }

  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('pointerdown', handlePointerDown);
  viewport.addEventListener('change', handleMediaChange);
  systemColor.addEventListener('change', handleSystemColorChange);
  window.addEventListener('storage', handleStorage);

  updateView();
  refreshSearch();
  router.start();

  return function unmountShell() {
    pageOutlet.dispose();
    search.destroy();
    router.stop();
    document.removeEventListener('keydown', handleKeydown);
    document.removeEventListener('pointerdown', handlePointerDown);
    viewport.removeEventListener('change', handleMediaChange);
    systemColor.removeEventListener('change', handleSystemColorChange);
    window.removeEventListener('storage', handleStorage);
    delete document.body.dataset.pgOverlay;
    host.replaceChildren();
  };
}
