/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — WORKSPACE LAYOUT                                                                    ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Ізольована сітка header/nav/canvas/footer/rightRail для великого редактора.            ║
 * ║ ЗАЛЕЖНОСТІ: ../button/button.js, ../icon/icon.js (без Dialog, Shell чи feature).                    ║
 * ║ ПУБЛІЧНИЙ API: createWorkspaceLayout({title,body,status,sections}).                                ║
 * ║ ПРИНЦИП: Лише геометрія й локальна навігація; дані і чотири дії належать власнику.                  ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIconButton } from '../button/button.js';
import { createIcon } from '../icon/icon.js';

let sequence = 0;

export function createWorkspaceLayout({ title, body, status, sections = [] }) {
  if (!(title instanceof HTMLElement) || !(body instanceof HTMLElement)) {
    throw new TypeError('Workspace layout requires title and body elements');
  }
  if (!Array.isArray(sections)) throw new TypeError('Workspace sections must be an array');
  const ids = new Set();
  for (const section of sections) {
    if (!section || typeof section.id !== 'string' || !section.id.trim() ||
        typeof section.label !== 'string' || !section.label.trim() ||
        !(section.element instanceof HTMLElement) || ids.has(section.id)) {
      throw new TypeError('Workspace sections require unique ids, labels and DOM elements');
    }
    if (!body.contains(section.element)) throw new TypeError('Section must be inside the workspace body');
    ids.add(section.id);
  }

  const element = document.createElement('div');
  element.className = 'pg-workspace-layout';
  element.dataset.pgNav = 'expanded';

  const header = document.createElement('header');
  header.className = 'pg-workspace-layout__header';
  const topLeft = document.createElement('div');
  topLeft.className = 'pg-workspace-layout__top-left';
  title.classList.add('pg-workspace-layout__title');
  header.append(topLeft, title);

  const nav = document.createElement('aside');
  nav.className = 'pg-workspace-layout__nav';
  nav.setAttribute('aria-label', 'Розділи редактора');
  const toggle = createIconButton({
    label: 'Згорнути навігацію', icon: 'panel-left', variant: 'mini',
    action: 'workspace-nav-toggle',
    onClick() {
      const expanded = element.dataset.pgNav !== 'expanded';
      element.dataset.pgNav = expanded ? 'expanded' : 'collapsed';
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.setAttribute('aria-label', expanded ? 'Згорнути навігацію' : 'Розгорнути навігацію');
      toggle.dataset.pgTooltip = toggle.getAttribute('aria-label');
    },
  });
  toggle.classList.add('pg-workspace-layout__nav-toggle');
  toggle.setAttribute('aria-controls', 'pg-workspace-nav-' + (++sequence));
  toggle.setAttribute('aria-expanded', 'true');

  const navList = document.createElement('nav');
  navList.id = toggle.getAttribute('aria-controls');
  navList.className = 'pg-workspace-layout__nav-list pg-scrollbar';
  navList.setAttribute('aria-label', 'Розділи редактора');
  nav.append(toggle, navList);

  const canvas = document.createElement('main');
  canvas.className = 'pg-workspace-layout__canvas pg-scrollbar';
  canvas.append(body);

  const footer = document.createElement('footer');
  footer.className = 'pg-workspace-layout__footer';
  const bottomLeft = document.createElement('div');
  bottomLeft.className = 'pg-workspace-layout__bottom-left';
  if (status) {
    status.classList.add('pg-workspace-layout__status');
    footer.append(bottomLeft, status);
  } else footer.append(bottomLeft);

  const rail = document.createElement('div');
  rail.className = 'pg-workspace-layout__rail';
  const topRight = document.createElement('div');
  topRight.className = 'pg-workspace-layout__top-right';
  const bottomRight = document.createElement('div');
  bottomRight.className = 'pg-workspace-layout__bottom-right';
  rail.append(topRight, bottomRight);
  element.append(header, nav, canvas, footer, rail);

  const buttons = new Map();
  let active = sections[0]?.id ?? null;
  function activate(id, focus = false) {
    if (!ids.has(id)) return false;
    active = id;
    for (const section of sections) {
      const selected = section.id === active;
      section.element.hidden = !selected;
      buttons.get(section.id).setAttribute('aria-current', selected ? 'true' : 'false');
    }
    canvas.scrollTop = 0;
    if (focus) buttons.get(id).focus({ preventScroll: true });
    return true;
  }
  for (const section of sections) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pg-workspace-layout__nav-item pg-button pg-button--list-item';
    button.setAttribute('aria-label', section.label);
    button.append(createIcon(section.icon || 'layers'));
    const label = document.createElement('span');
    label.className = 'pg-workspace-layout__nav-label';
    label.textContent = section.label;
    button.append(label);
    button.addEventListener('click', () => activate(section.id));
    buttons.set(section.id, button);
    navList.append(button);
  }
  if (active) activate(active);

  return Object.freeze({
    element, canvas, nav, topLeft, topRight, bottomLeft, bottomRight,
    activate, getActiveSection: () => active,
    destroy() { toggle.remove(); element.remove(); },
  });
}
