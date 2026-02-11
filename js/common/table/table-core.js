// js/common/table/table-core.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE LEGO - CORE RENDERER                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Рендеринг HTML структури таблиці                              ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Генерація та оновлення DOM структури таблиці.                           ║
 * ║  HTML вихід ІДЕНТИЧНИЙ до ui-table.js createPseudoTable().               ║
 * ║                                                                          ║
 * ║  HTML СТРУКТУРА (must match ui-table.js exactly):                        ║
 * ║  <div class="pseudo-table-container">                                    ║
 * ║    <div class="pseudo-table-header">                                     ║
 * ║      <div class="pseudo-table-cell cell-actions header-actions-cell">    ║
 * ║      <div class="pseudo-table-cell sortable-header filterable"           ║
 * ║           data-sort-key="..." data-column="...">                         ║
 * ║        <span>Label</span>                                                ║
 * ║        <span class="sort-indicator">                                     ║
 * ║          <span class="material-symbols-outlined">unfold_more</span>      ║
 * ║        </span>                                                           ║
 * ║      </div>                                                              ║
 * ║    </div>                                                                ║
 * ║    <div class="pseudo-table-row" data-row-id="...">                      ║
 * ║      <div class="pseudo-table-cell cell-actions">actions</div>           ║
 * ║      <div class="pseudo-table-cell" data-column="..."                    ║
 * ║           data-tooltip="...">content</div>                               ║
 * ║    </div>                                                                ║
 * ║  </div>                                                                  ║
 * ║                                                                          ║
 * ║  ЕКСПОРТОВАНІ КЛАСИ:                                                     ║
 * ║  - TableCore — Базовий клас для рендерингу                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { escapeHtml } from '../../utils/text-utils.js';
import { renderAvatarState } from '../avatar/avatar-ui-states.js';

