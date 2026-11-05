import './style.css';

const app = document.querySelector('#app');

if (app) {
  const heading = document.createElement('h1');
  heading.textContent = 'Pinguin Next';

  const status = document.createElement('p');
  status.className = 'status';
  status.textContent = 'Tabula rasa · work';

  const detail = document.createElement('p');
  detail.className = 'description';
  detail.textContent = 'Чиста основа. Функції й дизайн створюватимемо поступово, після обговорення.';

  app.append(heading, status, detail);
}
