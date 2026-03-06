// js/pages/products/products-crud-composition-generator.js

/**
 * Вбудований генератор таблиць для wizard-режиму.
 * Спрощена версія gt-* модулів, працює з #wizard-rows-container.
 * Генерує HTML-таблицю та BR-текст і заповнює едітори складу.
 */

import { initDropdowns } from '../../components/forms/dropdown.js';
import { showToast } from '../../components/feedback/toast.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let _rowCounter = 0;
let _rowTemplate = null;
let _initialized = false;
let _fillCallback = null;

const ROW_CLASSES = {
    EXCLUSIVE: ['td', 'th-strong', 'th', 'new-table', 'h3'],
    TD: 'td', TH: 'th', TH_STRONG: 'th-strong',
    H3: 'h3', NEW_TABLE: 'new-table',
    BOLD: 'bold', ITALIC: 'italic',
    COLSPAN2: 'colspan2', SINGLE: 'single', ADDED: 'added',
};

const SEL = {
    BLOC: '.content-bloc',
    INPUT_LEFT: '.input-box.large input, .input-box.large textarea',
    INPUT_RIGHT: '.input-box.small input, .input-box.small textarea',
};

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати wizard-генератор
 * @param {Function} onFill - callback(htmlTable, brText) для заповнення едіторів
 */
export function initWizardGenerator(onFill) {
    const container = _getContainer();
    if (!container || _initialized) return;

    _fillCallback = onFill;
    _initialized = true;

    // Кнопки дій
    const section = document.getElementById('section-product-table-generator');
    if (!section) return;

    section.addEventListener('click', (e) => {
        const action = e.target.closest('[data-wg-action]')?.dataset.wgAction;
        if (!action) return;

        if (action === 'add-row') _addRow();
        else if (action === 'add-separator') _addSeparator();
        else if (action === 'add-nutrition') _addNutritionTemplate();
    });

    // Кнопка заповнення
    document.getElementById('wizard-fill-composition')?.addEventListener('click', _handleFill);

    // Делегований обробник на rows container
    container.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('[data-action="delete-row"]');
        if (removeBtn) {
            const row = removeBtn.closest('.content-bloc');
            if (row && container.querySelectorAll('.content-bloc').length > 1) row.remove();
            return;
        }

        const insertAbove = e.target.closest('[data-action="insert-above"]');
        if (insertAbove) { _insertRow(insertAbove.closest('.content-bloc'), 'before'); return; }

        const insertBelow = e.target.closest('[data-action="insert-below"]');
        if (insertBelow) { _insertRow(insertBelow.closest('.content-bloc'), 'after'); return; }

        const classBtn = e.target.closest('[data-class]');
        if (classBtn) {
            const row = classBtn.closest('.content-bloc');
            if (row) _handleClassToggle(row, classBtn.dataset.class);
        }

        // Sync dropdown state on trigger click
        const trigger = e.target.closest('[data-dropdown-trigger]');
        if (trigger) {
            const row = trigger.closest('.content-bloc');
            if (row) _syncDropdownState(row);
        }
    });

    // Radio switch (row/field)
    container.addEventListener('change', (e) => {
        if (e.target.matches('input[type="radio"]')) {
            const row = e.target.closest('.content-bloc');
            if (row) _handleInputTypeSwitch(row, e.target.value);
        }
    });

    // Створити перший рядок
    _createFirstRow();
}

/**
 * Показати/сховати секцію генератора
 */
export function showWizardGenerator(show) {
    const section = document.getElementById('section-product-table-generator');
    if (section) section.classList.toggle('u-hidden', !show);
}

/**
 * Очистити генератор
 */
export function resetWizardGenerator() {
    _rowCounter = 0;
    const container = _getContainer();
    if (container) container.innerHTML = '';
    _initialized = false;
    _fillCallback = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// ROW MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function _getContainer() {
    return document.getElementById('wizard-rows-container');
}

async function _loadTemplate() {
    if (_rowTemplate) return _rowTemplate;
    try {
        const resp = await fetch('/templates/partials/table-row.html');
        if (!resp.ok) throw new Error(resp.statusText);
        _rowTemplate = await resp.text();
    } catch (e) {
        console.error('[WizardGen] Row template load error:', e);
        _rowTemplate = '';
    }
    return _rowTemplate;
}

async function _createRow() {
    const id = ++_rowCounter;
    const tmpl = await _loadTemplate();
    const html = tmpl.replace(/\{\{rowId\}\}/g, `wg-${id}`);

    const row = document.createElement('div');
    row.className = `content-bloc ${ROW_CLASSES.TD}`;
    row.id = `wg-bloc-${id}`;
    row.innerHTML = html;
    return row;
}