/**
 * Базовий клас для рендерингу таблиці
 * Генерує HTML ідентичний до ui-table.js createPseudoTable()
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
            getRowId: (row, index) => row.id || row.local_id || row.code || index,
            rowActions: null,           // Function (row) => HTML string
            rowActionsHeader: null,     // HTML for actions column header
            noHeaderSort: false,        // Disable sortable-header class
            onRowClick: null,           // Callback on row click
            onAfterRender: null,        // Callback after render
            emptyState: null,           // { message: 'text' }
            withContainer: true,        // Wrap in .pseudo-table-container
            visibleColumns: null,       // Array of visible column IDs (null = all visible)
            ...config
        };

        this.state = tableState;
        this.plugins = [];
        this.currentData = [];

        // Кешуємо DOM елементи
        this.dom = {
            header: null
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

    // ==================== VISIBILITY ====================

    isColumnVisible(columnId) {
        const visibleCols = this.config.visibleColumns || this.state.getVisibleColumns();
        if (!visibleCols) return true;
        return visibleCols.includes(columnId);
    }

    hiddenClass(columnId) {
        return this.isColumnVisible(columnId) ? '' : ' column-hidden';
    }

    // ==================== HEADER HTML ====================
    // Ідентичний до ui-table.js generateHeaderHTML()

    renderHeader() {
        const { columns, rowActions, rowActionsHeader, noHeaderSort } = this.config;

        return `
            <div class="pseudo-table-header">
                ${rowActions || rowActionsHeader != null ? `
                    <div class="pseudo-table-cell cell-actions header-actions-cell">
                        ${rowActionsHeader || ''}
                    </div>
                ` : ''}
                ${columns.map(col => {
                    const cellClass = col.className || '';
                    const sortableClass = !noHeaderSort && col.sortable ? ' sortable-header' : '';
                    const filterableClass = col.filterable ? ' filterable' : '';

                    const colTypeAttr = col.type ? ` data-col-type="${col.type}"` : '';

                    return `
                        <div class="pseudo-table-cell ${cellClass}${sortableClass}${filterableClass}${this.hiddenClass(col.id)}"
                             ${!noHeaderSort && col.sortable ? `data-sort-key="${col.sortKey || col.id}"` : ''}
                             data-column="${col.id}"${colTypeAttr}>
                            <span>${col.label || col.id}</span>
                            ${!noHeaderSort && col.sortable ? '<span class="sort-indicator"><span class="material-symbols-outlined">unfold_more</span></span>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // ==================== ROW HTML ====================
    // Ідентичний до ui-table.js generateRowHTML()

    renderRow(row, rowIndex) {
        const { columns, rowActions, onRowClick, getRowId } = this.config;
        const rowId = getRowId(row, rowIndex);
        const rowClasses = ['pseudo-table-row'];
        if (onRowClick) rowClasses.push('clickable');

        return `
            <div class="${rowClasses.join(' ')}" data-row-id="${rowId}">
                ${rowActions ? `
                    <div class="pseudo-table-cell cell-actions">
                        ${rowActions(row)}
                    </div>
                ` : ''}
                ${columns.map(col => {
                    const value = row[col.id];
                    const cellClass = col.className || '';
                    const tooltipAttr = col.tooltip !== false && value ?
                        `data-tooltip="${escapeHtml(String(value))}"` : '';

                    let cellContent;
                    if (col.render && typeof col.render === 'function') {
                        cellContent = col.render(value, row);
                    } else {
                        cellContent = escapeHtml(value ?? ' ');
                    }

                    const colTypeAttr = col.type ? ` data-col-type="${col.type}"` : '';

                    return `
                        <div class="pseudo-table-cell ${cellClass}${this.hiddenClass(col.id)}"
                             data-column="${col.id}"${colTypeAttr}
                             ${tooltipAttr}>
                            ${cellContent}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderRows(data) {
        return data.map((row, index) => this.renderRow(row, index)).join('');
    }

    // ==================== EMPTY STATE ====================
    // Ідентичний до ui-table.js — використовує renderAvatarState

    renderEmptyState() {
        const { emptyState } = this.config;
        if (!emptyState) return '';

        const emptyHTML = renderAvatarState('empty', {
            message: emptyState.message || 'Немає даних для відображення',
            size: 'medium',
            containerClass: 'empty-state-container',
            avatarClass: 'empty-state-avatar',
            messageClass: 'avatar-state-message',
            showMessage: true
        });

        return `<div class="pseudo-table-body pseudo-table-empty">${emptyHTML}</div>`;
    }

    // ==================== FULL RENDER ====================
    // Структура: header + rows (без додаткових обгорток!)
    // Обгортка тільки .pseudo-table-container якщо withContainer=true

    render(data) {
        const renderData = data || this.state.getFilteredData() || this.state.getData();
        this.currentData = Array.isArray(renderData) ? renderData : [];

        this.state.runHook('onBeforeRender', this.currentData);

        const headerHTML = this.renderHeader();
        let tableHTML;

        if (this.currentData.length === 0 && this.config.emptyState) {
            tableHTML = headerHTML + this.renderEmptyState();
        } else {
            tableHTML = headerHTML + this.renderRows(this.currentData);
        }

        if (this.config.withContainer) {
            this.container.innerHTML = `<div class="pseudo-table-container">${tableHTML}</div>`;
        } else {
            this.container.innerHTML = tableHTML;
        }

        // Кешуємо DOM елементи
        this.dom.header = this.container.querySelector('.pseudo-table-header');

        // Event handlers
        this.attachEventHandlers();

        // Run hooks (plugins)
        this.state.runHook('onRender', this.container, this.currentData);

        // Legacy callback
        if (this.config.onAfterRender) {
            this.config.onAfterRender(this.container, this.currentData);
        }

        return this;
    }

    // ==================== UPDATE ROWS ====================
    // Ідентичний до ui-table.js updateRows() — видаляє рядки, вставляє після header

    updateRows(data) {
        const renderData = data || this.state.getFilteredData() || this.state.getData();
        this.currentData = Array.isArray(renderData) ? renderData : [];

        this.state.runHook('onBeforeRender', this.currentData);

        // Видаляємо тільки рядки та empty state (не заголовок!)
        this.container.querySelectorAll('.pseudo-table-row').forEach(row => row.remove());
        this.container.querySelectorAll('.pseudo-table-body').forEach(el => el.remove());

        if (this.currentData.length === 0) {
            // Вставляємо empty state після header
            if (this.config.emptyState) {
                const header = this.container.querySelector('.pseudo-table-header');
                if (header) {
                    header.insertAdjacentHTML('afterend', this.renderEmptyState());
                }
            }
        } else {
            // Генеруємо нові рядки та вставляємо після header
            const rowsHTML = this.renderRows(this.currentData);
            const header = this.container.querySelector('.pseudo-table-header');
            if (header) {
                header.insertAdjacentHTML('afterend', rowsHTML);
            }
        }

        // Event handlers
        this.attachEventHandlers();

        // Run hooks
        this.state.runHook('onRender', this.container, this.currentData);

        // Legacy callback
        if (this.config.onAfterRender) {
            this.config.onAfterRender(this.container, this.currentData);
        }

        return this;
    }

    // ==================== EVENT HANDLERS ====================

    attachEventHandlers() {
        const { onRowClick, getRowId } = this.config;

        if (onRowClick) {
            this.container.querySelectorAll('.pseudo-table-row.clickable').forEach(rowEl => {
                rowEl.addEventListener('click', (e) => {
                    const rowId = rowEl.dataset.rowId;
                    const rowData = this.currentData.find(r =>
                        String(getRowId(r)) === String(rowId)
                    );
                    if (rowData) {
                        onRowClick(rowData, e);
                    }
                });
            });
        }
    }

    // ==================== COLUMN VISIBILITY ====================

    setVisibleColumns(newVisibleColumns) {
        this.config.visibleColumns = newVisibleColumns;
        this.state.setVisibleColumns(newVisibleColumns);

        this.container.querySelectorAll('[data-column]').forEach(cell => {
            const columnId = cell.dataset.column;
            if (this.isColumnVisible(columnId)) {
                cell.classList.remove('column-hidden');
            } else {
                cell.classList.add('column-hidden');
            }
        });
    }

    // ==================== DOM UTILITIES ====================

    getContainer() {
        return this.container;
    }

    getDOM() {
        return this.dom;
    }

    getData() {
        return this.currentData;
    }

    /**
     * Знайти рядок таблиці за ID
     */
    findRow(rowId) {
        return this.container.querySelector(`[data-row-id="${rowId}"]`);
    }

    /**
     * Оновити конкретну комірку в таблиці
     */
    updateCell(rowId, columnId, newContent) {
        const row = this.findRow(rowId);
        if (!row) return false;

        const cell = row.querySelector(`[data-column="${columnId}"]`);
        if (!cell) return false;

        cell.innerHTML = newContent;
        return true;
    }

    /**
     * Додати клас до рядка таблиці
     */
    addRowClass(rowId, className) {
        const row = this.findRow(rowId);
        if (!row) return false;

        row.classList.add(className);
        return true;
    }

    /**
     * Видалити клас з рядка таблиці
     */
    removeRowClass(rowId, className) {
        const row = this.findRow(rowId);
        if (!row) return false;

        row.classList.remove(className);
        return true;
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
