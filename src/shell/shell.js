import { loadPreferences, savePreferences, SHELL_STORAGE_KEY, LEGACY_THEME_KEY } from '../core/preferences.js';
import { applyTheme, getNextTheme } from '../core/theme.js';
import { createRouter } from '../app/router.js';
import { pageRegistry } from '../app/page-registry.js';
import { createIconButton } from '../ui/button/button.js';
import { createSidebar } from './sidebar/sidebar.js';
import { createAside } from './aside/aside.js';

const NARROW_QUERY = '(max-width: 1080px)';

function createRouteMessage(title, description, onHome) {
  const wrapper = document.createElement('section');
  wrapper.className = 'pg-route-message';

  const heading = document.createElement('h1');
  heading.className = 'pg-route-message__title';
  heading.textContent = title;

  const message = document.createElement('p');
  message.className = 'pg-route-message__description';
  message.textContent = description;

  const home = document.createElement('a');
  home.href = '/';
  home.className = 'pg-route-message__link';
  home.textContent = 'На головну';
  home.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onHome();
  });

  wrapper.append(heading, message, home);
  return wrapper;
}

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
  let activePageCleanup = null;
  let activePageController = null;
  let pageRevision = 0;

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
      preferences.asideOpen = false;
      updateView();
      mobileNavButton.focus();
    },
  });
  mobileNavButton.classList.add('pg-shell__mobile-menu', 'pg-icon-button--corner');
  mobileNavButton.setAttribute('aria-controls', 'pg-sidebar-panel');

  const pageName = document.createElement('span');
  pageName.className = 'pg-shell__page-name';
  pageName.textContent = 'Огляд';
  headingArea.append(mobileNavButton, pageName);

  const headerActions = document.createElement('div');
  headerActions.className = 'pg-shell__header-actions';

  const contextButton = createIconButton({
    label: 'Відкрити контекстне меню',
    icon: 'sliders',
    action: 'aside-toggle',
    onClick: () => {
      preferences.asideOpen = !preferences.asideOpen;
      mobileNavOpen = false;
      updateView();
      contextButton.focus();
    },
  });
  contextButton.classList.add('pg-shell__context-button', 'pg-icon-button--corner');
  contextButton.setAttribute('aria-controls', 'pg-aside-panel');
  contextButton.setAttribute('aria-haspopup', 'true');
  headerActions.append(contextButton);
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
      preferences.asideOpen = false;
      updateView();
      router.navigate(path);
    },
    onCycleTheme() {
      preferences.theme = getNextTheme(preferences.theme);
      persist();
      updateView();
    },
  });

  const aside = createAside();

  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'pg-shell__backdrop';
  backdrop.setAttribute('aria-label', 'Закрити меню');
  backdrop.addEventListener('click', () => {
    mobileNavOpen = false;
    updateView();
    mobileNavButton.focus();
  });

  workspace.append(header, content);
  shell.append(sidebar.element, workspace, aside.element, backdrop);
  host.replaceChildren(shell);

  function persist() {
    savePreferences(storage, preferences);
  }

  function updateView() {
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
  }

  async function displayPage(page) {
    const revision = ++pageRevision;
    activePageController?.abort();
    activePageController = null;
    activePageCleanup?.();
    activePageCleanup = null;

    mobileNavOpen = false;
    preferences.asideOpen = false;
    updateView();

    sidebar.setActiveRoute(page?.route ?? null);
    content.scrollTop = 0;

    if (!page) {
      content.removeAttribute('data-pg-page-type');
      pageName.textContent = 'Не знайдено';
      document.title = 'Сторінку не знайдено · Pinguin';
      content.replaceChildren(createRouteMessage(
        'Сторінку не знайдено',
        'Перевірте адресу або поверніться до робочого простору.',
        () => router.navigate('/'),
      ));
      return;
    }

    content.dataset.pgPageType = page.type;
    pageName.textContent = page.title;
    document.title = page.title + ' · Pinguin';
    content.replaceChildren();

    const controller = new AbortController();
    activePageController = controller;

    try {
      const pageModule = await page.load();
      if (revision !== pageRevision || controller.signal.aborted) return;
      if (typeof pageModule.mount !== 'function') {
        throw new TypeError('Page is missing mount(): ' + page.id);
      }
      const cleanup = pageModule.mount(content, { signal: controller.signal });
      activePageCleanup = typeof cleanup === 'function' ? cleanup : null;
    } catch (error) {
      if (revision !== pageRevision || controller.signal.aborted) return;
      console.error('Page failed to load:', page.id, error);
      content.replaceChildren(createRouteMessage(
        'Не вдалося відкрити сторінку',
        'Спробуйте повернутися на головну.',
        () => router.navigate('/'),
      ));
    }
  }

  const router = createRouter({
    browserWindow: window,
    registry: pageRegistry,
    onChange: displayPage,
  });

  function handleKeydown(event) {
    if (event.key !== 'Escape') return;
    if (preferences.asideOpen) {
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
    if (!preferences.asideOpen) return;
    if (aside.element.contains(event.target) || contextButton.contains(event.target)) return;
    preferences.asideOpen = false;
    updateView();
  }

  function handleMediaChange() {
    mobileNavOpen = false;
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
  router.start();

  return function unmountShell() {
    pageRevision++;
    activePageController?.abort();
    activePageCleanup?.();
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
