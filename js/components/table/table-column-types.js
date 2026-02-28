// js/components/table/table-column-types.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE LEGO - COLUMN TYPES                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Реєстр стандартних типів колонок з готовими render-функціями.          ║
 * ║  Кожна сторінка описує колонки через col() замість ручного конфігу.     ║
 * ║  Render-функція береться ТІЛЬКИ з типу — override render заборонено.    ║
 * ║                                                                          ║
 * ║  РОЗКЛАДКА:                                                              ║
 * ║  Кожен тип задає span (1-12) — пропорційну вагу колонки у рядку.       ║
 * ║  span використовується як .col-N клас (grid.css flex-система).         ║
 * ║  align задає вирівнювання вмісту: 'start' | 'center' | 'end'.         ║
 * ║                                                                          ║
 * ║  КОЛЬОРИ: через шар colors.css (.c-red, .c-green, .c-yellow, .c-blue) ║
 * ║  Компоненти: dot, badge, chip, tag, counter                ║
 * ║                                                                          ║
 * ║  ТИПИ (15):                                                              ║
 * ║  1.  tag     — ID, коди, артикули         [chip]                  ║
 * ║  2.  name          — головна назва              <strong>                ║
 * ║  3.  text          — звичайний текст            escaped string          ║
 * ║  4.  status-dot    — кольорова крапка статусу   ● active/inactive      ║
 * ║  5.  badge-toggle  — перемикач Так/Ні           clickable badge         ║
 * ║  6.  severity     — іконка важливості            low/medium/high        ║
 * ║  7.  counter       — число з badge              N×                      ║
 * ║  8.  words-list    — список chips               first +N               ║
 * ║  9.  photo         — зображення/placeholder     <img> / icon           ║
 * ║  10. input         — редагований інпут          <input> або текст      ║
 * ║  11. binding-chip  — чіп з tooltip              {count, tooltip}       ║
 * ║  12. code          — технічне значення          <code>                  ║
 * ║  13. select        — custom-select dropdown     <select> + options     ║
 * ║  14. links         — масив посилань             [{name,url}] → icon   ║
 * ║  15. reserve       — резерв N/D → avatar        badge + resolveAvatar  ║
 * ║                                                                          ║
 * ║  ЕКСПОРТ:                                                               ║
 * ║  - COLUMN_TYPES — Реєстр типів                                         ║
 * ║  - col(id, label, type, overrides) — Фабрика колонок                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { renderBadge, renderSeverityBadge } from './table-badges.js';
import { escapeHtml } from '../../utils/text-utils.js';

/** status value → color class for dot */
const DOT_COLOR = { active: 'c-green', draft: 'c-yellow', hidden: 'c-red', inactive: 'c-red', true: 'c-green', false: 'c-red' };

/**
 * Стандартні типи колонок (15 типів).
 * Кожен тип задає: span, align, sortable, searchable, render.
 * Override render ЗАБОРОНЕНО — тільки структурні overrides (span, sortable, filterable тощо).
 */
