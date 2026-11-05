/** Minimal first page. Its mount lifecycle is identical to future modules. */
export function mount(host) {
  const content = document.createElement('div');
  content.className = 'pg-overview';

  const heading = document.createElement('h1');
  heading.className = 'pg-overview__title';
  heading.textContent = 'Робочий простір';
  content.append(heading);
  host.replaceChildren(content);

  return () => host.replaceChildren();
}
