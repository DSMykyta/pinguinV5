// js/common/table/table-core.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE LEGO - CORE RENDERER                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Рендеринг HTML структури таблиці                              ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Генерація та оновлення DOM структури таблиці.                           ║
 * ║                                                                          ║
 * ║  ЕКСПОРТОВАНІ КЛАСИ:                                                     ║
 * ║  - TableCore — Базовий клас для рендерингу                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { escapeHtml } from '../../utils/text-utils.js';

/**
 * Базовий клас для рендерингу таблиці
 */
export class TableCore {
    constructor(container, config, tableState) {
        this.container = typeof container === 'string'
            ? document.getElementById(container)
            : container;

        if (!this.container) {
            throw new Error('[TableCore] Container not found');
        }

        this.config = {
            columns: [],
            getRowId: (row) => row.id,
            rowActions: null,           // Function (row) => HTML string
            rowActionsHeader: '',       // HTML for actions column header
            emptyState: {
                icon: 'table_rows',
                message: 'Дані відсутні'
            },
            withContainer: true,        // Wrap in .table-container
            tableClass: 'pseudo-table',
            ...config
        };

        this.state = tableState;
        this.plugins = [];

        // Кешуємо DOM елементи
        this.dom = {
            wrapper: null,
            header: null,
            body: null
        };

        // Ініціалізуємо hooks
        this.state.registerHook('onDataChange', () => this.render());
    }

    /**
     * Додати плагін
     */
    use(plugin) {
        if (plugin && typeof plugin.init === 'function') {
            this.plugins.push(plugin);
            plugin.init(this, this.state);
        }
        return this;
    }

    /**
     * Отримати видимі колонки
     */
    getVisibleColumns() {
        const visibleIds = this.state.getVisibleColumns();
        if (!visibleIds) {
            return this.config.columns;
        }
        return this.config.columns.filter(col => visibleIds.includes(col.id));
    }

    /**
     * Створити HTML заголовка колонки
     */
    renderColumnHeader(column) {
        const classes = ['pseudo-table-cell'];
        if (column.className) classes.push(column.className);
        if (column.sortable) classes.push('sortable');
        if (column.filterable) classes.push('filterable');

        const sortIcon = column.sortable
            ? '<span class="sort-icon material-symbols-outlined">unfold_more</span>'
            : '';

        const filterIcon = column.filterable
            ? '<span class="filter-icon material-symbols-outlined">filter_list</span>'
            : '';

        return `
            <div class="${classes.join(' ')}"
                 data-column="${column.id}"
                 ${column.sortable ? 'data-sortable="true"' : ''}
                 ${column.filterable ? 'data-filterable="true"' : ''}>
                <span class="column-label">${escapeHtml(column.label || column.id)}</span>
                ${sortIcon}
                ${filterIcon}
            </div>
        `;
    }

    /**
     * Створити HTML заголовка таблиці
     */
    renderHeader() {
        const visibleColumns = this.getVisibleColumns();
        const actionsHeader = this.config.rowActionsHeader || this.config.rowActions
            ? `<div class="pseudo-table-cell cell-actions">${this.config.rowActionsHeader || ''}</div>`
            : '';

        const columnsHtml = visibleColumns
            .map(col => this.renderColumnHeader(col))
            .join('');

        return `
            <div class="pseudo-table-header">
                ${actionsHeader}
                ${columnsHtml}
            </div>
        `;
    }

    /**
     * Створити HTML комірки
     */
    renderCell(column, value, row) {
        const classes = ['pseudo-table-cell'];
        if (column.className) classes.push(column.className);

        let content = value;
        if (column.render && typeof column.render === 'function') {
            content = column.render(value, row, column);
        } else if (value === null || value === undefined) {
            content = '-';
        } else {
            content = escapeHtml(String(value));
        }

        return `<div class="${classes.join(' ')}" data-column="${column.id}">${content}</div>`;
    }

    /**
     * Створити HTML рядка
     */
    renderRow(row) {
        const visibleColumns = this.getVisibleColumns();
        const rowId = this.config.getRowId(row);
        const isSelected = this.state.isSelected(rowId);

        const actionsCell = this.config.rowActions
            ? `<div class="pseudo-table-cell cell-actions">${this.config.rowActions(row)}</div>`
            : '';

        const cellsHtml = visibleColumns
            .map(col => this.renderCell(col, row[col.id], row))
            .join('');

        return `
            <div class="pseudo-table-row${isSelected ? ' selected' : ''}" data-row-id="${escapeHtml(rowId)}">
                ${actionsCell}
                ${cellsHtml}
            </div>
        `;
    }

    /**
     * Створити HTML тіла таблиці
     */
    renderBody(data) {
        if (!data || data.length === 0) {
            return this.renderEmptyState();
        }

        return `
            <div class="pseudo-table-body">
                ${data.map(row => this.renderRow(row)).join('')}
            </div>
        `;
    }

    /**
     * Створити HTML порожнього стану
     */
    renderEmptyState() {
        const { icon, message } = this.config.emptyState;
        return `
            <div class="pseudo-table-body">
                <div class="empty-state-container">
                    <span class="material-symbols-outlined empty-state-icon">${icon}</span>
                    <p class="empty-state-message">${escapeHtml(message)}</p>
                </div>
            </div>
        `;
    }

    /**
     * Рендерити всю таблицю
     */
    render(data) {
        const renderData = data || this.state.getPaginatedData() || this.state.getData();

        this.state.runHook('onBeforeRender', renderData);

        const headerHtml = this.renderHeader();
        const bodyHtml = this.renderBody(renderData);

        const tableHtml = `
            <div class="${this.config.tableClass}">
                ${headerHtml}
                ${bodyHtml}
            </div>
        `;

        if (this.config.withContainer) {
            this.container.innerHTML = `<div class="table-container">${tableHtml}</div>`;
        } else {
            this.container.innerHTML = tableHtml;
        }

        // Кешуємо DOM елементи
        this.dom.wrapper = this.container.querySelector(`.${this.config.tableClass}`);
        this.dom.header = this.container.querySelector('.pseudo-table-header');
        this.dom.body = this.container.querySelector('.pseudo-table-body');

        this.state.runHook('onRender', this.container, renderData);

        return this;
    }

    /**
     * Оновити тільки рядки (без заголовка)
     */
    updateRows(data) {
        const renderData = data || this.state.getPaginatedData() || this.state.getData();

        this.state.runHook('onBeforeRender', renderData);

        const bodyHtml = this.renderBody(renderData);

        if (this.dom.body) {
            this.dom.body.outerHTML = bodyHtml;
            this.dom.body = this.container.querySelector('.pseudo-table-body');
        } else {
            // Fallback to full render
            this.render(renderData);
            return this;
        }

        this.state.runHook('onRender', this.container, renderData);

        return this;
    }

    /**
     * Отримати контейнер
     */
    getContainer() {
        return this.container;
    }

    /**
     * Отримати DOM елементи
     */
    getDOM() {
        return this.dom;
    }

    /**
     * Знищити таблицю
     */
    destroy() {
        this.plugins.forEach(plugin => {
            if (typeof plugin.destroy === 'function') {
                plugin.destroy();
            }
        });
        this.state.destroy();
        this.container.innerHTML = '';
    }
}
