// js/generators/generator-table/gt-row-renderer.js

import { incrementRowCounter } from './gt-state.js';
import { ROW_CLASSES } from './gt-config.js';
import { insertRowAbove, insertRowBelow, deleteRow } from './gt-row-manager.js';

let rowTemplate = null;

async function getRowTemplate() {
    if (rowTemplate) return rowTemplate;
    try {
        const response = await fetch('/templates/partials/table-row.html');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        rowTemplate = await response.text();
        return rowTemplate;
    } catch (e) {
        console.error("Не вдалося завантажити шаблон table-row.html:", e);
        return '';
    }
}

export async function renderNewRow() {
    const rowId = incrementRowCounter();
    const template = await getRowTemplate();
    const html = template.replace(/{{rowId}}/g, rowId);

    const newRow = document.createElement('div');
    newRow.className = `inputs-bloc ${ROW_CLASSES.TD}`;
    newRow.id = `inputs-bloc-${rowId}`;
    newRow.innerHTML = html;

    attachRowEvents(newRow);
    return newRow;
}

function syncDropdownState(row, dropdown) {
    const rowClasses = row.classList;

    const boldButton = dropdown.querySelector('[data-class="bold"]');
    if (boldButton) {
        const isImplicitlyBold = rowClasses.contains(ROW_CLASSES.TH_STRONG) || rowClasses.contains(ROW_CLASSES.H2);
        const isExplicitlyBold = rowClasses.contains(ROW_CLASSES.BOLD);
        boldButton.classList.toggle('active', isImplicitlyBold || isExplicitlyBold);
        boldButton.toggleAttribute('disabled', isImplicitlyBold);
    }
    
    dropdown.querySelectorAll('[data-class]').forEach(button => {
        const classToCheck = button.dataset.class;
        if (classToCheck !== ROW_CLASSES.BOLD && !ROW_CLASSES.EXCLUSIVE.includes(classToCheck)) {
            button.classList.toggle('active', rowClasses.contains(classToCheck));
        }
    });

    ROW_CLASSES.EXCLUSIVE.forEach(cls => {
        dropdown.querySelector(`[data-class="${cls}"]`)?.classList.remove('active');
    });

    let exclusiveClassFound = false;
    for (const cls of ROW_CLASSES.EXCLUSIVE) {
        if (rowClasses.contains(cls)) {
            dropdown.querySelector(`[data-class="${cls}"]`)?.classList.add('active');
            exclusiveClassFound = true;
            break;
        }
    }
    if (!exclusiveClassFound) {
        dropdown.querySelector(`[data-class="${ROW_CLASSES.TD}"]`)?.classList.add('active');
    }
}

function attachRowEvents(row) {
    const dropdown = row.querySelector('.dropdown-menu');
    const triggerBtn = row.querySelector('[data-dropdown-trigger]');
    const closeBtn = row.querySelector('[data-action="delete-row"]');

    if (!dropdown || !triggerBtn || !closeBtn) {
        console.error('Помилка в attachRowEvents: не знайдено елементи керування.');
        return;
    }
    
    triggerBtn.addEventListener('click', () => {
        syncDropdownState(row, dropdown);
    });

    closeBtn.addEventListener('click', () => deleteRow(row));

    dropdown.querySelectorAll('[data-class], [data-action]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            if (button.disabled) return;

            const action = button.dataset.action;
            const classToApply = button.dataset.class;

            if (action) {
                if (action === 'insert-above') insertRowAbove(row);
                if (action === 'insert-below') insertRowBelow(row);
            } else if (classToApply) {
                handleOptionClick(row, classToApply);
            }
            
            syncDropdownState(row, dropdown);
        });
    });

    dropdown.querySelectorAll('input[type="radio"]').forEach(input => {
        input.addEventListener('change', () => handleInputTypeSwitch(row, input.value));
    });

    dropdown.addEventListener('click', (e) => e.stopPropagation());
}

function handleOptionClick(row, classToApply) {
    const isExclusive = ROW_CLASSES.EXCLUSIVE.includes(classToApply);
    
    if (isExclusive) {
        row.classList.remove(ROW_CLASSES.BOLD);
        ROW_CLASSES.EXCLUSIVE.forEach(cls => row.classList.remove(cls));
        row.classList.add(classToApply);
    } else {
        row.classList.toggle(classToApply);
    }
}

export function handleInputTypeSwitch(row, type) {
    ['.input-left', '.input-right'].forEach(selector => {
        const oldEl = row.querySelector(selector);
        if(!oldEl) return;
        const newEl = document.createElement(type === 'field' ? 'textarea' : 'input');
        newEl.className = oldEl.className;
        newEl.placeholder = oldEl.placeholder;
        newEl.value = oldEl.value;
        if (type === 'row') newEl.autocomplete = 'off';
        oldEl.parentNode.replaceChild(newEl, oldEl);
    });
}