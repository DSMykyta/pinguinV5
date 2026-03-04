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

import { escapeHtml } from '../../utils/text-utils.js';

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

        // Додаємо чекбокс до заголовка
        this.table.config.rowActionsHeader = `
            <input type="checkbox"
                   class="${this.config.selectAllClass}"
                   data-table-id="${tableId}">
            ${originalRowActionsHeader || ''}
        `;

        // Додаємо чекбокс до кожного рядка
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
