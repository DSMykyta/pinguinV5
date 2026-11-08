/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — INPUT PREVIEW                                                        ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Живі приклади Input у робочій області «Текст».                         ║
 * ║ ЗАЛЕЖНОСТІ: src/ui/input/input.js.                                                  ║
 * ║ ПУБЛІЧНИЙ API: createInputDemo().                                                   ║
 * ║ ПРИНЦИП: Тестовий контент без зміни Shell та вкладок.                               ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createInput } from '../../ui/input/input.js';

export function createInputDemo() {
  const section = document.createElement('section');
  section.className = 'pg-tools-input-demo';
  section.setAttribute('aria-labelledby', 'pg-tools-input-demo-title');

  const heading = document.createElement('h3');
  heading.id = 'pg-tools-input-demo-title';
  heading.className = 'pg-tools-input-demo__heading';
  heading.textContent = 'Поля вводу';

  const introduction = document.createElement('p');
  introduction.className = 'pg-tools-input-demo__hint';
  introduction.textContent = 'Наведіть курсор або виберіть поле: підпис плавно переміститься на верхню лінію рамки. Введене значення залишає його там.';

  const grid = document.createElement('div');
  grid.className = 'pg-tools-input-demo__grid';

  const fields = [
    createInput({ label: 'Назва товару', name: 'demo-product-name', autocomplete: 'off' }),
    createInput({
      label: 'Електронна пошта', name: 'demo-email', type: 'email',
      placeholder: 'name@example.com', autocomplete: 'email',
    }),
    createInput({ label: 'Бренд', name: 'demo-brand', value: 'Pinguin' }),
    createInput({
      label: 'Артикул', name: 'demo-article', value: 'ABC-123',
      error: 'Цей артикул уже використовується.',
    }),
    createInput({
      label: 'Пошук товарів', name: 'demo-search', variant: 'search',
      placeholder: 'Знайти товар…',
    }),
    createInput({ label: 'Пошук без підказки', name: 'demo-search-empty', variant: 'search' }),
    createInput({
      label: 'Опис поля', name: 'demo-standard', variant: 'standard',
      placeholder: 'Приклад значення', description: 'Постійний підпис для складних форм.',
    }),
    createInput({ label: 'Недоступне поле', name: 'demo-disabled', disabled: true }),
  ];

  for (const field of fields) grid.append(field.element);
  section.append(heading, introduction, grid);
  return section;
}
