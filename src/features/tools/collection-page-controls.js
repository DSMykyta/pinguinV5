/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — TOOLS COLLECTION PAGE CONTROLS                                                      ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Спільне підключення двох незалежних демо-колекцій до наявних UI та слотів Shell.       ║
 * ║ ЗАЛЕЖНОСТІ: CollectionView API, StoredChoice, Select, SegmentSwitch, Pagination constants.          ║
 * ║ ПУБЛІЧНИЙ API: createCollectionPageControls(config) → bind(collection), callbacks, contexts.         ║
 * ║ ПРИНЦИП: Жодних даних, Shell, нової FAB, пагінації чи анімації; лише композиція існуючих UI.        ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createStoredChoice } from '../../core/preferences.js';
import { createSelect } from '../../ui/select/select.js';
import { createSegmentSwitch } from '../../ui/segment-switch/segment-switch.js';
import { DEFAULT_PAGE_SIZES } from '../../ui/pagination/pagination.js';

export function createCollectionPageControls({
  storageKey, defaultMode, columns, selectedActions, details,
  searchPlaceholder, searchLabel, allPageLabel, pageUnit,
  initialSort = { key: 'name', direction: 'asc' },
} = {}) {
  if (typeof storageKey !== 'string' || !['table', 'tiles'].includes(defaultMode) ||
    !Array.isArray(columns) || !columns.length ||
    !selectedActions?.element || typeof selectedActions.setSelection !== 'function' ||
    !(details instanceof HTMLElement) ||
    [searchPlaceholder, searchLabel, allPageLabel, pageUnit].some(value =>
      typeof value !== 'string' || !value.trim())) {
    throw new TypeError('Collection page controls require a mode, columns, selection and labels');
  }
  const sortable = columns.filter(column => column.sortable !== false);
  if (!initialSort || !sortable.some(column => column.key === initialSort.key) ||
    !['asc', 'desc'].includes(initialSort.direction)) {
    throw new TypeError('Collection page controls require a sortable initial column');
  }
  let storage = null;
  try { storage = window.localStorage; } catch { /* Private browsing stays functional. */ }
  const preference = createStoredChoice({
    storage, key: storageKey, choices: ['table', 'tiles'], defaultValue: defaultMode,
  });
  const densityPreference = createStoredChoice({
    storage, key: storageKey + ':density',
    choices: ['compact', 'comfortable'], defaultValue: 'compact',
  });

  let collection = null;
  const sortBy = createSelect({
    label: 'Сортувати за', placeholder: null, value: initialSort.key,
    options: sortable.map(column => ({ label: column.label, value: column.key })),
    onChange: key => collection?.setSort(key, direction.getValue()),
  });
  const direction = createSegmentSwitch({
    label: 'Напрямок сортування', variant: 'outline', compact: true,
    options: [{ value: 'asc', label: 'А–Я' }, { value: 'desc', label: 'Я–А' }],
    value: initialSort.direction,
    onChange: value => collection?.setSort(sortBy.getValue(), value),
  });

  // This is an instance of the existing SegmentSwitch, never another mode
  // in Shell or a second copy of collection selection/pagination state.
  const densitySwitch = createSegmentSwitch({
    label: 'Щільність відображення', variant: 'outline', compact: true,
    options: [
      { value: 'compact', label: 'Компактно' },
      { value: 'comfortable', label: 'Комфортно' },
    ],
    value: densityPreference.getValue(),
    onChange: next => collection?.setDensity(next),
  });
  const densityControl = document.createElement('div');
  densityControl.className = 'pg-collection-view__density-control';
  const densityLabel = document.createElement('span');
  densityLabel.className = 'pg-collection-view__density-label';
  densityLabel.textContent = 'Щільність';
  densityControl.append(densityLabel, densitySwitch.element);

  const headerActions = document.createElement('div');
  headerActions.className = 'pg-collection-view__header-actions';
  const asideControls = document.createElement('div');
  asideControls.className = 'pg-collection-view__aside-controls';
  details.classList.add('pg-collection-view__aside-detail');
  asideControls.append(sortBy.element, direction.element, densityControl, details);

  function bound() {
    if (!collection) throw new Error('Collection page controls must be bound before use');
    return collection;
  }

  return Object.freeze({
    initialMode: preference.getValue(),
    initialDensity: densityPreference.getValue(),
    initialSort: { ...initialSort },
    headerActions, asideControls,
    bind(instance) {
      if (collection) throw new Error('Collection page controls already bound');
      if (!instance?.headerActions || typeof instance.getPagination !== 'function') {
        throw new TypeError('Expected a CollectionView instance');
      }
      collection = instance;
      headerActions.append(instance.headerActions, selectedActions.element);
    },
    onModeChange: next => preference.setValue(next),
    onDensityChange: next => {
      densitySwitch.setValue(next);
      densityPreference.setValue(next);
    },
    onSortChange: state => {
      sortBy.setValue(state.key);
      direction.setValue(state.direction);
    },
    onSelectionChange: (ids, scope) => selectedActions.setSelection(ids, scope),
    getSearchContext: () => ({
      placeholder: searchPlaceholder, label: searchLabel,
      value: bound().getQuery(), onQuery: query => bound().setQuery(query),
    }),
    getPageFabContext: () => ({
      items: DEFAULT_PAGE_SIZES.map(value => ({
        value: String(value),
        symbol: value === 0 ? '∞' : String(value),
        label: value === 0 ? allPageLabel : value + ' ' + pageUnit,
        selected: () => bound().getPagination().pageSize === value,
      })),
      onSelect: value => bound().setPageSize(Number(value)),
    }),
    destroy() {
      sortBy.destroy();
      direction.destroy();
      densitySwitch.destroy();
      headerActions.remove();
      asideControls.remove();
      collection = null;
    },
  });
}
