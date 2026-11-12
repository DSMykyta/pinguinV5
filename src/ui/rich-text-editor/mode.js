/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — EDITOR / HTML MODE SWITCH                                                            ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Optional presentation adapter. Receives mode controls; never imports the engine,       ║
 * ║ ЗАЛЕЖНОСТІ: Стандартні API платформи; зовнішніх імпортів немає.                                     ║
 * ║ ПУБЛІЧНИЙ API: mountEditorModeSwitch()                                                              ║
 * ║ ПРИНЦИП: toolbar, HTML parser or any feature. No global event handlers.                             ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */


import { createSegmentSwitch } from '../segment-switch/segment-switch.js';

/** Composition only: all radio semantics, geometry and plate motion are shared. */
export function mountEditorModeSwitch({ host, controls, editorId, sourceId }) {
  const switcher = createSegmentSwitch({
    label: 'Режим текстового редактора',
    options: [
      { value: 'editor', label: 'Редактор', icon: 'file-text', iconOnly: true },
      { value: 'html', label: 'HTML', icon: 'code', iconOnly: true },
    ],
    value: controls.getMode(),
    variant: 'filled',
    compact: true,
    fit: true,
    onChange: mode => controls.setMode(mode),
  });
  switcher.element.classList.add('pg-rich-text-editor__mode-switch');
  const targets = { editor: editorId, html: sourceId };
  for (const radio of switcher.element.querySelectorAll('.pg-segment-switch__radio')) {
    radio.setAttribute('aria-controls', targets[radio.value]);
  }
  const unsubscribe = controls.subscribe(() => switcher.setValue(controls.getMode()));
  host.append(switcher.element);
  return {
    dispose() {
      unsubscribe();
      switcher.destroy();
    },
  };
}
