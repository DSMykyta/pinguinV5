/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ROUTE MESSAGE                                                                       ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Створює повідомлення 404 і помилки модуля.                                            ║
 * ║ ЗАЛЕЖНОСТІ: DOM, callback повернення.                                                              ║
 * ║ ПУБЛІЧНИЙ API: createRouteMessage().                                                               ║
 * ║ ПРИНЦИП: Без залежностей від router.                                                               ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

export function createRouteMessage(title, description, onHome) {
  const wrapper = document.createElement('section');
  wrapper.className = 'pg-route-message';

  const heading = document.createElement('h1');
  heading.className = 'pg-route-message__title';
  heading.textContent = title;

  const message = document.createElement('p');
  message.className = 'pg-route-message__description';
  message.textContent = description;

  const home = document.createElement('a');
  home.href = '/tools';
  home.className = 'pg-route-message__link';
  home.textContent = 'До інструментів';
  home.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onHome();
  });

  wrapper.append(heading, message, home);
  return wrapper;
}
