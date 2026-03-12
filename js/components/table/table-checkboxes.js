// js/components/table/table-checkboxes.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE LEGO - CHECKBOXES PLUGIN                        ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Вибір рядків чекбоксами                                     ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Додає можливість вибору рядків через чекбокси.                          ║
 * ║                                                                          ║
 * ║  ФУНКЦІОНАЛЬНІСТЬ:                                                       ║
 * ║  - Чекбокс в кожному рядку                                               ║
 * ║  - "Вибрати всі" в заголовку                                             ║
 * ║  - Інтеграція з batch actions                                            ║
 * ║  - Event delegation для ефективності                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { escapeHtml } from '../../utils/utils-text.js';

/**
 * Плагін чекбоксів
 */
class CheckboxesPlugin {
    constructor(config = {}) {
        this.config = {
            checkboxClass: 'row-checkbox',
            selectAllClass: 'select-all-checkbox',
            onSelect: null,           // Callback при виборі
            batchBar: null,           // Інтеграція з batch actions bar
            ...config
        };

        this.table = null;
        this.state = null;
        this.changeHandler = null;
    }

    /**
     * Ініціалізація плагіна
     */
    init(table, state) {
        this.table = table;
        this.state = state;

        // Модифікуємо конфіг таблиці для додавання чекбоксів
        this.extendTableConfig();

        // Прикріплюємо обробники після рендерингу
        this.state.registerHook('onRender', (container, data) => {
            this.attachHandlers(container, data);
            this.syncCheckboxStates(data);
        }, { plugin: 'checkboxes' });

        // Синхронізуємо з batch bar при зміні вибору
        this.state.registerHook('onSelect', (selectedIds) => {
            this.syncBatchBar(selectedIds);
            if (this.config.onSelect) {
                this.config.onSelect(selectedIds);
            }
        }, { plugin: 'checkboxes' });
    }

    /**
     * Розширити конфіг таблиці
     */
    extendTableConfig() {
        const originalRowActions = this.table.config.rowActions;
        const originalRowActionsHeader = this.table.config.rowActionsHeader;
        const tableId = this.state.getTableId();

        // Додаємо чекбокс до заголовка (перед іншими діями)
        this.table.config.rowActionsHeader = `
            <input type="checkbox"
                   class="${this.config.selectAllClass}"
                   data-table-id="${tableId}">
            ${originalRowActionsHeader || ''}
        `;

        // Додаємо чекбокс до кожного рядка (перед іншими діями)
        this.table.config.rowActions = (row) => {
            const rowId = this.table.config.getRowId(row);
            const isChecked = this.state.isSelected(rowId);
            const originalActions = originalRowActions ? originalRowActions(row) : '';

            return `
                <input type="checkbox"
                       class="${this.config.checkboxClass}"
                       data-row-id="${escapeHtml(rowId)}"
                       data-table-id="${tableId}"
                       ${isChecked ? 'checked' : ''}>
                ${originalActions}
            `;
        };
    }

    /**
     * Прикріпити обробники подій
     */
    attachHandlers(container, currentData) {
        // Видаляємо старий обробник
        if (this.changeHandler) {
            container.removeEventListener('change', this.changeHandler);
        }

        const tableId = this.state.getTableId();

        // Event delegation для чекбоксів
        this.changeHandler = (e) => {
            const target = e.target;

            // Перевіряємо чи це наша таблиця
            if (target.dataset.tableId !== tableId) return;

            // Select all checkbox
            if (target.classList.contains(this.config.selectAllClass)) {
                this.handleSelectAll(target.checked, currentData);
                return;
            }

            // Row checkbox
            if (target.classList.contains(this.config.checkboxClass)) {
                this.handleRowSelect(target.dataset.rowId, target.checked, currentData);
            }
        };

        container.addEventListener('change', this.changeHandler);
    }

    /**
     * Обробити "Вибрати всі"
     */
    handleSelectAll(checked, currentData) {
        const rowIds = currentData.map(row => this.table.config.getRowId(row));

        if (checked) {
            this.state.selectAll(rowIds);
        } else {
            // Знімаємо вибір тільки з поточної сторінки
            rowIds.forEach(id => this.state.deselectRow(id));
        }

        // Оновлюємо візуальний стан
        this.syncCheckboxStates(currentData);
    }

    /**
     * Обробити вибір рядка
     */
    handleRowSelect(rowId, checked, currentData) {
        if (checked) {
            this.state.selectRow(rowId);
        } else {
            this.state.deselectRow(rowId);
        }

        // Оновлюємо стан "select all"
        this.updateSelectAllState(currentData);
    }

