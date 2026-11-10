/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SUPPORT                                                                              ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Shared native field descriptions and errors.                                           ║
 * ║ ЗАЛЕЖНОСТІ: Стандартні API платформи; зовнішніх імпортів немає.                                     ║
 * ║ ПУБЛІЧНИЙ API: createFieldSupport()                                                                 ║
 * ║ ПРИНЦИП: The control and the owner remain independent of this small DOM helper.                     ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

export function createFieldSupport({ id, control, description = '', error = '' } = {}) {
  if (!(control instanceof HTMLElement) || !id) throw new TypeError('Field support needs control and id');
  const element = document.createElement('div');
  element.className = 'pg-field-support';
  const hint = document.createElement('span');
  hint.className = 'pg-field-support__description';
  hint.id = id + '-description';
  const problem = document.createElement('span');
  problem.className = 'pg-field-support__error';
  problem.id = id + '-error';
  problem.setAttribute('role', 'status');
  element.append(hint, problem);

  function sync() {
    const describedBy = [!hint.hidden && hint.id, !problem.hidden && problem.id].filter(Boolean);
    if (describedBy.length) control.setAttribute('aria-describedby', describedBy.join(' '));
    else control.removeAttribute('aria-describedby');
    if (!problem.hidden) control.setAttribute('aria-invalid', 'true');
    else control.removeAttribute('aria-invalid');
    element.hidden = describedBy.length === 0;
  }
  function setDescription(message = '') {
    hint.textContent = String(message ?? '');
    hint.hidden = !hint.textContent;
    sync();
  }
  function setError(message = '') {
    problem.textContent = String(message ?? '');
    problem.hidden = !problem.textContent;
    sync();
  }
  setDescription(description);
  setError(error);
  return Object.freeze({ element, setDescription, setError });
}
