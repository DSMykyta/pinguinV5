// js/common/table/table-sorting.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE LEGO - SORTING PLUGIN                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Сортування колонок                                          ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Додає можливість сортування по колонках з sortable: true.               ║
 * ║                                                                          ║
 * ║  ФУНКЦІОНАЛЬНІСТЬ:                                                       ║
 * ║  - Клік на заголовок для зміни напрямку сортування                       ║
 * ║  - Візуальні індикатори (стрілки)                                        ║
 * ║  - Типи: string, number, date, boolean, id-number, id-text, product      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Плагін сортування
 */
export class SortingPlugin {
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

        // Додаємо обробник кліку на заголовки
        this.state.registerHook('onRender', () => this.attachHandlers());

        // Оновлюємо індикатори при зміні сортування
        this.state.registerHook('onSort', (column, direction) => {
            this.updateIndicators(column, direction);
        });
    }

    /**
     * Прикріпити обробники подій
     */
    attachHandlers() {
        const header = this.table.getDOM().header;
        if (!header) return;

        // Видаляємо старий обробник
        if (this.clickHandler) {
            header.removeEventListener('click', this.clickHandler);
        }

        // Створюємо новий обробник з event delegation
        this.clickHandler = (e) => {
            const cell = e.target.closest('[data-sortable="true"]');
            if (!cell) return;

            const column = cell.dataset.column;
            this.handleSort(column);
        };

        header.addEventListener('click', this.clickHandler);

        // Відновлюємо індикатори
        const currentSort = this.state.getSort();
        if (currentSort.column) {
            this.updateIndicators(currentSort.column, currentSort.direction);
        }
    }

    /**
     * Обробити сортування
     */
    handleSort(columnId) {
        const currentSort = this.state.getSort();
        let newDirection;

        if (currentSort.column === columnId) {
            // Циклічна зміна напрямку: asc -> desc -> null
            if (currentSort.direction === 'asc') {
                newDirection = 'desc';
            } else if (currentSort.direction === 'desc') {
                newDirection = null;
            } else {
                newDirection = 'asc';
            }
        } else {
            newDirection = this.config.defaultDirection;
        }

        // Оновлюємо стан
        this.state.setSort(newDirection ? columnId : null, newDirection);

        // Сортуємо дані
        this.sortData(columnId, newDirection);

        // Викликаємо custom callback
        if (this.config.onSort) {
            this.config.onSort(columnId, newDirection, this.state.getFilteredData());
        }
    }

    /**
     * Сортувати дані
     */
    sortData(columnId, direction) {
        if (!direction) {
            // Скидаємо сортування до оригінального порядку
            this.state.setFilteredData([...this.state.getData()]);
            return;
        }

        const data = [...this.state.getFilteredData()];
        const columnType = this.getColumnType(columnId);

        data.sort((a, b) => {
            let aVal = a[columnId];
            let bVal = b[columnId];

            // Обробка null/undefined — пусті завжди в кінець
            const aEmpty = aVal === '' || aVal === null || aVal === undefined;
            const bEmpty = bVal === '' || bVal === null || bVal === undefined;
            if (aEmpty && bEmpty) return 0;
            if (aEmpty) return 1;
            if (bEmpty) return -1;

            let comparison = 0;

            switch (columnType) {
                case 'id-number':
                case 'id-text':
                    // Витягти число з рядка типу "ban-000123" або "item-456"
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
                    // Спеціальний тип для сортування товарів по Brand + Name
                    aVal = ((a.brand || '') + ' ' + (a.name || '')).trim();
                    bVal = ((b.brand || '') + ' ' + (b.name || '')).trim();
                    comparison = aVal.localeCompare(bVal, 'uk', { sensitivity: 'base' });
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

        this.state.setFilteredData(data);
    }

    /**
     * Парсинг значення дати (підтримка DD.MM.YY та стандартних форматів)
     */
    parseDateValue(value) {
        if (!value) return 0;
        // Підтримка формату DD.MM.YY (наприклад 20.01.26)
        if (typeof value === 'string' && value.match(/^\d{2}\.\d{2}\.\d{2}$/)) {
            const [day, month, year] = value.split('.');
            const fullYear = parseInt(year, 10) + 2000;
            return new Date(fullYear, parseInt(month, 10) - 1, parseInt(day, 10)).getTime();
        }
        // Підтримка формату DD.MM.YYYY
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
        // Спочатку перевіряємо конфіг плагіна
        if (this.config.columnTypes[columnId]) {
            return this.config.columnTypes[columnId];
        }

        // Потім перевіряємо конфіг колонки
        const column = this.table.config.columns.find(c => c.id === columnId);
        if (column && column.sortType) {
            return column.sortType;
        }

        return 'string';
    }

    /**
     * Оновити візуальні індикатори
     */
    updateIndicators(activeColumn, direction) {
        const header = this.table.getDOM().header;
        if (!header) return;

        // Скидаємо всі індикатори
        header.querySelectorAll('[data-sortable="true"]').forEach(cell => {
            cell.classList.remove('sort-asc', 'sort-desc');
            const icon = cell.querySelector('.sort-icon');
            if (icon) {
                icon.textContent = 'unfold_more';
            }
        });

        // Встановлюємо активний
        if (activeColumn && direction) {
            const activeCell = header.querySelector(`[data-column="${activeColumn}"]`);
            if (activeCell) {
                activeCell.classList.add(`sort-${direction}`);
                const icon = activeCell.querySelector('.sort-icon');
                if (icon) {
                    icon.textContent = direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
                }
            }
        }
    }

    /**
     * Програмно встановити сортування
     */
    setSort(columnId, direction) {
        this.state.setSort(columnId, direction);
        if (columnId && direction) {
            this.sortData(columnId, direction);
        }
    }

    /**
     * Отримати поточне сортування
     */
    getSort() {
        return this.state.getSort();
    }

    /**
     * Отримати значення для сортування (для зовнішнього використання)
     * @param {Object} item - Рядок даних
     * @param {string} column - ID колонки
     * @param {string} columnType - Тип колонки
     * @returns {*} Значення для порівняння
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
            case 'string':
            default:
                return (value || '').toString().toLowerCase();
        }
    }

    /**
     * Знищити плагін
     */
    destroy() {
        const header = this.table.getDOM().header;
        if (header && this.clickHandler) {
            header.removeEventListener('click', this.clickHandler);
        }
    }
}