    /**
     * Оновити стан "select all" чекбокса
     */
    updateSelectAllState(currentData) {
        const container = this.table.getContainer();
        const selectAll = container.querySelector(`.${this.config.selectAllClass}`);
        if (!selectAll) return;

        const rowIds = currentData.map(row => this.table.config.getRowId(row));
        const selectedOnPage = rowIds.filter(id => this.state.isSelected(id));

        if (selectedOnPage.length === 0) {
            selectAll.checked = false;
            selectAll.indeterminate = false;
        } else if (selectedOnPage.length === rowIds.length) {
            selectAll.checked = true;
            selectAll.indeterminate = false;
        } else {
            selectAll.checked = false;
            selectAll.indeterminate = true;
        }
    }

    /**
     * Синхронізувати візуальний стан чекбоксів
     */
    syncCheckboxStates(currentData) {
        const container = this.table.getContainer();
        const tableId = this.state.getTableId();

        // Синхронізуємо row checkboxes
        container.querySelectorAll(`.${this.config.checkboxClass}[data-table-id="${tableId}"]`).forEach(cb => {
            cb.checked = this.state.isSelected(cb.dataset.rowId);
        });

        // Оновлюємо select all
        this.updateSelectAllState(currentData);
    }

    /**
     * Синхронізувати з batch bar
     */
    syncBatchBar(selectedIds) {
        if (!this.config.batchBar) return;

        const batchBar = typeof this.config.batchBar === 'function'
            ? this.config.batchBar()
            : this.config.batchBar;

        if (!batchBar) return;

        // Очищаємо та встановлюємо новий вибір
        batchBar.deselectAll();
        selectedIds.forEach(id => batchBar.selectItem(id));
    }

    /**
     * Програмно вибрати рядки
     */
    select(rowIds) {
        if (Array.isArray(rowIds)) {
            this.state.selectAll(rowIds);
        } else {
            this.state.selectRow(rowIds);
        }
    }

    /**
     * Програмно зняти вибір
     */
    deselect(rowIds) {
        if (Array.isArray(rowIds)) {
            rowIds.forEach(id => this.state.deselectRow(id));
        } else if (rowIds) {
            this.state.deselectRow(rowIds);
        } else {
            this.state.deselectAll();
        }
    }

    /**
     * Отримати вибрані рядки
     */
    getSelected() {
        return this.state.getSelectedRows();
    }

    /**
     * Перевірити чи рядок вибраний
     */
    isSelected(rowId) {
        return this.state.isSelected(rowId);
    }

    /**
     * Знищити плагін
     */
    destroy() {
        const container = this.table.getContainer();
        if (container && this.changeHandler) {
            container.removeEventListener('change', this.changeHandler);
        }
    }
}

// ==================== LEGO EXPORT ====================

/**
 * LEGO init — створює і підключає CheckboxesPlugin
 * @param {TableCore} table
 * @param {TableState} state
 * @param {Object} config
 * @returns {CheckboxesPlugin}
 */
export function init(table, state, config = {}) {
    const plugin = new CheckboxesPlugin(config);
    plugin.init(table, state);
    return plugin;
}

// ═══════════════════════════════════════════════════════════════════════════
// STANDALONE — Генерік initTableCheckboxes для будь-якої таблиці
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізує чекбокси таблиці з підтримкою пагінації та batch actions.
 *
 * @param {Object} config
 * @param {HTMLElement} config.container — контейнер таблиці
 * @param {string}     config.tabName — ім'я табу (для data-tab matching)
 * @param {Set}        config.selectedSet — Set для збереження вибраних ID
 * @param {string}     config.batchBarId — ID batch actions bar
 * @param {Function}   config.getBatchBar — () => batchBar instance
 * @param {Function}   [config.onSelectionChange] — callback(selectedArray)
 * @returns {Function} cleanup — видаляє event listener
 */