async function _addRow() {
    const container = _getContainer();
    if (!container) return;
    const row = await _createRow();
    container.appendChild(row);
    initDropdowns();
}

async function _addSeparator() {
    const container = _getContainer();
    if (!container) return;
    const row = await _createRow();
    row.classList.remove(ROW_CLASSES.TD);
    row.classList.add(ROW_CLASSES.NEW_TABLE);
    container.appendChild(row);
    initDropdowns();
}

async function _addNutritionTemplate() {
    const container = _getContainer();
    if (!container) return;

    const items = [
        { left: 'Пищевая ценность', right: '', cls: ROW_CLASSES.TH_STRONG },
        { left: 'Калории', right: '' },
        { left: 'Белок', right: '' },
        { left: 'Жиры', right: '' },
        { left: 'Углеводы', right: '' },
    ];

    for (const item of items) {
        const row = await _createRow();
        if (item.cls) {
            row.classList.remove(ROW_CLASSES.TD);
            row.classList.add(item.cls);
        }
        const leftInput = row.querySelector(SEL.INPUT_LEFT);
        const rightInput = row.querySelector(SEL.INPUT_RIGHT);
        if (leftInput) leftInput.value = item.left;
        if (rightInput) rightInput.value = item.right;
        container.appendChild(row);
    }
    initDropdowns();
}

async function _createFirstRow() {
    const container = _getContainer();
    if (!container || container.children.length > 0) return;

    const row = await _createRow();
    row.classList.remove(ROW_CLASSES.TD);
    row.classList.add(ROW_CLASSES.TH_STRONG);
    const leftInput = row.querySelector(SEL.INPUT_LEFT);
    if (leftInput) leftInput.value = 'Пищевая ценность';
    container.appendChild(row);
    initDropdowns();
}

async function _insertRow(refRow, position) {
    if (!refRow) return;
    const row = await _createRow();
    if (position === 'before') {
        refRow.parentNode.insertBefore(row, refRow);
    } else {
        refRow.parentNode.insertBefore(row, refRow.nextSibling);
    }
    initDropdowns();
}

// ═══════════════════════════════════════════════════════════════════════════
// CLASS TOGGLES
// ═══════════════════════════════════════════════════════════════════════════

function _handleClassToggle(row, cls) {
    const isExclusive = ROW_CLASSES.EXCLUSIVE.includes(cls);
    if (isExclusive) {
        const alreadyActive = row.classList.contains(cls);
        row.classList.remove(ROW_CLASSES.BOLD);
        ROW_CLASSES.EXCLUSIVE.forEach(c => row.classList.remove(c));
        row.classList.add(alreadyActive && cls !== ROW_CLASSES.TD ? ROW_CLASSES.TD : cls);
    } else {
        row.classList.toggle(cls);
    }
    _syncDropdownState(row);
}

function _syncDropdownState(row) {
    const dropdown = row.querySelector('.dropdown-panel');
    if (!dropdown) return;

    const boldBtn = dropdown.querySelector('[data-class="bold"]');
    if (boldBtn) {
        const implicitBold = row.classList.contains(ROW_CLASSES.TH_STRONG) || row.classList.contains(ROW_CLASSES.H3);
        const explicitBold = row.classList.contains(ROW_CLASSES.BOLD);
        boldBtn.classList.toggle('active', implicitBold || explicitBold);
        boldBtn.toggleAttribute('disabled', implicitBold);
    }

    dropdown.querySelectorAll('[data-class]').forEach(btn => {
        const c = btn.dataset.class;
        if (c !== ROW_CLASSES.BOLD && !ROW_CLASSES.EXCLUSIVE.includes(c)) {
            btn.classList.toggle('active', row.classList.contains(c));
        }
    });

    ROW_CLASSES.EXCLUSIVE.forEach(c => {
        dropdown.querySelector(`[data-class="${c}"]`)?.classList.remove('active');
    });

    let found = false;
    for (const c of ROW_CLASSES.EXCLUSIVE) {
        if (row.classList.contains(c)) {
            dropdown.querySelector(`[data-class="${c}"]`)?.classList.add('active');
            found = true;
            break;
        }
    }
    if (!found) {
        dropdown.querySelector(`[data-class="${ROW_CLASSES.TD}"]`)?.classList.add('active');
    }
}

