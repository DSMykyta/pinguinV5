// js/common/table/table-sorting.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE LEGO - SORTING PLUGIN                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Сортування колонок                                          ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Додає можливість сортування по колонках з sortable: true.               ║
 * ║  Поведінка ІДЕНТИЧНА до ui-table-controls.js initTableSorting().         ║
 * ║                                                                          ║
 * ║  СЕЛЕКТОРИ (must match ui-table.js output):                              ║
 * ║  - .sortable-header — клікабельний заголовок                             ║
 * ║  - data-sort-key — ключ для сортування                                  ║
 * ║  - .sort-indicator .material-symbols-outlined — іконка                   ║
 * ║  - .sorted-asc / .sorted-desc — CSS класи стану                         ║
 * ║                                                                          ║
 * ║  ТИПИ: string, number, date, boolean, id-number, id-text, product,     ║
 * ║        binding-chip                                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Плагін сортування
 */
class SortingPlugin {
    constructor(config = {}) {
        this.config = {
            defaultDirection: 'asc',
            columnTypes: {},  // { columnId: 'string' | 'number' | 'date' | 'boolean' | 'id-number' | 'id-text' | 'product' }
            onSort: null,     // Custom callback
            ...config
        };

        this.table = null;
        this.state = null;
        this.clickHandler = null;
    }

    /**
     * Ініціалізація плагіна
     */
    init(table, state) {
        this.table = table;
        this.state = state;

        // Відновити збережений стан сортування
        if (this.config.initialSort?.column) {
            this.state.setSort(this.config.initialSort.column, this.config.initialSort.direction);
        }

        // Додаємо обробник після рендерингу
        this.state.registerHook('onRender', () => this.attachHandlers());

        // Оновлюємо індикатори при зміні сортування
        this.state.registerHook('onSort', (column, direction) => {
            this.updateIndicators(column, direction);
        });
    }

    /**
     * Прикріпити обробники подій
     * Event delegation на контейнері (як в ui-table-controls.js)
     */
    attachHandlers() {
        const container = this.table.getContainer();
        if (!container) return;

        // Видаляємо старий обробник
        if (this.clickHandler) {
            container.removeEventListener('click', this.clickHandler);
        }

        // Клік на .sortable-header (як в ui-table-controls.js)
        this.clickHandler = (e) => {
            const header = e.target.closest('.sortable-header');
            if (!header) return;

            // Ігноруємо кліки всередині dropdown
            if (e.target.closest('.dropdown-wrapper')) return;

            const sortKey = header.dataset.sortKey;
            if (!sortKey) return;

            this.handleSort(sortKey);
        };

        container.addEventListener('click', this.clickHandler);

        // Відновлюємо індикатори
        const currentSort = this.state.getSort();
        if (currentSort.column) {
            this.updateIndicators(currentSort.column, currentSort.direction);
        }
    }

    /**
     * Обробити сортування
     * 2-way toggle: asc → desc → asc (як в ui-table-controls.js)
     *
     * Два режими:
     * 1. dataSource mode (як старий initTableSorting): сортує зовнішні дані, onSort(sortedData)
     * 2. Internal mode: сортує state.filteredData, onSort(sortKey, direction, sortedData)
     */
    handleSort(sortKey) {
        const currentSort = this.state.getSort();
        let newDirection;

        if (currentSort.column === sortKey) {
            // 2-way toggle (ідентично ui-table-controls.js)
            newDirection = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            newDirection = this.config.defaultDirection;
        }

        // Оновлюємо стан
        this.state.setSort(sortKey, newDirection);

        // Оновлюємо індикатори
        this.updateIndicators(sortKey, newDirection);

        if (this.config.dataSource) {
            // dataSource mode — сортуємо зовнішні дані (як старий initTableSorting)
            const data = [...this.config.dataSource()];
            this.sortArray(data, sortKey, newDirection);
            if (this.config.onSort) {
                this.config.onSort(data);
            }
        } else {
            // Internal mode — сортуємо state
            this.sortData(sortKey, newDirection);
            if (this.config.onSort) {
                this.config.onSort(sortKey, newDirection, this.state.getFilteredData());
            }
        }
    }

    /**
     * Сортувати масив даних (in-place)
     */
    sortArray(data, columnId, direction) {
        if (!direction) return data;

        const columnType = this.getColumnType(columnId);

        data.sort((a, b) => {
            let aVal = a[columnId];
            let bVal = b[columnId];

            const aEmpty = aVal === '' || aVal === null || aVal === undefined;
            const bEmpty = bVal === '' || bVal === null || bVal === undefined;
            if (aEmpty && bEmpty) return 0;
            if (aEmpty) return 1;
            if (bEmpty) return -1;

            let comparison = 0;

            switch (columnType) {
                case 'id-number':
                case 'id-text':
                    aVal = parseInt((aVal || '').toString().replace(/\D/g, ''), 10) || 0;
                    bVal = parseInt((bVal || '').toString().replace(/\D/g, ''), 10) || 0;
                    comparison = aVal - bVal;
                    break;

                case 'number':
                    comparison = (parseFloat(aVal) || 0) - (parseFloat(bVal) || 0);
                    break;

                case 'date':
                    aVal = this.parseDateValue(aVal);
                    bVal = this.parseDateValue(bVal);
                    comparison = aVal - bVal;
                    break;

                case 'boolean':
                    aVal = (aVal === 'TRUE' || aVal === true || aVal === 1) ? 1 : 0;
                    bVal = (bVal === 'TRUE' || bVal === true || bVal === 1) ? 1 : 0;
                    comparison = aVal - bVal;
                    break;

                case 'product':
                    aVal = ((a.brand || '') + ' ' + (a.name || '')).trim();
                    bVal = ((b.brand || '') + ' ' + (b.name || '')).trim();
                    comparison = aVal.localeCompare(bVal, 'uk', { sensitivity: 'base' });
                    break;

                case 'binding-chip':
                    if (aVal && typeof aVal === 'object' && 'count' in aVal) aVal = aVal.count;
                    if (bVal && typeof bVal === 'object' && 'count' in bVal) bVal = bVal.count;
                    aVal = aVal === '∞' ? Infinity : (parseFloat(aVal) || 0);
                    bVal = bVal === '∞' ? Infinity : (parseFloat(bVal) || 0);
                    comparison = aVal - bVal;
                    break;

                case 'string':
                default:
                    comparison = String(aVal).localeCompare(String(bVal), 'uk', {
                        sensitivity: 'base',
                        numeric: true
                    });
                    break;
            }

            return direction === 'desc' ? -comparison : comparison;
        });

        return data;
    }

