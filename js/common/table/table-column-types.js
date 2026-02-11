// js/common/table/table-column-types.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE LEGO - COLUMN TYPES                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  РЕЄСТР — Стандартні типи колонок з готовими render-функціями           ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Уніфікація column definitions по всіх сторінках.                        ║
 * ║  Кожна сторінка описує колонки через col() замість ручного конфігу.     ║
 * ║                                                                          ║
 * ║  ЕКСПОРТОВАНІ:                                                           ║
 * ║  - COLUMN_TYPES — Реєстр 11 стандартних типів                           ║
 * ║  - col(id, label, type, overrides) — Фабрика колонок                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { renderBadge, renderSeverityBadge } from './table-badges.js';
import { escapeHtml } from '../../utils/text-utils.js';

/**
 * Стандартні типи колонок.
 * Кожен тип задає: className, sortable, searchable, render.
 * Сторінка може override-нути будь-яку властивість через col() overrides.
 */
export const COLUMN_TYPES = {

    // 1. Word-chip — ID, коди, артикули
    'word-chip': {
        className: 'cell-m',
        sortable: true,
        searchable: true,
        render: (value) => `<span class="word-chip">${escapeHtml(value ?? '')}</span>`
    },

    // 2. Name — головна назва (bold)
    name: {
        className: 'cell-xl',
        sortable: true,
        searchable: true,
        render: (value) => `<strong>${escapeHtml(value ?? '')}</strong>`
    },

    // 3. Text — звичайний текст
    text: {
        className: '',
        sortable: true,
        searchable: true,
        render: (value) => escapeHtml(value ?? '')
    },

    // 4. Status-dot — кольорова крапка статусу
    'status-dot': {
        className: 'cell-xs cell-center',
        sortable: true,
        render: (value) => {
            const map = { active: 'success', draft: 'warning', hidden: 'error', inactive: 'error' };
            const color = map[value] || 'neutral';
            return `<span class="status-dot" style="background-color: var(--color-${color});" title="${escapeHtml(value ?? '')}"></span>`;
        }
    },

    // 5. Badge-toggle — перемикач (clickable badge Так/Ні)
    'badge-toggle': {
        className: 'cell-s cell-center',
        sortable: true,
        render: (value, row) => renderBadge(value, 'checked', {
            clickable: true,
            id: row.id || row.local_id || row.code
        })
    },

    // 6. Severity-badge — іконка рівня важливості
    'severity-badge': {
        className: 'cell-2xs cell-center',
        sortable: true,
        render: (value) => renderSeverityBadge(value)
    },

    // 7. Counter — число з badge (1×, 2×)
    counter: {
        className: 'cell-2xs cell-center',
        sortable: true,
        render: (value) => value ? `<span class="match-count-badge">${value}×</span>` : ''
    },

    // 8. Words-list — список chips з "+N" counter
    'words-list': {
        className: 'cell-l',
        sortable: false,
        render: (value) => {
            if (!value) return '<span class="text-muted">—</span>';
            const words = (typeof value === 'string' ? value.split(',') : value)
                .map(s => String(s).trim()).filter(Boolean);
            if (!words.length) return '<span class="text-muted">—</span>';
            const first = `<span class="word-chip primary">${escapeHtml(words[0])}</span>`;
            const rest = words.length > 1
                ? ` <span class="word-chip neutral">+${words.length - 1}</span>`
                : '';
            return `<div class="cell-words-list">${first}${rest}</div>`;
        }
    },

    // 9. Photo — зображення або placeholder
    photo: {
        className: 'cell-xs cell-center',
        sortable: false,
        render: (value, row) => value
            ? `<img src="${value}" alt="${escapeHtml(row.name_short || '')}" class="product-thumb">`
            : '<div class="product-thumb product-thumb-empty"><span class="material-symbols-outlined">image</span></div>'
    },

    // 10. Input — редагований інпут
    input: {
        className: 'cell-s',
        sortable: false,
        render: (value, row, col) =>
            value
                ? escapeHtml(value)
                : `<input type="text" class="input-main" data-code="${escapeHtml(row.code || row.id || '')}" placeholder="${escapeHtml(col.label || '')}">`
    },

    // 11. Binding-chip — чіп з кількістю прив'язок + tooltip
    'binding-chip': {
        className: 'cell-xs cell-center',
        sortable: false,
        render: (value) => {
            if (!value || !value.count) return '';
            return `<span class="chip chip-active binding-chip" data-tooltip="${escapeHtml(value.tooltip || '')}" data-tooltip-always style="cursor:pointer">${value.count}</span>`;
        }
    }
};

/**
 * Створити колонку з типу.
 *
 * @param {string} id - ID колонки (ключ в даних)
 * @param {string} label - Відображувана назва
 * @param {string} type - Тип з COLUMN_TYPES
 * @param {Object} [overrides] - Перевизначення будь-яких полів
 * @returns {Object} Конфіг колонки для createTable
 *
 * @example
 * col('brand_id', 'ID', 'word-chip')
 * col('name_uk', 'Назва', 'name')
 * col('status', 'Статус', 'status-dot')
 * col('severity', ' ', 'severity-badge', { className: 'cell-2xs cell-center' })
 */
export function col(id, label, type, overrides = {}) {
    const base = COLUMN_TYPES[type] || COLUMN_TYPES.text;
    return { id, label, type, ...base, ...overrides };
}