function _handleInputTypeSwitch(row, type) {
    row.querySelectorAll('.input-box').forEach(box => {
        const oldEl = box.querySelector('input, textarea');
        if (!oldEl) return;
        const newEl = document.createElement(type === 'field' ? 'textarea' : 'input');
        newEl.placeholder = oldEl.placeholder;
        newEl.value = oldEl.value;
        if (type === 'row') newEl.autocomplete = 'off';
        oldEl.parentNode.replaceChild(newEl, oldEl);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE
// ═══════════════════════════════════════════════════════════════════════════

function _sanitize(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _formatCell(text) {
    let content = _sanitize(text);
    return content.replace(/\(([^)]+)\)/g, '<em>($1)</em>');
}

function _generateHtmlTable() {
    const container = _getContainer();
    if (!container) return '';

    let html = '';
    let isOpen = false;

    container.querySelectorAll(SEL.BLOC).forEach(row => {
        const left = row.querySelector(SEL.INPUT_LEFT)?.value || '';
        const right = row.querySelector(SEL.INPUT_RIGHT)?.value || '';

        if ((row.classList.contains(ROW_CLASSES.ADDED) && !right.trim()) ||
            (!row.classList.contains(ROW_CLASSES.NEW_TABLE) && !left.trim() && !right.trim())) return;

        if (row.classList.contains(ROW_CLASSES.NEW_TABLE) || row.classList.contains(ROW_CLASSES.H3)) {
            if (isOpen) { html += '</tbody></table>'; isOpen = false; }
            if (row.classList.contains(ROW_CLASSES.H3)) html += `<h3>${_sanitize(left)}</h3>`;
            return;
        }

        if (!isOpen) { html += '<table><tbody>'; isOpen = true; }

        let leftContent = _formatCell(left);
        let rightContent = _formatCell(right);
        if (row.classList.contains(ROW_CLASSES.ITALIC)) {
            leftContent = `<em>${leftContent}</em>`;
            rightContent = `<em>${rightContent}</em>`;
        }

        const isTh = row.classList.contains(ROW_CLASSES.TH_STRONG) || row.classList.contains(ROW_CLASSES.TH);
        const tag = isTh ? 'th' : 'td';
        const isBold = row.classList.contains(ROW_CLASSES.TH_STRONG) || row.classList.contains(ROW_CLASSES.BOLD);

        if (row.classList.contains(ROW_CLASSES.COLSPAN2)) {
            const c = isBold ? `<strong>${leftContent}</strong>` : leftContent;
            html += `<tr><${tag} colspan="2">${c}</${tag}></tr>`;
        } else if (row.classList.contains(ROW_CLASSES.SINGLE)) {
            const c = isBold ? `<strong>${leftContent}</strong>` : leftContent;
            html += `<tr><${tag}>${c}</${tag}></tr>`;
        } else {
            const l = isBold ? `<strong>${leftContent}</strong>` : leftContent;
            const r = isBold ? `<strong>${rightContent}</strong>` : rightContent;
            html += `<tr><${tag}>${l}</${tag}><${tag}>${r}</${tag}></tr>`;
        }
    });

    if (isOpen) html += '</tbody></table>';
    return html;
}

function _generateBrText() {
    const container = _getContainer();
    if (!container) return '';

    let text = '';
    container.querySelectorAll(SEL.BLOC).forEach(row => {
        if (row.classList.contains(ROW_CLASSES.NEW_TABLE)) { text += '<br>'; return; }

        let left = row.querySelector(SEL.INPUT_LEFT)?.value || '';
        const right = row.querySelector(SEL.INPUT_RIGHT)?.value || '';

        if ((row.classList.contains(ROW_CLASSES.ADDED) && !right.trim()) || (!left.trim() && !right.trim())) return;

        if (left.match(/Харчова цінність|Пищевая ценность/gi)) left = '';

        const sanitizedLeft = _sanitize(left);
        let line;

        if (row.classList.contains(ROW_CLASSES.H3) || row.classList.contains(ROW_CLASSES.COLSPAN2) || row.classList.contains(ROW_CLASSES.SINGLE)) {
            line = sanitizedLeft;
        } else {
            line = `${sanitizedLeft} ${_sanitize(right)}`.trim();
        }

        if (row.classList.contains(ROW_CLASSES.H3) || row.classList.contains(ROW_CLASSES.BOLD) ||
            row.classList.contains(ROW_CLASSES.TH_STRONG) || row.classList.contains(ROW_CLASSES.TH)) {
            if (line) line = `<strong>${line}</strong>`;
        }

        if (line) text += line + '<br>';
    });

    return text;
}

// ═══════════════════════════════════════════════════════════════════════════
// FILL EDITORS
// ═══════════════════════════════════════════════════════════════════════════

function _handleFill() {
    const htmlTable = _generateHtmlTable();
    const brText = _generateBrText();

    if (!htmlTable && !brText) {
        showToast('Таблиця порожня', 'warning');
        return;
    }

    if (_fillCallback) {
        _fillCallback(htmlTable, brText);
        showToast('Склад заповнено', 'success');
    }
}
