import { createIcon } from '../../ui/icon/icon.js';
import { createIconButton } from '../../ui/button/button.js';

const THEME_NAMES = Object.freeze({
  system: 'Системна',
  light: 'Світла',
  dark: 'Темна',
});

const THEME_ICONS = Object.freeze({
  system: 'monitor',
  light: 'sun',
  dark: 'moon',
});

function createSidebarLink() {
  const link = document.createElement('a');
  link.href = '/';
  link.className = 'pg-sidebar__link';
  link.setAttribute('aria-current', 'page');
  link.setAttribute('aria-label', 'Огляд');
  link.title = 'Огляд';
  link.append(createIcon('house'));

  const text = document.createElement('span');
  text.className = 'pg-sidebar__link-text';
  text.textContent = 'Огляд';
  link.append(text);
  return link;
}

export function createSidebar({ onToggle, onNavigate, onCycleTheme }) {
  const sidebar = document.createElement('aside');
  sidebar.id = 'pg-sidebar-panel';
  sidebar.className = 'pg-sidebar';
  sidebar.setAttribute('aria-label', 'Головна навігація');

  const top = document.createElement('div');
  top.className = 'pg-sidebar__top';

  // Four corners: top-left navigation trigger, bottom-left theme trigger.
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
  brand.setAttribute('aria-label', 'Pinguin Next — на головну');
  brand.addEventListener('click', onNavigate);

  const mark = document.createElement('span');
  mark.className = 'pg-sidebar__mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = 'P';

  const brandName = document.createElement('span');
  brandName.className = 'pg-sidebar__brand-label';
  brandName.textContent = 'pinguin';

  brand.append(mark, brandName);
  top.append(toggle, brand);

  const nav = document.createElement('nav');
  nav.className = 'pg-sidebar__nav';
  nav.setAttribute('aria-label', 'Інструменти');

  const group = document.createElement('div');
  group.className = 'pg-sidebar__group';
  group.textContent = 'РОБОЧИЙ ПРОСТІР';
  nav.append(group, createSidebarLink());
  nav.querySelector('a')?.addEventListener('click', onNavigate);

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
    const label = 'Тема: ' + THEME_NAMES[theme] + '. Змінити тему';
    themeButton.setAttribute('aria-label', label);
    themeButton.title = label;
  }

  return { element: sidebar, toggleButton: toggle, themeButton, setTheme };
}
