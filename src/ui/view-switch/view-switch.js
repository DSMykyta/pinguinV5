/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — VIEW SWITCH ADAPTER                                                                  ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Адаптує режими таблиці й плиток до спільного сегментного перемикача.                   ║
 * ║ ЗАЛЕЖНОСТІ: src/ui/segment-switch/segment-switch.js.                                                ║
 * ║ ПУБЛІЧНИЙ API: createViewSwitch({ modes, value, onChange }).                                        ║
 * ║ ПРИНЦИП: Анімація та вигляд належать segment-switch; стан і збереження — викликачу.                 ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createSegmentSwitch } from '../segment-switch/segment-switch.js';

const MODES = Object.freeze({
  table: { label: 'Таблиця', icon: 'table-2' },
  tiles: { label: 'Плитки', icon: 'layout-grid' },
});

export function createViewSwitch({ modes = ['table', 'tiles'], value = 'table', onChange } = {}) {
  if (!Array.isArray(modes) || modes.length < 2 ||
      modes.some(mode => !Object.hasOwn(MODES, mode)) ||
      new Set(modes).size !== modes.length || !modes.includes(value)) {
    throw new TypeError('View switch needs two unique valid modes and initial value');
  }
  const widget = createSegmentSwitch({
    label: 'Режим перегляду',
    options: modes.map(mode => ({ ...MODES[mode], value: mode, iconOnly: true })),
    value, compact: true, fit: true,
    onChange,
  });
  widget.element.classList.add('pg-view-switch');
  return Object.freeze({
    element: widget.element,
    getValue: widget.getValue,
    setValue: widget.setValue,
    destroy: widget.destroy,
  });
}
