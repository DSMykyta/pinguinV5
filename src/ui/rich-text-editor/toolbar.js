/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — RICH TEXT TOOLBAR                                                                    ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Компактні контекстні інструменти форматування з керованим розкриттям.                  ║
 * ║ ЗАЛЕЖНОСТІ: ../button/button.js, ../reveal-panel/reveal-panel.js, ../toolbar/toolbar.js.                                   ║
 * ║ ПУБЛІЧНИЙ API: mountEditorToolbar()                                                                 ║
 * ║ ПРИНЦИП: Спільні компоненти та анімації; незалежний від mode, stats, features і Shell.              ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIconButton } from '../button/button.js';
import { createRevealPanel } from '../reveal-panel/reveal-panel.js';
import { configureToolbar } from '../toolbar/toolbar.js';

const ITEMS = Object.freeze([
  { id: 'bold', label: 'Жирний — Ctrl+B', icon: 'format-bold', kind: 'mark' },
  { id: 'italic', label: 'Курсив — Ctrl+I', icon: 'format-italic', kind: 'mark' },
  { id: 'underline', label: 'Підкреслення — Ctrl+U', icon: 'format-underlined', kind: 'mark' },
  { id: 'paragraph', label: 'Абзац', icon: 'format-paragraph', kind: 'block' },
  { id: 'heading-1', label: 'Заголовок H1', icon: 'format-h1', kind: 'block' },
  { id: 'heading', label: 'Заголовок H2', icon: 'format-h2', kind: 'block' },
  { id: 'heading-3', label: 'Заголовок H3', icon: 'format-h3', kind: 'block' },
  { id: 'bullet-list', label: 'Маркований список', icon: 'format-list-bulleted', kind: 'block' },
  { id: 'ordered-list', label: 'Нумерований список', icon: 'format-list-numbered', kind: 'block' },
  { id: 'quote', label: 'Цитата', icon: 'format-quote', kind: 'block' },
  { id: 'undo', label: 'Скасувати — Ctrl+Z', icon: 'undo' },
  { id: 'redo', label: 'Повторити — Ctrl+Shift+Z', icon: 'redo' },
]);

let sequence = 0;

export function mountEditorToolbar({ host, triggerHost, controls, root }) {
  const controller = new AbortController();
  const toolbar = document.createElement('div');
  toolbar.id = 'pg-rich-text-toolbar-' + (++sequence);
  toolbar.className = 'pg-rich-text-editor__toolbar';
  configureToolbar(toolbar, { variant: 'floating', density: 'compact' });
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Форматування тексту');

  let expanded = false;
  let focusedIndex = 0;
  const trigger = createIconButton({
    label: 'Розгорнути форматування',
    icon: 'chevron-right',
    action: 'toggle-formatting',
    variant: 'mini',
    onClick: () => setExpanded(!expanded),
  });
  trigger.classList.add('pg-rich-text-editor__toolbar-toggle');
  trigger.dataset.pgDisclosure = 'true';
  trigger.setAttribute('aria-controls', toolbar.id);
  trigger.setAttribute('aria-expanded', 'false');
  const reveal = createRevealPanel({
    element: toolbar,
    direction: 'top',
    focusTarget: trigger,
    initialVisible: false,
  });

  const buttons = ITEMS.map((item, index) => {
    const button = createIconButton({
      label: item.label,
      icon: item.icon,
      action: item.id,
      variant: 'mini',
      onClick: () => controls.execute(item.id),
    });
    button.tabIndex = index === 0 ? 0 : -1;
    if (item.kind) button.setAttribute('aria-pressed', 'false');
    // Preserve the editable selection when activating with a mouse.
    button.addEventListener('pointerdown', event => event.preventDefault(), { signal: controller.signal });
    toolbar.append(button);
    return { button, item };
  });

  function syncTabStops() {
    buttons.forEach(({ button }, index) => {
      button.tabIndex = index === focusedIndex ? 0 : -1;
    });
  }
  toolbar.addEventListener('focusin', event => {
    const index = buttons.findIndex(({ button }) => button === event.target);
    if (index >= 0) {
      focusedIndex = index;
      syncTabStops();
    }
  }, { signal: controller.signal });
  // A toolbar has one tab stop; arrow keys and Home/End move among enabled actions.
  toolbar.addEventListener('keydown', event => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    const enabled = buttons.map(({ button }, i) => button.disabled ? -1 : i).filter(i => i >= 0);
    if (!enabled.length) return;
    event.preventDefault();
    const active = buttons.findIndex(({ button }) => button === root.ownerDocument.activeElement);
    const current = enabled.indexOf(active);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 :
      (current + (event.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length;
    focusedIndex = enabled[next];
    syncTabStops();
    buttons[focusedIndex].button.focus();
  }, { signal: controller.signal });

  function setExpanded(next) {
    expanded = Boolean(next);
    trigger.setAttribute('aria-expanded', String(expanded));
    const label = expanded ? 'Згорнути форматування' : 'Розгорнути форматування';
    trigger.setAttribute('aria-label', label);
    trigger.dataset.pgTooltip = label;
    reveal.setVisible(expanded);
  }
  function sync() {
    for (const { button, item } of buttons) {
      button.disabled = !controls.isEditable() ||
        ((item.id === 'undo' || item.id === 'redo') && !controls.can(item.id));
      if (item.kind) button.setAttribute('aria-pressed', String(controls.isActive(item.id)));
    }
    if (buttons[focusedIndex].button.disabled) {
      const available = buttons.findIndex(({ button }) => !button.disabled);
      if (available !== -1) focusedIndex = available;
    }
    syncTabStops();
  }

  host.append(toolbar);
  triggerHost.append(trigger);
  const unsubscribe = controls.subscribe(sync);
  root.ownerDocument.addEventListener('selectionchange', sync, { signal: controller.signal });
  sync();
  return {
    dispose() {
      unsubscribe();
      controller.abort();
      reveal.destroy();
      toolbar.remove();
      trigger.remove();
    },
  };
}
