// js/tasks/tasks-links.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS - LINKS PLUGIN                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Рендеринг секції "Посилання" з категоризованими посиланнями.
 * Phase 1: Hardcoded URLs таблиць та інструментів.
 * Phase 2: Кастомні посилання з аркуша Links (якщо існує).
 *
 * 🔌 ПЛАГІН — цей файл можна видалити, система працюватиме без нього.
 */

import { registerTasksPlugin } from './tasks-plugins.js';
import { callSheetsAPI } from '../utils/api-client.js';

// ═══════════════════════════════════════════════════════════════════════════
// HARDCODED ПОСИЛАННЯ
// ═══════════════════════════════════════════════════════════════════════════

const SPREADSHEET_LINKS = [
    {
        name: 'Main Database',
        description: 'Бренди, ключові слова, заборонені слова, Mapper',
        url: 'https://docs.google.com/spreadsheets/d/1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk/edit',
        icon: 'database',
        children: [
            {
                name: 'Brands',
                url: 'https://docs.google.com/spreadsheets/d/1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk/edit#gid=653695455',
                icon: 'shopping_bag'
            },
            {
                name: 'Keywords / Glossary',
                url: 'https://docs.google.com/spreadsheets/d/1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk/edit#gid=90240383',
                icon: 'key'
            },
            {
                name: 'Banned Words',
                url: 'https://docs.google.com/spreadsheets/d/1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk/edit#gid=1742878044',
                icon: 'block'
            },
            {
                name: 'Brand Lines',
                url: 'https://docs.google.com/spreadsheets/d/1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk/edit#gid=1150452478',
                icon: 'list'
            }
        ]
    },
    {
        name: 'Texts Database',
        description: 'Тексти товарів для перевірки',
        url: 'https://docs.google.com/spreadsheets/d/1qQ2ob8zsgSfE1G64SorpdbW0xYLOdPfw_cbAH23xUhM/edit',
        icon: 'description'
    },
    {
        name: 'Users & Tasks',
        description: 'Користувачі та задачі',
        url: 'https://docs.google.com/spreadsheets/d/1XE9C6eByiQOoJ_3WNewlMO4QjUpSR-eXI-M6eDn20ls/edit',
        icon: 'group',
        children: [
            {
                name: 'Tasks',
                url: 'https://docs.google.com/spreadsheets/d/1XE9C6eByiQOoJ_3WNewlMO4QjUpSR-eXI-M6eDn20ls/edit#gid=2095262750',
                icon: 'task_alt'
            }
        ]
    },
    {
        name: 'Price Checklist',
        description: 'Чекліст викладки товарів',
        url: 'https://docs.google.com/spreadsheets/d/12zYr-fhF9o-O5lr-Z8DfQuGUi7bYmoXKy8yOLADzwCI/edit',
        icon: 'receipt_long'
    }
];

const TOOL_LINKS = [
    { name: 'Інструменти', url: 'index.html', icon: 'instant_mix', description: 'Генератори та обробка тексту' },
    { name: 'Бренди', url: 'brands.html', icon: 'shopping_bag', description: 'Управління брендами' },
    { name: 'Ключові слова', url: 'keywords.html', icon: 'key', description: 'Управління ключовими словами' },
    { name: 'Прайс', url: 'price.html', icon: 'receipt_long', description: 'Чекліст викладки' },
    { name: 'Mapper', url: 'mapper.html', icon: 'hub', description: 'Зіставлення атрибутів маркетплейсів' },
    { name: 'Глосарій', url: 'glossary.html', icon: 'import_contacts', description: 'Довідник статей' },
    { name: 'Заборонені слова', url: 'banned-words.html', icon: 'block', description: 'Управління забороненими словами' }
];

// ═══════════════════════════════════════════════════════════════════════════
// КАСТОМНІ ПОСИЛАННЯ (Phase 2)
// ═══════════════════════════════════════════════════════════════════════════

