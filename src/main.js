import './styles/foundation.css';

const app = document.querySelector('#app');

if (app) {
  const welcome = document.createElement('section');
  welcome.className = 'pg-welcome';

  const heading = document.createElement('h1');
  heading.className = 'pg-welcome__title';
  heading.textContent = 'Pinguin Next';

  const status = document.createElement('p');
  status.className = 'pg-welcome__status';
  status.textContent = 'Tabula rasa · work';

  const description = document.createElement('p');
  description.className = 'pg-welcome__description';
  description.textContent = 'Чиста основа. Функції й дизайн створюватимемо поступово, після обговорення.';

  welcome.append(heading, status, description);
  app.append(welcome);
}
