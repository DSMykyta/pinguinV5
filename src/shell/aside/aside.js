import { createIcon } from '../../ui/icon/icon.js';
import { createIconButton } from '../../ui/button/button.js';

const THEMES = [
  { value: 'system', label: 'Системна', icon: 'monitor' },
  { value: 'light', label: 'Світла', icon: 'sun' },
  { value: 'dark', label: 'Темна', icon: 'moon' },
];

function createParagraph(className, content) {
  const p = document.createElement('p');
  p.className = className;
  p.textContent = content;
  return p;
}

export function createAside({ theme, onThemeChange, onClose }) {
  const aside = document.createElement('aside');
  aside.id = 'pg-aside-panel';
  aside.className = 'pg-aside';
  aside.setAttribute('aria-label', 'Контекстна панель');

  const header = document.createElement('div');
  header.className = 'pg-aside__header';

  const heading = document.createElement('h2');
  heading.className = 'pg-aside__heading';
  heading.textContent = 'Контекст';

  const close = createIconButton({
    label: 'Закрити контекстну панель',
    icon: 'x',
    action: 'aside-close',
    onClick: onClose,
  });

  header.append(heading, close);

  const body = document.createElement('div');
  body.className = 'pg-aside__body';

  const intro = document.createElement('section');
  intro.className = 'pg-aside__section';
  intro.append(
    createParagraph('pg-aside__eyebrow', 'ПОТОЧНИЙ ПРОСТІР'),
    createParagraph('pg-aside__section-title', 'Огляд'),
    createParagraph('pg-aside__description',
      'Налаштування простору. Інструменти додаватимуть власні дії сюди.'),
  );

  const options = document.createElement('section');
  options.className = 'pg-aside__section';

  const optionsHeading = document.createElement('h3');
  optionsHeading.className = 'pg-aside__section-title';
  optionsHeading.textContent = 'Вигляд';

  const fieldset = document.createElement('fieldset');
  fieldset.className = 'pg-aside__theme-options';
  const legend = document.createElement('legend');
  legend.className = 'pg-aside__field-label';
  legend.textContent = 'Тема інтерфейсу';
  fieldset.append(legend);

  const inputs = [];
  for (const option of THEMES) {
    const label = document.createElement('label');
    label.className = 'pg-aside__theme-option';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'pg-theme';
    input.value = option.value;
    input.checked = option.value === theme;
    input.addEventListener('change', () => {
      if (input.checked) onThemeChange(option.value);
    });

    label.append(input, createIcon(option.icon), document.createTextNode(option.label));
    fieldset.append(label);
    inputs.push(input);
  }

  options.append(optionsHeading, fieldset);

  const note = document.createElement('section');
  note.className = 'pg-aside__section pg-aside__section--note';
  note.append(
    createParagraph('pg-aside__eyebrow', 'ПРИНЦИП'),
    createParagraph('pg-aside__description',
      'Одна оболонка, різні інструменти.'),
  );

  body.append(intro, options, note);
  aside.append(header, body);

  return {
    element: aside,
    closeButton: close,
    setTheme(value) {
      for (const input of inputs) input.checked = input.value === value;
    },
  };
}
