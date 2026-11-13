/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — LOGIN DEMO                                                          ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Два спільні поля та кнопка над tertiary CloudGradient.             ║
 * ║ ЗАЛЕЖНОСТІ: createInput(), createCloudGradient(), існуючий Button CSS.         ║
 * ║ ПУБЛІЧНИЙ API: mount(host).                                                    ║
 * ║ ПРИНЦИП: Локальна валідація, жодного збереження або передачі пароля.             ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createInput } from '../../ui/input/input.js';
import { createPasswordInput } from '../../ui/input/password-input.js';
import { createCloudGradient } from '../../ui/cloud-gradient/cloud-gradient.js';
import './login-demo.css';

export function mount(host) {
  const page = document.createElement('section');
  page.className = 'pg-login-demo';
  page.dataset.pgModule = 'login-demo';
  const scene = document.createElement('div');
  scene.className = 'pg-login-demo__scene';
  const cloud = createCloudGradient({ tone: 'tertiary' });
  cloud.element.classList.add('pg-login-demo__cloud');

  const form = document.createElement('form');
  form.className = 'pg-login-demo__form';
  form.noValidate = true;
  form.setAttribute('aria-label', 'Демонстрація входу');
  const login = createInput({
    id: 'pg-login-demo-username', label: 'Логін',
    name: 'username', autocomplete: 'username', required: true,
    errorPresentation: 'sr-only',
  });
  const password = createPasswordInput({
    id: 'pg-login-demo-password', label: 'Пароль',
    name: 'password', autocomplete: 'current-password', required: true,
    errorPresentation: 'sr-only',
  });
  const button = document.createElement('button');
  button.className = 'pg-button pg-button--primary pg-login-demo__submit';
  button.type = 'submit';
  button.dataset.pgAction = 'login-demo-submit';
  button.textContent = 'Увійти';
  const status = document.createElement('p');
  status.className = 'pg-login-demo__status';
  status.setAttribute('role', 'status');
  status.hidden = true;

  const events = new AbortController();
  function clearStatus() { status.hidden = true; status.textContent = ''; }
  login.input.addEventListener('input', () => {
    login.setError(''); clearStatus();
  }, { signal: events.signal });
  password.input.addEventListener('input', () => {
    password.setError(''); clearStatus();
  }, { signal: events.signal });
  form.addEventListener('submit', event => {
    event.preventDefault();
    clearStatus();
    const hasLogin = Boolean(login.getValue().trim());
    const hasPassword = Boolean(password.getValue());
    login.setError(hasLogin ? '' : 'Вкажіть логін');
    password.setError(hasPassword ? '' : 'Вкажіть пароль');
    if (!hasLogin) { login.focus(); return; }
    if (!hasPassword) { password.focus(); return; }
    status.textContent = 'Демонстрація: форму заповнено. Справжній вхід не виконується.';
    status.hidden = false;
  }, { signal: events.signal });

  form.append(login.element, password.element, button, status);
  scene.append(cloud.element, form);
  page.append(scene);
  host.replaceChildren(page);
  cloud.mount();

  return () => {
    events.abort();
    cloud.destroy();
    login.destroy();
    password.destroy();
    host.replaceChildren();
  };
}
