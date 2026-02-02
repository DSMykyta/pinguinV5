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
 * ║  - Типи сортування: string, number, date, boolean                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Плагін сортування
 */
export class SortingPlugin {
    constructor(config = {}) {
        this.config = {
            defaultDirection: 'asc',
            columnTypes: {},  // { columnId: 'string' | 'number' | 'date' | 'boolean' }
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

            // Обробка null/undefined
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;

            let comparison = 0;

            switch (columnType) {
                case 'number':
                    comparison = Number(aVal) - Number(bVal);
                    break;

                case 'date':
                    comparison = new Date(aVal) - new Date(bVal);
                    break;

                case 'boolean':
                    comparison = (aVal === bVal) ? 0 : (aVal ? -1 : 1);
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
     * Знищити плагін
     */
    destroy() {
        const header = this.table.getDOM().header;
        if (header && this.clickHandler) {
            header.removeEventListener('click', this.clickHandler);
        }
    }
}
