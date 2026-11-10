/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — PAGE VIEW                                                                           ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Єдина структура заголовка та робочої області для всіх сторінок.                       ║
 * ║ ЗАЛЕЖНОСТІ: DOM host і спільний файл page.css.                                                     ║
 * ║ ПУБЛІЧНИЙ API: createPageView().                                                                   ║
 * ║ ПРИНЦИП: Модулі керують лише вмістом, геометрією сторінки керує спільний компонент.                ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * A shared page surface used by tools, records and future features.
 * The body accepts module-owned DOM. Only the shared component owns section heading placement.
 */
export function createPageView({ title }) {
  if (typeof title !== 'string' || !title.trim()) {
    throw new TypeError('Page title must be a non-empty string');
  }

  const element = document.createElement('div');
  element.className = 'pg-page';

  const heading = document.createElement('h2');
  heading.className = 'pg-page__title';
  heading.textContent = title;

  const body = document.createElement('div');
  body.className = 'pg-page__body';

  element.append(heading, body);

  return Object.freeze({
    element,
    body,
    setTitle(value) {
      if (typeof value !== 'string' || !value.trim()) {
        throw new TypeError('Page title must be a non-empty string');
      }
      heading.textContent = value;
    },
  });
}
