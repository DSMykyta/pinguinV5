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
 * ║      renderContent: (row) => HTML,       // генерує вміст u-reveal       ║
 * ║      renderFooterLeft: (row) => HTML,    // ліва частина підвалу         ║
 * ║      renderFooterRight: (row) => HTML,   // права частина підвалу        ║
 * ║      onExpand: (rowEl, row) => {},       // callback після розкриття      ║
 * ║      onCollapse: (rowEl) => {},          // callback після згортання      ║
 * ║      onSave: (rowEl, row) => {},         // callback при збереженні       ║
 * ║      onOpenFull: (rowEl, row) => {},     // callback "відкрити повний"    ║
 * ║  }                                                                       ║
 * ║                                                                          ║
 * ║  ПІДВАЛ (modal-footer):                                                  ║
 * ║  modal-left:  custom контент (renderFooterLeft)                         ║
 * ║  modal-right: custom + [Відкрити повний][Зберегти] btn-ghost            ║
 * ║                                                                          ║
 * ║  СТАН КНОПОК (автоматично):                                             ║
 * ║  Закрито: [checkbox] [edit]          — початкова action-комірка          ║
 * ║  Відкрито: ... [close]               — кінцева action-комірка            ║
 * ║                                                                          ║
 * ║  CSS:                                                                    ║
 * ║  Використовує .u-reveal + .is-open з helpers.css                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

class ExpandablePlugin {
    constructor(config = {}) {
        this.config = {
            renderContent: null,
            renderFooterLeft: null,
            renderFooterRight: null,
            closeCellHeader: null,
            renderCloseCellContent: null,
            showSaveButton: true,
            showOpenFullButton: null,
            onExpand: null,
            onCollapse: null,
            onSave: null,
            onDelete: null,
            onOpenFull: null,
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

        this._ensureActionHeaders(container);

        const rows = container.querySelectorAll('.pseudo-table-row');
        const data = this.table.getData();

        rows.forEach((rowEl, index) => {
            if (rowEl.querySelector('.u-reveal')) return;

            const rowId = rowEl.dataset.rowId;
            const rowData = data.find(r => String(this.table.config.getRowId(r)) === String(rowId)) || data[index];
            if (!rowData) return;

            // Інжектимо edit кнопку в початкову rowActions-комірку
            const actionsCell =
                rowEl.querySelector('.row-actions-cell:not([data-expand-close-cell])') ||
                rowEl.querySelector('.row-actions-cell');
            if (actionsCell && !actionsCell.querySelector('[data-action="expand-edit"]')) {
                const btnGroup = document.createElement('span');
                btnGroup.className = 'expand-actions';
                btnGroup.innerHTML = `
                    <button class="btn-icon" data-action="expand-edit" data-tooltip="Редагувати">
                        <span class="material-symbols-outlined">edit</span>
                    </button>`;
                actionsCell.prepend(btnGroup);
            }

            // Кінцева action-комірка для close кнопки (видима завжди, кнопка — по стану)
            if (!rowEl.querySelector('[data-expand-close-cell]')) {
                const closeCell = document.createElement('div');
                closeCell.className = 'pseudo-table-cell col-1';
                closeCell.setAttribute('data-expand-close-cell', '');

                const customContent = this.config.renderCloseCellContent
                    ? this.config.renderCloseCellContent(rowData, rowEl)
                    : '';

                closeCell.innerHTML = `
                    ${customContent}
                    <button class="btn-icon u-hidden" data-action="expand-close" data-tooltip="Згорнути">
                        <span class="material-symbols-outlined">close</span>
                    </button>`;
                rowEl.appendChild(closeCell);
            }

            const content = this.config.renderContent(rowData, rowEl);
            if (!content) return;

            // Footer (wizard-footer: left + right)
            const footerLeft = this.config.renderFooterLeft ? this.config.renderFooterLeft(rowData, rowEl) : '';
            const footerRightCustom = this.config.renderFooterRight ? this.config.renderFooterRight(rowData, rowEl) : '';
            const footerRightButtons = [];
            const showOpenFullButton = this.config.showOpenFullButton ?? Boolean(this.config.onOpenFull);

            if (showOpenFullButton) {
                footerRightButtons.push(`
                    <button class="btn-ghost" data-action="expand-open-full">
                        <span class="material-symbols-outlined">open_in_full</span>
                        Відкрити повний
                    </button>`);
            }

            if (this.config.showSaveButton !== false) {
                footerRightButtons.push(`
                    <button class="btn-ghost" data-action="expand-save">
                        <span class="material-symbols-outlined">save</span>
                        Зберегти
                    </button>`);
            }

            const footerHtml = `<div class="separator-h"></div>
            <div class="modal-footer">
                <div class="modal-left">${footerLeft}</div>
                <div class="modal-right">${footerRightCustom}${footerRightButtons.join('')}</div>
            </div>`;

            const reveal = document.createElement('div');
            reveal.className = 'u-reveal';
            reveal.innerHTML = `<div>${content}${footerHtml}</div>`;
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

        if (e.target.closest('[data-action="expand-delete"]')) {
            this._delete(row);
            return;
        }

        if (e.target.closest('[data-action="expand-close"]')) {
            this._collapse(row);
            return;
        }

        if (e.target.closest('[data-action="expand-open-full"]')) {
            this._openFull(row);
            return;
        }
    }

    _expand(row) {
        const reveal = row.querySelector('.u-reveal');
        if (!reveal) return;

        const editBtn = row.querySelector('[data-action="expand-edit"]');
        const closeBtn = row.querySelector('[data-action="expand-close"]');
        const closeCell = row.querySelector('[data-expand-close-cell]');
        const checkbox = row.querySelector('.pseudo-table-checkbox');

        editBtn?.classList.add('u-hidden');
        closeBtn?.classList.remove('u-hidden');
        closeCell?.querySelectorAll('.tag').forEach(t => t.classList.add('u-hidden'));
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
        const closeBtn = row.querySelector('[data-action="expand-close"]');
        const closeCell = row.querySelector('[data-expand-close-cell]');
        const checkbox = row.querySelector('.pseudo-table-checkbox');

        editBtn?.classList.remove('u-hidden');
        closeBtn?.classList.add('u-hidden');
        closeCell?.querySelectorAll('.tag').forEach(t => t.classList.remove('u-hidden'));
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

    _delete(row) {
        if (this.config.onDelete) {
            const rowData = this._getRowData(row);
            this.config.onDelete(row, rowData);
        }
    }

    _openFull(row) {
        if (this.config.onOpenFull) {
            const rowData = this._getRowData(row);
            this.config.onOpenFull(row, rowData);
        }
    }

    _getRowData(row) {
        const rowId = row.dataset.rowId;
        const data = this.table.getData();
        return data.find(r => String(this.table.config.getRowId(r)) === String(rowId)) || null;
    }

    _ensureActionHeaders(container) {
        const header = container.querySelector('.pseudo-table-header');
        if (!header) return;

        if (!header.querySelector('[data-expand-close-header]')) {
            const endHeader = document.createElement('div');
            endHeader.className = 'pseudo-table-cell col-1';
            endHeader.setAttribute('data-expand-close-header', '');

            if (this.config.closeCellHeader) {
                endHeader.textContent = this.config.closeCellHeader;
            } else {
                endHeader.setAttribute('aria-hidden', 'true');
            }

            header.appendChild(endHeader);
        }
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