export function initTableCheckboxes({ container, tabName, selectedSet, batchBarId, getBatchBar, onSelectionChange }) {
    const selectAllCheckbox = container.querySelector('.select-all-checkbox');
    const rowCheckboxes = container.querySelectorAll('.row-checkbox');
    if (!selectAllCheckbox || rowCheckboxes.length === 0) return () => {};

    // Отримати ID тільки видимих рядків (без прихованих пагінацією)
    const getVisibleIds = () => [...container.querySelectorAll('.row-checkbox')]
        .filter(cb => !cb.closest('.paginated-hidden'))
        .map(cb => cb.dataset.rowId);

    let pageIds = getVisibleIds();

    // Відновити стан чекбоксів
    rowCheckboxes.forEach(checkbox => {
        checkbox.checked = selectedSet.has(checkbox.dataset.rowId);
    });

    const updateSelectAllState = () => {
        pageIds = getVisibleIds();
        const allSelected = pageIds.length > 0 && pageIds.every(id => selectedSet.has(id));
        const someSelected = pageIds.some(id => selectedSet.has(id));
        selectAllCheckbox.checked = allSelected;
        selectAllCheckbox.indeterminate = someSelected && !allSelected;
    };

    updateSelectAllState();

    // Sync batch bar
    const batchBar = getBatchBar(batchBarId);
    if (batchBar) {
        const batchSelected = new Set(batchBar.getSelected());
        selectedSet.forEach(id => { if (!batchSelected.has(id)) batchBar.selectItem(id); });
        batchSelected.forEach(id => { if (!selectedSet.has(id)) batchBar.deselectItem(id); });
    }

    // Event delegation
    const delegationHandler = (e) => {
        const target = e.target;

        if (target.classList.contains('select-all-checkbox') && target.dataset.tab === tabName) {
            const currentBatchBar = getBatchBar(batchBarId);
            pageIds = getVisibleIds();
            if (target.checked) {
                pageIds.forEach(id => selectedSet.add(id));
                pageIds.forEach(id => {
                    const cb = container.querySelector(`.row-checkbox[data-row-id="${id}"]`);
                    if (cb) cb.checked = true;
                });
                if (currentBatchBar) pageIds.forEach(id => currentBatchBar.selectItem(id));
            } else {
                pageIds.forEach(id => selectedSet.delete(id));
                pageIds.forEach(id => {
                    const cb = container.querySelector(`.row-checkbox[data-row-id="${id}"]`);
                    if (cb) cb.checked = false;
                });
                if (currentBatchBar) pageIds.forEach(id => currentBatchBar.deselectItem(id));
            }
            if (onSelectionChange) onSelectionChange(Array.from(selectedSet));
            return;
        }

        if (target.classList.contains('row-checkbox') && target.dataset.tab === tabName) {
            const rowId = target.dataset.rowId;
            const currentBatchBar = getBatchBar(batchBarId);
            if (target.checked) {
                selectedSet.add(rowId);
                if (currentBatchBar) currentBatchBar.selectItem(rowId);
            } else {
                selectedSet.delete(rowId);
                if (currentBatchBar) currentBatchBar.deselectItem(rowId);
            }

            const visibleIds = getVisibleIds();
            const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedSet.has(id));
            const someSelected = visibleIds.some(id => selectedSet.has(id));
            const selectAll = container.querySelector('.select-all-checkbox');
            if (selectAll) {
                selectAll.checked = allSelected;
                selectAll.indeterminate = someSelected && !allSelected;
            }
            if (onSelectionChange) onSelectionChange(Array.from(selectedSet));
        }
    };

    container.addEventListener('change', delegationHandler);

    // Повертаємо cleanup функцію
    return () => container.removeEventListener('change', delegationHandler);
}

/**
 * Реєстр checkbox handlers — керує lifecycle для кількох табів.
 *
 * @param {Object} config
 * @param {string}   config.pagePrefix — префікс контейнера (напр. 'entities', 'mapper')
 * @param {Function} config.getBatchBar — () => batchBar
 * @param {Function} config.getSelectedSet — (tabName) => Set
 * @param {Function} [config.onSelectionChange] — callback(tabName, selectedArray)
 * @returns {{ init, clear }}
 */
export function createCheckboxRegistry({ pagePrefix, getBatchBar, getSelectedSet, onSelectionChange }) {
    const cleanups = new Map();

    return {
        init(container, tabName) {
            // Cleanup попередній handler для цього табу
            const prev = cleanups.get(tabName);
            if (prev) prev();

            const cleanup = initTableCheckboxes({
                container,
                tabName,
                selectedSet: getSelectedSet(tabName),
                batchBarId: `${pagePrefix}-${tabName}`,
                getBatchBar,
                onSelectionChange: onSelectionChange
                    ? (selected) => onSelectionChange(tabName, selected)
                    : null,
            });

            cleanups.set(tabName, cleanup);
        },

        clear(tabName) {
            if (tabName) {
                const cleanup = cleanups.get(tabName);
                if (cleanup) cleanup();
                cleanups.delete(tabName);
            } else {
                cleanups.forEach(cleanup => cleanup());
                cleanups.clear();
            }
        }
    };
}
