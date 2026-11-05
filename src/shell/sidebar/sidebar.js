import { createIcon } from '../../ui/icon/icon.js';
import { createIconButton } from '../../ui/button/button.js';

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

export function createSidebar({ onToggle, onNavigate }) {
  const sidebar = document.createElement('aside');
  sidebar.id = 'pg-sidebar-panel';
  sidebar.className = 'pg-sidebar';
  sidebar.setAttribute('aria-label', 'Головна навігація');

  const top = document.createElement('div');
  top.className = 'pg-sidebar__top';

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

  const brandTag = document.createElement('span');
  brandTag.className = 'pg-sidebar__brand-tag';
  brandTag.textContent = 'next';
  brand.append(mark, brandName, brandTag);

  const toggle = createIconButton({
    label: 'Згорнути навігацію',
    icon: 'panel-left',
    action: 'sidebar-toggle',
    onClick: onToggle,
  });
  toggle.classList.add('pg-sidebar__toggle');
  toggle.setAttribute('aria-controls', 'pg-sidebar-panel');

  top.append(brand, toggle);

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

  const status = document.createElement('div');
  status.className = 'pg-sidebar__status';
  status.append(createIcon('layers'));

  const statusText = document.createElement('span');
  statusText.className = 'pg-sidebar__status-label';
  statusText.textContent = 'Нова архітектура';
  status.append(statusText);

  const version = document.createElement('span');
  version.className = 'pg-sidebar__version';
  version.textContent = 'WORK · 0.1';

  bottom.append(status, version);
  sidebar.append(top, nav, bottom);

  return { element: sidebar, toggleButton: toggle };
}
