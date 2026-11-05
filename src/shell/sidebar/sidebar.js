import { createIcon } from '../../ui/icon/icon.js';
import { createIconButton } from '../../ui/button/button.js';

const THEME_LABELS = Object.freeze({
  light: 'Світла',
  dark: 'Темна',
  system: 'Системна',
});

const THEME_ICONS = Object.freeze({
  light: 'sun',
  dark: 'moon',
  system: 'monitor',
});

function shouldInterceptNavigation(event) {
  return !event.defaultPrevented && event.button === 0 &&
    !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function createSidebarLink(page, onNavigate) {
  const link = document.createElement('a');
  link.href = page.route;
  link.className = 'pg-sidebar__link';
  link.setAttribute('aria-label', page.title);
  link.title = page.title;
  link.append(createIcon(page.navigation.icon));

  const text = document.createElement('span');
  text.className = 'pg-sidebar__link-text';
  text.textContent = page.title;
  link.append(text);
  link.addEventListener('click', event => {
    if (!shouldInterceptNavigation(event)) return;
    event.preventDefault();
    onNavigate(page.route);
  });
  return link;
}

export function createSidebar({ pages, onToggle, onNavigate, onCycleTheme }) {
  const sidebar = document.createElement('aside');
  sidebar.id = 'pg-sidebar-panel';
  sidebar.className = 'pg-sidebar';
  sidebar.setAttribute('aria-label', 'Головна навігація');

  const top = document.createElement('div');
  top.className = 'pg-sidebar__top';

  const toggle = createIconButton({
    label: 'Згорнути навігацію',
    icon: 'panel-left',
    action: 'sidebar-toggle',
    onClick: onToggle,
  });
  toggle.classList.add('pg-sidebar__toggle', 'pg-icon-button--corner');
  toggle.setAttribute('aria-controls', 'pg-sidebar-panel');

  const brand = document.createElement('a');
  brand.href = '/';
  brand.className = 'pg-sidebar__brand';
  brand.setAttribute('aria-label', 'Pinguin — на головну');
  brand.textContent = 'pinguin';
  brand.addEventListener('click', event => {
    if (!shouldInterceptNavigation(event)) return;
    event.preventDefault();
    onNavigate('/');
  });
  top.append(toggle, brand);

  const nav = document.createElement('nav');
  nav.className = 'pg-sidebar__nav';
  nav.setAttribute('aria-label', 'Інструменти');

  const links = new Map();
  for (const page of pages) {
    const link = createSidebarLink(page, onNavigate);
    links.set(page.route, link);
    nav.append(link);
  }

  const bottom = document.createElement('div');
  bottom.className = 'pg-sidebar__bottom';

  const themeButton = createIconButton({
    label: 'Змінити тему',
    icon: 'monitor',
    action: 'theme-cycle',
    onClick: onCycleTheme,
  });
  themeButton.classList.add('pg-sidebar__theme-button', 'pg-icon-button--corner');
  bottom.append(themeButton);
  sidebar.append(top, nav, bottom);

  let displayedTheme = null;

  function setTheme(theme) {
    if (displayedTheme === theme) return;
    displayedTheme = theme;
    themeButton.dataset.pgTheme = theme;
    themeButton.replaceChildren(createIcon(THEME_ICONS[theme]));
    const label = 'Тема: ' + THEME_LABELS[theme];
    themeButton.setAttribute('aria-label', label);
    themeButton.title = label;
  }

  function setActiveRoute(route) {
    for (const [path, link] of links) {
      if (path === route) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  }

  return { element: sidebar, brand, toggleButton: toggle, themeButton, setTheme, setActiveRoute };
}
