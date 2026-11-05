import { createDataRow } from '../../ui/data-row/data-row.js';
import { createIcon } from '../../ui/icon/icon.js';

function createText(tag, className, value) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = value;
  return element;
}

/** The overview shows real product state, never mock or decorative actions. */
export function createOverview() {
  const content = document.createElement('div');
  content.className = 'pg-overview';

  const intro = document.createElement('header');
  intro.className = 'pg-overview__intro';
  intro.append(
    createText('p', 'pg-overview__eyebrow', 'PINGUIN NEXT'),
    createText('h1', 'pg-overview__title', 'Робочий простір'),
    createText('p', 'pg-overview__lead',
      'Спільна оболонка для інструментів. Спочатку — основа, далі функції по одній.'),
  );

  const next = document.createElement('section');
  next.className = 'pg-overview__feature';
  next.setAttribute('aria-labelledby', 'pg-next-title');

  const icon = document.createElement('span');
  icon.className = 'pg-overview__feature-icon';
  icon.append(createIcon('table-2'));

  const featureBody = document.createElement('div');
  featureBody.className = 'pg-overview__feature-body';
  const featureHeading = createText('h2', 'pg-overview__feature-title', 'Таблиці');
  featureHeading.id = 'pg-next-title';
  featureBody.append(
    createText('p', 'pg-overview__feature-label', 'ПЕРШИЙ МОДУЛЬ'),
    featureHeading,
    createText('p', 'pg-overview__feature-description',
      'Генератор HTML та BR для складів товарів. Створимо після завершення базових компонентів.'),
  );
  const featureMeta = createText('span', 'pg-overview__feature-meta', 'У плані');
  next.append(icon, featureBody, featureMeta);

  const process = document.createElement('section');
  process.className = 'pg-overview__process';
  process.setAttribute('aria-labelledby', 'pg-process-title');
  const processHeader = document.createElement('div');
  processHeader.className = 'pg-overview__process-header';
  const processTitle = createText('h2', 'pg-overview__section-title', 'Етапи створення');
  processTitle.id = 'pg-process-title';
  processHeader.append(processTitle, createText('p', 'pg-overview__section-note', 'Поступово, без зайвих компонентів.'));

  const list = document.createElement('div');
  list.className = 'pg-data-list';
  list.append(
    createDataRow({ icon: 'check', title: 'Оболонка', description: 'Навігація, теми та адаптивність', trailing: '01' }),
    createDataRow({ icon: 'sliders', title: 'Спільні компоненти', description: 'Поля, рядки й меню', trailing: '02' }),
    createDataRow({ icon: 'table-2', title: 'Генератор таблиць', description: 'Редактор складу та експортери', trailing: '03' }),
  );

  process.append(processHeader, list);
  content.append(intro, next, process);
  return content;
}