    /**
     * Сортувати дані в state
     */
    sortData(columnId, direction) {
        if (!direction) {
            this.state.setFilteredData([...this.state.getData()]);
            return;
        }

        const data = [...this.state.getFilteredData()];
        this.sortArray(data, columnId, direction);
        this.state.setFilteredData(data);
    }

    /**
     * Парсинг значення дати
     */
    parseDateValue(value) {
        if (!value) return 0;
        if (typeof value === 'string' && value.match(/^\d{2}\.\d{2}\.\d{2}$/)) {
            const [day, month, year] = value.split('.');
            const fullYear = parseInt(year, 10) + 2000;
            return new Date(fullYear, parseInt(month, 10) - 1, parseInt(day, 10)).getTime();
        }
        if (typeof value === 'string' && value.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
            const [day, month, year] = value.split('.');
            return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)).getTime();
        }
        return new Date(value).getTime() || 0;
    }

    /**
     * Отримати тип колонки
     */
    getColumnType(columnId) {
        if (this.config.columnTypes[columnId]) {
            return this.config.columnTypes[columnId];
        }
        const column = this.table.config.columns.find(c => c.id === columnId);
        if (column && column.sortType) {
            return column.sortType;
        }
        return 'string';
    }

    /**
     * Оновити візуальні індикатори
     * Ідентично до ui-table-controls.js updateSortIndicators()
     * Селектори: .sortable-header, .sort-indicator .material-symbols-outlined
     * Класи: sorted-asc, sorted-desc
     */
    updateIndicators(activeColumn, direction) {
        const container = this.table.getContainer();
        if (!container) return;

        const headers = container.querySelectorAll('.sortable-header');

        headers.forEach(header => {
            const indicator = header.querySelector('.sort-indicator');
            const sortKey = header.dataset.sortKey;

            // Видалити класи сортування
            header.classList.remove('sorted-asc', 'sorted-desc');

            if (sortKey === activeColumn && direction) {
                header.classList.add(`sorted-${direction}`);
                if (indicator) {
                    const icon = indicator.querySelector('.material-symbols-outlined');
                    if (icon) {
                        icon.textContent = direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
                    }
                }
            } else if (indicator) {
                const icon = indicator.querySelector('.material-symbols-outlined');
                if (icon) {
                    icon.textContent = 'unfold_more';
                }
            }
        });
    }

    /**
     * Програмно встановити сортування
     */
    setSort(columnId, direction) {
        this.state.setSort(columnId, direction);
        if (columnId && direction) {
            this.sortData(columnId, direction);
        }
        this.updateIndicators(columnId, direction);
    }

    /**
     * Отримати поточне сортування
     */
    getSort() {
        return this.state.getSort();
    }

    /**
     * Отримати значення для сортування (статичний метод)
     */
    static getSortValue(item, column, columnType) {
        const value = item[column];

        switch (columnType) {
            case 'id-number':
            case 'id-text':
                return parseInt((value || '').toString().replace(/\D/g, ''), 10) || 0;
            case 'number':
                return parseFloat(value) || 0;
            case 'boolean':
                return (value === 'TRUE' || value === true || value === 1) ? 1 : 0;
            case 'date':
                if (value && typeof value === 'string' && value.match(/^\d{2}\.\d{2}\.\d{2}$/)) {
                    const [day, month, year] = value.split('.');
                    const fullYear = parseInt(year, 10) + 2000;
                    return new Date(fullYear, parseInt(month, 10) - 1, parseInt(day, 10)).getTime();
                }
                if (value && typeof value === 'string' && value.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
                    const [day, month, year] = value.split('.');
                    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)).getTime();
                }
                return new Date(value || 0).getTime();
            case 'product':
                return ((item.brand || '') + ' ' + (item.name || '')).trim();
            case 'binding-chip': {
                let v = value;
                if (v && typeof v === 'object' && 'count' in v) v = v.count;
                return v === '∞' ? Infinity : (parseFloat(v) || 0);
            }
            case 'string':
            default:
                return (value || '').toString().toLowerCase();
        }
    }

    /**
     * Знищити плагін
     */
    destroy() {
        const container = this.table.getContainer();
        if (container && this.clickHandler) {
            container.removeEventListener('click', this.clickHandler);
        }
    }
}

// ==================== LEGO EXPORT ====================

/**
 * LEGO init — створює і підключає SortingPlugin
 * @param {TableCore} table
 * @param {TableState} state
 * @param {Object} config
 * @returns {SortingPlugin}
 */
export function init(table, state, config = {}) {
    const plugin = new SortingPlugin(config);
    plugin.init(table, state);
    return plugin;
}
