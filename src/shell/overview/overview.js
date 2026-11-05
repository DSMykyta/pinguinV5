/**
 * The workspace stays deliberately quiet until its first real tool is ready.
 * No mock controls, roadmap cards or nonfunctional feature buttons.
 */
export function createOverview() {
  const content = document.createElement('div');
  content.className = 'pg-overview';

  const title = document.createElement('h1');
  title.className = 'pg-overview__title';
  title.textContent = 'Робочий простір';

  const detail = document.createElement('p');
  detail.className = 'pg-overview__description';
  detail.textContent = 'Таблиці — перший модуль.';

  content.append(title, detail);
  return content;
}
