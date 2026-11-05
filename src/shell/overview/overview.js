/**
 * A quiet workspace without decorative roadmaps or placeholder controls.
 * The first real module will replace this view when it is ready.
 */
export function createOverview() {
  const content = document.createElement('div');
  content.className = 'pg-overview';

  const title = document.createElement('h1');
  title.className = 'pg-overview__title';
  title.textContent = 'Робочий простір';

  content.append(title);
  return content;
}
