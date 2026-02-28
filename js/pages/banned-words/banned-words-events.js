// js/pages/banned-words/banned-words-events.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                     BANNED WORDS EVENTS                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Обробники подій модуля заборонених слів                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { bannedWordsState } from './banned-words-state.js';

/**
 * Ініціалізація всіх обробників подій
 */
export function initBannedWordsEvents() {
    // Обробка чекбоксів тепер виконується через batch actions system в banned-words-manage.js
    // Сортування тепер через Table LEGO плагіни (banned-words-manage.js, banned-words-check.js)
    // Фільтри і пошук обробляються в banned-words-aside.js
}

/**
 * Обробка чекбоксів (вибір рядків)
 */
function initCheckboxEvents() {
    const contentContainer = document.getElementById('tab-content-container');
    if (!contentContainer) return;

    // Делегування подій для чекбоксів рядків
    contentContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('row-checkbox')) {
            const productId = e.target.dataset.id;

            if (e.target.checked) {
                bannedWordsState.selectedIds.add(productId);
            } else {
                bannedWordsState.selectedIds.delete(productId);
            }

            updateHeaderCheckbox();
        }
    });

    // Header checkbox (select all)
    contentContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('header-select-all')) {
            const isChecked = e.target.checked;
            const checkboxes = contentContainer.querySelectorAll('.row-checkbox');

            checkboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
                const productId = checkbox.dataset.id;

                if (isChecked) {
                    bannedWordsState.selectedIds.add(productId);
                } else {
                    bannedWordsState.selectedIds.delete(productId);
                }
            });
        }
    });
}

/**
 * Оновити стан header checkbox (select all)
 */
function updateHeaderCheckbox() {
    const headerCheckbox = document.querySelector('.header-select-all');
    if (!headerCheckbox) return;

    const allCheckboxes = document.querySelectorAll('.row-checkbox');
    const checkedCheckboxes = document.querySelectorAll('.row-checkbox:checked');

    if (allCheckboxes.length === 0) {
        headerCheckbox.checked = false;
        headerCheckbox.indeterminate = false;
    } else if (checkedCheckboxes.length === 0) {
        headerCheckbox.checked = false;
        headerCheckbox.indeterminate = false;
    } else if (checkedCheckboxes.length === allCheckboxes.length) {
        headerCheckbox.checked = true;
        headerCheckbox.indeterminate = false;
    } else {
        headerCheckbox.checked = false;
        headerCheckbox.indeterminate = true;
    }
}

// initBannedWordsSorting та initCheckTabSorting — тепер сортування
// обробляється через Table LEGO плагіни в banned-words-manage.js та banned-words-check.js

// ── LEGO Plugin interface ──
export function init(state) { /* orchestrated by banned-words-main.js */ }
