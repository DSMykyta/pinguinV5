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

export function mountEditorModeSwitch({ host, controls, editorId, sourceId }) {
  const element = document.createElement('div');
  element.className = 'pg-rich-text-editor__mode-switch';
  element.setAttribute('role', 'group');
  element.setAttribute('aria-label', 'Режим текстового редактора');
  const controller = new AbortController();
  const buttons = [
    { mode: 'editor', text: 'Редактор', target: editorId },
    { mode: 'html', text: 'HTML', target: sourceId },
  ].map(({ mode, text, target }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pg-rich-text-editor__mode';
    button.dataset.pgMode = mode;
    button.textContent = text;
    button.setAttribute('aria-controls', target);
    button.setAttribute('aria-pressed', String(controls.getMode() === mode));
    button.addEventListener('click', () => controls.setMode(mode), { signal: controller.signal });
    element.append(button);
    return { mode, button };
  });
  const sync = () => {
    for (const { mode, button } of buttons) {
      button.setAttribute('aria-pressed', String(controls.getMode() === mode));
    }
  };
  const unsubscribe = controls.subscribe(sync);
  host.append(element);
  return { dispose() { unsubscribe(); controller.abort(); element.remove(); } };
}
