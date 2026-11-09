/**
 * PINGUIN NEXT — DATA COLLECTION DESIGN PREVIEW
 * Fictional Brands records. One shared UI collection, no Brands feature/backend.
 * Its persisted view mode is the same universal choice mechanism as Shell IO.
 */
import { createCollectionView } from '../../ui/collection-view/collection-view.js';
import { createStoredChoice } from '../../core/preferences.js';

const BRAND_NAMES = [
  'Pinguin', 'Nimbus', 'Kraken', 'Aurora', 'Vento', 'Solstice',
  'Alpine Trail', 'Terra Motion', 'North Peak', 'Ocean Wave',
  'Astra Fit', 'Velora', 'Arcus', 'Ridge Runner', 'Athletica',
  'Lumen', 'Orbit Sports', 'Granite', 'Peakline', 'Nova Trail',
  'Mistral', 'Motion Lab', 'Blue Current', 'Sierra', 'Urban Pace',
  'Kinetic', 'Evergreen', 'Aero Pulse', 'Wild Coast', 'Trailcraft',
  'Helio', 'Pulse Gear',
];
const CATEGORIES = [
  'Біг та тренування', 'Взуття', 'Плавання', 'Туризм',
  'Спорядження', 'Одяг та аксесуари',
];
const COUNTRIES = ['Україна', 'Польща', 'Німеччина', 'Чехія', 'Італія'];
const OWNERS = ['М. Коваль', 'О. Левчук', 'І. Мельник', 'Д. Савчук'];
const STATUSES = ['Активний', 'Активний', 'Активний', 'Чернетка', 'Архівний'];
const MARKETS = ['Rozetka', 'Prom.ua', 'Магазин', 'Rozetka, Prom.ua'];

const EXAMPLE_BRANDS = Object.freeze(BRAND_NAMES.map((name, index) => {
  const modified = new Date(Date.UTC(2026, 9, 22 - (index % 20)));
  return Object.freeze({
    id: 'preview-brand-' + (index + 1),
    name,
    category: CATEGORIES[index % CATEGORIES.length],
    products: index === 0 ? 234 : (index * 53 + 27) % 610,
    skus: index === 0 ? 1458 : (index * 137 + 72) % 3200,
    marketplace: MARKETS[index % MARKETS.length],
    country: COUNTRIES[index % COUNTRIES.length],
    status: STATUSES[index % STATUSES.length],
    updated: modified.toISOString().slice(0, 10),
    updatedLabel: new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' }).format(modified),
    manager: OWNERS[index % OWNERS.length],
  });
}));

function node(tag, part, text) {
  const element = document.createElement(tag);
  element.className = 'pg-tools-data-views__' + part;
  if (text !== undefined) element.textContent = String(text);
  return element;
}

function renderStatus(brand) {
  const badge = node('span', 'status', brand.status);
  badge.dataset.pgStatus = brand.status === 'Активний' ? 'active'
    : brand.status === 'Чернетка' ? 'draft' : 'archived';
  return badge;
}

function renderTile(brand) {
  const card = node('article', 'card');
  const picture = node('div', 'tile-preview');
  picture.setAttribute('role', 'img');
  picture.setAttribute('aria-label', 'Умовна заглушка зображення для ' + brand.name);
  const monogram = brand.name.split(' ').map(word => word[0]).slice(0, 2).join('');
  picture.append(node('span', 'monogram', monogram));
  const content = node('div', 'tile-content');
  const firstLine = node('div', 'tile-head');
  firstLine.append(node('strong', 'tile-name', brand.name), renderStatus(brand));
  const category = node('p', 'tile-category', brand.category);
  const facts = node('div', 'tile-facts');
  facts.append(node('span', 'tile-fact', brand.products + ' товарів'),
    node('span', 'tile-fact', brand.country));
  content.append(firstLine, category, facts);
  card.append(picture, content);
  return card;
}

const COLUMNS = Object.freeze([
  { key: 'name', label: 'Бренд', primary: true },
  { key: 'category', label: 'Категорія', muted: true },
  { key: 'products', label: 'Товари', align: 'end' },
  { key: 'skus', label: 'SKU', align: 'end' },
  { key: 'marketplace', label: 'Канали продажу' },
  { key: 'country', label: 'Країна' },
  { key: 'status', label: 'Статус', render: renderStatus },
  { key: 'updated', label: 'Змінено', muted: true,
    render: brand => brand.updatedLabel, sortValue: brand => brand.updated },
  { key: 'manager', label: 'Відповідальний', muted: true },
]);

export function createDataViewsDemo() {
  let storage = null;
  try {
    storage = window.localStorage;
  } catch {
    // Preview remains fully usable if browser storage is denied.
  }
  const viewPreference = createStoredChoice({
    storage, key: 'pg:v1:tools-data-views:view',
    choices: ['table', 'tiles'], defaultValue: 'table',
  });

  const element = node('section', 'root');
  const collection = createCollectionView({
    label: 'Приклад списку брендів',
    rows: EXAMPLE_BRANDS,
    columns: COLUMNS,
    getRowId: row => row.id,
    renderTile,
    modes: ['tiles', 'table'],
    initialMode: viewPreference.getValue(),
    initialSort: { key: 'name', direction: 'asc' },
    onModeChange: view => viewPreference.setValue(view),
  });
  element.append(collection.element);
  return Object.freeze({
    element,
    headerActions: collection.headerActions,
    getMode: collection.getMode,
    destroy() {
      collection.destroy();
      element.remove();
    },
  });
}