let customLinks = [];

/**
 * Завантажити кастомні посилання з аркуша Links (якщо існує).
 * Мовчки ігнорує помилку якщо аркуша немає.
 */
async function loadCustomLinks() {
    try {
        const result = await callSheetsAPI('get', {
            range: 'Links!A:D',
            spreadsheetType: 'users'
        });

        if (result && Array.isArray(result) && result.length > 1) {
            customLinks = result.slice(1)
                .filter(row => row[0] && row[2])
                .map(row => ({
                    id: row[0],
                    name: row[1] || row[2],
                    url: row[2],
                    description: row[3] || '',
                    icon: 'bookmark'
                }));
        }
    } catch {
        // Links sheet does not exist yet — expected
        customLinks = [];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// РЕНДЕРИНГ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Відрендерити секцію посилань
 */
function renderLinks() {
    const container = document.getElementById('links-container');
    if (!container) return;

    let html = '';

    // Група 1: Google Таблиці
    html += renderLinkGroup('Google Таблиці', 'table_chart', SPREADSHEET_LINKS, 'sheets');

    // Група 2: Інструменти
    html += renderLinkGroup('Інструменти', 'instant_mix', TOOL_LINKS, 'tools');

    // Група 3: Кастомні (Phase 2)
    if (customLinks.length > 0) {
        html += renderLinkGroup('Користувацькі посилання', 'bookmark', customLinks, 'custom');
    }

    container.innerHTML = html;
}

/**
 * Згенерувати HTML для групи посилань
 * @param {string} title - Назва групи
 * @param {string} groupIcon - Іконка групи
 * @param {Array} links - Масив посилань
 * @param {string} category - Категорія (для фільтрації)
 * @returns {string} HTML
 */
function renderLinkGroup(title, groupIcon, links, category) {
    const items = links.map(link => {
        const childrenHtml = (link.children || []).map(child => `
            <a href="${escapeAttr(child.url)}" target="_blank" rel="noopener noreferrer"
               class="panel-item" style="padding-left: 44px;"
               data-link-name="${escapeAttr(child.name)}"
               data-link-desc="">
                <span class="material-symbols-outlined panel-item-icon" style="font-size: 16px;">${child.icon}</span>
                <span class="panel-item-text">${escapeHtml(child.name)}</span>
                <span class="material-symbols-outlined on-hover">open_in_new</span>
            </a>
        `).join('');

        const descHtml = link.description
            ? `<span style="display: block; font-size: 11px; opacity: 0.6; white-space: normal; line-height: 1.3;">${escapeHtml(link.description)}</span>`
            : '';

        return `
            <a href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer"
               class="panel-item"
               data-link-name="${escapeAttr(link.name)}"
               data-link-desc="${escapeAttr(link.description || '')}">
                <span class="material-symbols-outlined panel-item-icon">${link.icon || 'link'}</span>
                <span class="panel-item-text">
                    ${escapeHtml(link.name)}
                    ${descHtml}
                </span>
                <span class="material-symbols-outlined on-hover">open_in_new</span>
            </a>
            ${childrenHtml}
        `;
    }).join('');

    return `
        <div data-links-group="${category}" style="margin-bottom: 24px;">
            <div class="section-name" style="margin-bottom: 8px;">
                <span class="material-symbols-outlined" style="font-size: 18px; opacity: 0.5;">${groupIcon}</span>
                <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-secondary);">${escapeHtml(title)}</span>
            </div>
            <div class="u-flex-col-8" style="gap: 0;">
                ${items}
            </div>
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════════════════════
// УТИЛІТИ
// ═══════════════════════════════════════════════════════════════════════════

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    if (!text) return '';
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ПЛАГІНА
// ═══════════════════════════════════════════════════════════════════════════

registerTasksPlugin('onInit', async () => {
    await loadCustomLinks();
    renderLinks();
});

export { renderLinks, loadCustomLinks };
