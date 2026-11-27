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
    onChange: mode => controls.setMode(mode === 'editor' ? 'editor' : controls.getFormat()),
  });
  switcher.element.classList.add('pg-rich-text-editor__mode-switch');
  const targets = { editor: editorId, html: sourceId };
  for (const radio of switcher.element.querySelectorAll('.pg-segment-switch__radio')) {
    radio.setAttribute('aria-controls', targets[radio.value]);
  }
  const radio = switcher.element.querySelector('.pg-segment-switch__radio[value="html"]');
  const label = radio.nextElementSibling;
  const icon = label.firstElementChild;
  const reel = document.createElement('span');
  reel.className = 'pg-rich-text-editor__format-reel';
  reel.setAttribute('aria-hidden', 'true');
  const track = document.createElement('span');
  track.className = 'pg-rich-text-editor__format-track';
  const md = document.createElement('span');
  md.className = 'pg-rich-text-editor__format-md';
  md.textContent = 'MD';
  track.append(md, icon);
  reel.append(track);
  label.append(reel);
  function sync() {
    const format = controls.getFormat();
    const name = format === 'markdown' ? 'Markdown' : 'HTML';
    radio.setAttribute('aria-label', name);
    label.setAttribute('aria-label', name);
    if (label.title !== name) label.title = name;
    reel.dataset.pgFormat = format;
    switcher.setValue(controls.getMode() === 'editor' ? 'editor' : 'html');
  }
  const unsubscribe = controls.subscribe(sync);
  sync();
  host.append(switcher.element);
  return {
    dispose() {
      unsubscribe();
      switcher.destroy();
    },
  };
}