export const COLUMN_TYPES = {

    // 1. Word-chip — ID, коди, артикули
    'tag': {
        span: 2,
        sortable: true,
        searchable: true,
        render: (value) => `<span class="tag c-blue">${escapeHtml(value ?? '')}</span>`
    },

    // 2. Name — головна назва (bold)
    name: {
        span: 3,
        sortable: true,
        searchable: true,
        render: (value) => `<strong>${escapeHtml(value ?? '')}</strong>`
    },

    // 3. Text — звичайний текст
    text: {
        span: 2,
        sortable: true,
        searchable: true,
        render: (value) => escapeHtml(value ?? '')
    },

    // 4. Status-dot → dot з c-* класом
    'status-dot': {
        span: 1,
        align: 'center',
        class: 'u-max-80',
        sortable: true,
        render: (value) => {
            const val = (typeof value === 'boolean')
                ? (value ? 'active' : 'inactive')
                : String(value ?? '').toLowerCase();
            const color = DOT_COLOR[val] || 'c-grey';
            return `<span class="dot ${color}" title="${escapeHtml(value ?? '')}"></span>`;
        }
    },

    // 5. Badge-toggle — перемикач (clickable badge Так/Ні)
    'badge-toggle': {
        span: 1,
        align: 'center',
        class: 'u-max-80',
        sortable: true,
        render: (value, row) => renderBadge(value, 'checked', {
            clickable: true,
            id: row.id || row.local_id || row.code
        })
    },

    // 6. Severity — іконка рівня важливості (badge)
    severity: {
        span: 1,
        align: 'center',
        class: 'u-max-80',
        sortable: true,
        render: (value) => renderSeverityBadge(value)
    },

    // 7. Counter — число з badge (0×, 1×, 2×)
    counter: {
        span: 1,
        align: 'center',
        class: 'u-max-80',
        sortable: true,
        render: (value) => (value != null && value !== '') ? `<span class="counter">${value}×</span>` : ''
    },

    // 8. Words-list — список chips з "+N" counter
    'words-list': {
        span: 2,
        sortable: false,
        render: (value) => {
            if (!value) return '<span class="text-muted">—</span>';
            const words = (typeof value === 'string' ? value.split(',') : value)
                .map(s => String(s).trim()).filter(Boolean);
            if (!words.length) return '<span class="text-muted">—</span>';
            const first = `<span class="tag c-main">${escapeHtml(words[0])}</span>`;
            if (words.length <= 1) return `<div class="group">${first}</div>`;
            const allNames = words.slice(1).map(w => escapeHtml(w)).join('\n');
            const rest = ` <span class="tag c-secondary" data-tooltip="${allNames}" data-tooltip-always>${escapeHtml('+' + (words.length - 1))}</span>`;
            return `<div class="group">${first}${rest}</div>`;
        }
    },

    // 9. Photo — зображення або placeholder
    photo: {
        span: 1,
        align: 'center',
        sortable: false,
        render: (value, row) => value
            ? `<img src="${value}" alt="${escapeHtml(row.name_short || '')}" class="product-thumb">`
            : '<div class="product-thumb product-thumb-empty"><span class="material-symbols-outlined">image</span></div>'
    },

    // 10. Input — редагований інпут
    input: {
        span: 2,
        sortable: false,
        render: (value, row, col) =>
            value
                ? escapeHtml(value)
                : `<input type="text" class="input-main" data-code="${escapeHtml(row.code || row.id || '')}" placeholder="${escapeHtml(col.label || '')}">`
    },

    // 11. Binding-chip — чіп з кількістю прив'язок + tooltip
    'binding-chip': {
        span: 1,
        align: 'center',
        class: 'u-max-80',
        sortable: false,
        render: (value) => {
            if (!value || value.count == null) return '';
            const cls = (value.count === 0 || value.count === '0') ? 'chip' : 'chip c-secondary';
            return `<span class="${cls}" data-tooltip="${escapeHtml(value.tooltip || '')}" data-tooltip-always style="cursor:pointer">${value.count}</span>`;
        }
    },

    // 12. Code — технічне значення (slug, type, enum)
    code: {
        span: 2,
        sortable: true,
        searchable: true,
        render: (value) => value ? `<code>${escapeHtml(value)}</code>` : ''
    },

    // 13. Select — custom-select dropdown (потребує initCustomSelects після рендеру)
    select: {
        span: 2,
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
    },

    // 14. Links — масив посилань [{name, url}] → іконки btn-icon
    links: {
        span: 1,
        sortable: false,
        searchable: false,
        render: (value) => {
            if (!value || !Array.isArray(value) || !value.length) return '';
            return value.map(link => {
                const name = escapeHtml(link.name || link.url || '');
                const url = escapeHtml(link.url || '#');
                return `<a href="${url}" target="_blank" rel="noopener" class="btn-icon" data-tooltip="${name}"><span class="material-symbols-outlined">open_in_new</span></a>`;
            }).join('');
        }
    },

    // 15. Reserve — badge N/D → avatar (resolveAvatar callback для аватарки)
    reserve: {
        span: 1,
        align: 'center',
        sortable: true,
        render: (value, row, col) => {
            const id = row.id || row.local_id || row.code;
            if (!value || !String(value).trim()) {
                return `<span class="badge" data-badge-id="${escapeHtml(id)}:reserve" data-status="" style="cursor:pointer">N/D</span>`;
            }
            const name = String(value).trim();
            if (col.resolveAvatar) {
                const html = col.resolveAvatar(name);
                if (html) return html;
            }
            return `<span data-tooltip="${escapeHtml(name)}">${escapeHtml(name)}</span>`;
        }
    },

    // 16. Action — колонка дій (render завжди через override)
    action: {
        span: 1,
        align: 'center',
        class: 'u-max-80',
        sortable: false,
        searchable: false,
        render: () => ''
    }
};

/**
 * Створити колонку з типу.
 *
 * @param {string} id - ID колонки (ключ в даних)
 * @param {string} label - Відображувана назва
 * @param {string} type - Тип з COLUMN_TYPES
 * @param {Object} [overrides] - Перевизначення будь-яких полів (span, align, sortable, filterable тощо)
 * @returns {Object} Конфіг колонки для createTable
 *
 * @example
 * col('brand_id', 'ID', 'tag')
 * col('name_uk', 'Назва', 'name')
 * col('status', 'Статус', 'status-dot')
 * col('country', 'Країна', 'text', { span: 1, filterable: true })
 */
export function col(id, label, type, overrides = {}) {
    const base = COLUMN_TYPES[type] || COLUMN_TYPES.text;
    return { id, label, type, ...base, ...overrides };
}
