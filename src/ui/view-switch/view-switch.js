/**
 * PINGUIN NEXT — SHARED VIEW SWITCH
 * Pure two-mode toolbar control. It knows nothing about pages or persistence.
 */
import { createIcon } from '../icon/icon.js';

const VIEW_MODES = Object.freeze({
  table: Object.freeze({ label: 'Таблиця', icon: 'table-2' }),
  tiles: Object.freeze({ label: 'Плитки', icon: 'layout-grid' }),
});

export function createViewSwitch({ modes = ['table', 'tiles'], value = 'table', onChange } = {}) {
  if (!Array.isArray(modes) || !modes.length ||
      modes.some(mode => !Object.hasOwn(VIEW_MODES, mode)) ||
      new Set(modes).size !== modes.length || !modes.includes(value)) {
    throw new TypeError('View switch requires unique supported modes and an initial value');
  }
  const element = document.createElement('div');
  element.className = 'pg-view-switch';
  element.setAttribute('role', 'group');
  element.setAttribute('aria-label', 'Режим перегляду');
  const buttons = new Map();
  let current = value;
  const controller = new AbortController();

  for (const mode of modes) {
    const config = VIEW_MODES[mode];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pg-view-switch__button';
    button.dataset.pgViewMode = mode;
    button.setAttribute('aria-label', config.label);
    button.title = config.label;
    button.setAttribute('aria-pressed', String(mode === current));
    button.append(createIcon(config.icon));
    button.addEventListener('click', () => {
      if (current === mode) return;
      setValue(mode);
      onChange?.(mode);
    }, { signal: controller.signal });
    buttons.set(mode, button);
    element.append(button);
  }

  function setValue(next) {
    if (!buttons.has(next)) throw new RangeError('Unsupported view mode: ' + next);
    current = next;
    for (const [mode, button] of buttons) {
      button.setAttribute('aria-pressed', String(mode === current));
    }
  }

  return Object.freeze({
    element,
    getValue: () => current,
    setValue,
    destroy() { controller.abort(); element.remove(); },
  });
}
