// js/common/table/table-column-types.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE LEGO - COLUMN TYPES                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Реєстр стандартних типів колонок з готовими render-функціями.          ║
 * ║  Кожна сторінка описує колонки через col() замість ручного конфігу.     ║
 * ║  Render-функція береться ТІЛЬКИ з типу — override render заборонено.    ║
 * ║                                                                          ║
 * ║  ТИПИ (13):                                                              ║
 * ║  1.  word-chip     — ID, коди, артикули         [chip]                  ║
 * ║  2.  name          — головна назва              <strong>                ║
 * ║  3.  text          — звичайний текст            escaped string          ║
 * ║  4.  status-dot    — кольорова крапка статусу   ● active/inactive      ║
 * ║  5.  badge-toggle  — перемикач Так/Ні           clickable badge         ║
 * ║  6.  severity-badge— іконка важливості          low/medium/high        ║
 * ║  7.  counter       — число з badge              N×                      ║
 * ║  8.  words-list    — список chips               first +N               ║
 * ║  9.  photo         — зображення/placeholder     <img> / icon           ║
 * ║  10. input         — редагований інпут          <input> або текст      ║
 * ║  11. binding-chip  — чіп з tooltip              {count, tooltip}       ║
 * ║  12. code          — технічне значення          <code>                  ║
 * ║  13. select        — custom-select dropdown     <select> + options     ║
 * ║                                                                          ║
 * ║  ЕКСПОРТ:                                                               ║
 * ║  - COLUMN_TYPES — Реєстр типів                                         ║
 * ║  - col(id, label, type, overrides) — Фабрика колонок                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { renderBadge, renderSeverityBadge } from './table-badges.js';
import { escapeHtml } from '../../utils/text-utils.js';

/**
 * Стандартні типи колонок (13 типів).
 * Кожен тип задає: className, sortable, searchable, render.
 * Override render ЗАБОРОНЕНО — тільки структурні overrides (className, sortable, filterable тощо).
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
            const val = (typeof value === 'boolean')
                ? (value ? 'active' : 'inactive')
                : String(value ?? '').toLowerCase();
            const map = { active: 'success', draft: 'warning', hidden: 'error', inactive: 'error', true: 'success', false: 'error' };
            const color = map[val] || 'neutral';
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

    // 7. Counter — число з badge (0×, 1×, 2×)
    counter: {
        className: 'cell-2xs cell-center',
        sortable: true,
        render: (value) => (value != null && value !== '') ? `<span class="match-count-badge">${value}×</span>` : ''
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
            if (!value || value.count == null) return '';
            const cls = (value.count === 0 || value.count === '0') ? 'chip' : 'chip chip-active';
            return `<span class="${cls} binding-chip" data-tooltip="${escapeHtml(value.tooltip || '')}" data-tooltip-always style="cursor:pointer">${value.count}</span>`;
        }
    },

    // 12. Code — технічне значення (slug, type, enum)
    code: {
        className: '',
        sortable: true,
        searchable: true,
        render: (value) => value ? `<code>${escapeHtml(value)}</code>` : ''
    },

    // 13. Select — custom-select dropdown (потребує initCustomSelects після рендеру)
    select: {
        className: 'cell-m',
        sortable: false,
        render: (value, row, col) => {
            const options = col.options || [];
            const optionsHtml = options.map(opt => {
                const optValue = typeof opt === 'string' ? opt : opt.value;
                const optLabel = typeof opt === 'string' ? opt : opt.label;
                const selected = String(optValue) === String(value ?? '') ? ' selected' : '';
                return `<option value="${escapeHtml(optValue)}"${selected}>${escapeHtml(optLabel)}</option>`;
            }).join('');
            return `<select data-custom-select data-row-id="${escapeHtml(row.id || row.code || '')}" data-column-id="${escapeHtml(col.id || '')}"><option value="">—</option>${optionsHtml}</select>`;
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
