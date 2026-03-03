// js/components/table/table-expandable.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE LEGO - EXPANDABLE ROWS PLUGIN                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  ПЛАГІН — Рядки що розкриваються (u-reveal)                            ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Додає u-reveal блок до кожного рядка таблиці.                          ║
 * ║  Контент розкриття генерується зовнішньою функцією.                     ║
 * ║  Кнопки (edit/save/close) рендеряться плагіном автоматично.            ║
 * ║                                                                          ║
 * ║  КОНФІГ:                                                                 ║
 * ║  expandable: {                                                           ║
 * ║      renderContent: (row) => HTML,  // генерує вміст u-reveal            ║
 * ║      onExpand: (rowEl, row) => {},  // callback після розкриття           ║
 * ║      onCollapse: (rowEl) => {},     // callback після згортання           ║
 * ║      onSave: (rowEl, row) => {},    // callback при збереженні            ║
 * ║  }                                                                       ║
 * ║                                                                          ║
 * ║  СТАН КНОПОК (автоматично):                                             ║
 * ║  Закрито: [checkbox] [edit]           — rowActions колонка               ║
 * ║  Відкрито: [save] ... [close]         — rowActions колонка               ║
 * ║                                                                          ║
 * ║  CSS:                                                                    ║
 * ║  Використовує .u-reveal + .is-open з helpers.css                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

class ExpandablePlugin {
    constructor(config = {}) {
        this.config = {
            renderContent: null,
            onExpand: null,
            onCollapse: null,
            onSave: null,
            ...config
        };

        this.table = null;
        this.state = null;
        this.clickHandler = null;
    }

    init(table, state) {
        this.table = table;
        this.state = state;

        state.registerHook('onRender', () => this.injectRevealBlocks(), { plugin: 'expandable' });
    }

    /**
     * Інжектити кнопки в rowActions + u-reveal в кожен рядок після рендеру
     */
    injectRevealBlocks() {
        const container = this.table.getContainer();
        if (!container || !this.config.renderContent) return;

        if (this.clickHandler) {
            container.removeEventListener('click', this.clickHandler);
        }

        const rows = container.querySelectorAll('.pseudo-table-row');
        const data = this.table.getData();

        rows.forEach((rowEl, index) => {
            if (rowEl.querySelector('.u-reveal')) return;

            const rowId = rowEl.dataset.rowId;
            const rowData = data.find(r => String(this.table.config.getRowId(r)) === String(rowId)) || data[index];
            if (!rowData) return;

            // Інжектимо edit/save кнопки в rowActions
            const actionsCell = rowEl.querySelector('.row-actions-cell');
            if (actionsCell && !actionsCell.querySelector('[data-action="expand-edit"]')) {
                const btnGroup = document.createElement('span');
                btnGroup.className = 'expand-actions';
                btnGroup.innerHTML = `
                    <button class="btn-icon" data-action="expand-edit" data-tooltip="Редагувати">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="btn-icon u-hidden" data-action="expand-save" data-tooltip="Зберегти">
                        <span class="material-symbols-outlined">save</span>
                    </button>`;
                actionsCell.prepend(btnGroup);

                const closeBtn = document.createElement('button');
                closeBtn.className = 'btn-icon u-hidden';
                closeBtn.dataset.action = 'expand-close';
                closeBtn.dataset.tooltip = 'Згорнути';
                closeBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
                actionsCell.appendChild(closeBtn);
            }

            const content = this.config.renderContent(rowData, rowEl);
            if (!content) return;

            // u-reveal з close кнопкою в кінці
            const reveal = document.createElement('div');
            reveal.className = 'u-reveal';
            reveal.innerHTML = `<div>${content}</div>`;
            rowEl.appendChild(reveal);
        });

        this.clickHandler = (e) => this._handleClick(e);
        container.addEventListener('click', this.clickHandler);
    }

    _handleClick(e) {
        const row = e.target.closest('.pseudo-table-row');
        if (!row) return;

        if (e.target.closest('[data-action="expand-edit"]')) {
            this._expand(row);
            return;
        }

        if (e.target.closest('[data-action="expand-save"]')) {
            this._save(row);
            return;
        }

        if (e.target.closest('[data-action="expand-close"]')) {
            this._collapse(row);
            return;
        }
    }

    _expand(row) {
        const reveal = row.querySelector('.u-reveal');
        if (!reveal) return;

        const editBtn = row.querySelector('[data-action="expand-edit"]');
        const saveBtn = row.querySelector('[data-action="expand-save"]');
        const closeBtn = row.querySelector('[data-action="expand-close"]');
        const checkbox = row.querySelector('.pseudo-table-checkbox');

        editBtn?.classList.add('u-hidden');
        saveBtn?.classList.remove('u-hidden');
        closeBtn?.classList.remove('u-hidden');
        checkbox?.classList.add('u-hidden');

        reveal.classList.add('is-open');

        if (this.config.onExpand) {
            const rowData = this._getRowData(row);
            this.config.onExpand(row, rowData);
        }
    }

    _collapse(row) {
        const reveal = row.querySelector('.u-reveal');
        if (!reveal) return;

        const editBtn = row.querySelector('[data-action="expand-edit"]');
        const saveBtn = row.querySelector('[data-action="expand-save"]');
        const closeBtn = row.querySelector('[data-action="expand-close"]');
        const checkbox = row.querySelector('.pseudo-table-checkbox');

        editBtn?.classList.remove('u-hidden');
        saveBtn?.classList.add('u-hidden');
        closeBtn?.classList.add('u-hidden');
        checkbox?.classList.remove('u-hidden');

        reveal.classList.remove('is-open');

        if (this.config.onCollapse) {
            this.config.onCollapse(row);
        }
    }

    _save(row) {
        if (this.config.onSave) {
            const rowData = this._getRowData(row);
            this.config.onSave(row, rowData);
        }
    }

    _getRowData(row) {
        const rowId = row.dataset.rowId;
        const data = this.table.getData();
        return data.find(r => String(this.table.config.getRowId(r)) === String(rowId)) || null;
    }

    destroy() {
        const container = this.table?.getContainer();
        if (container && this.clickHandler) {
            container.removeEventListener('click', this.clickHandler);
        }
    }
}

/**
 * Фабрична функція (як інші table plugins)
 */
export function init(tableCore, state, config = {}) {
    const plugin = new ExpandablePlugin(config);
    plugin.init(tableCore, state);
    return plugin;
}
