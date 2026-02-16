// js/generators/generator-table/gt-calculator.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE GENERATOR LEGO - CALCULATOR                     ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Математичні розрахунки для таблиці                          ║
 * ║                                                                          ║
 * ║  ФУНКЦІЇ:                                                                ║
 * ║  - calculatePercentages() — Розрахунок відсотків БЖВ                     ║
 * ║  - markEssentialAminoAcids() — Позначення незамінних амінокислот         ║
 * ║  - checkForEmptyNutritionFacts() — Валідація перед генерацією            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getTableDOM } from './gt-dom.js';
import { NUTRITION_PATTERNS, SELECTORS } from './gt-config.js';
import { showToast } from '../../common/ui-toast.js';
import { markPluginLoaded } from './gt-state.js';

export const PLUGIN_NAME = 'gt-calculator';

// ============================================================================
// ІНІЦІАЛІЗАЦІЯ
// ============================================================================

export function init() {
    markPluginLoaded(PLUGIN_NAME);
}

// ============================================================================
// CALCULATIONS
// ============================================================================

/**
 * Головна функція для розрахунку відсотків.
 */
export function calculatePercentages() {
    const dom = getTableDOM();
    if (!dom.rowsContainer) return;

    const servingRow = Array.from(dom.rowsContainer.querySelectorAll(SELECTORS.INPUTS_BLOC))
        .find(r => r.querySelector(SELECTORS.INPUT_LEFT).value.match(NUTRITION_PATTERNS.SERVING));

    let servingWeight = 0;
    if (servingRow) {
        const weightMatch = servingRow.querySelector(SELECTORS.INPUT_RIGHT).value.match(/(\d+(\.\d+)?)/);
        if (weightMatch) servingWeight = parseFloat(weightMatch[0]);
    }

    if (servingWeight === 0) {
        dom.rowsContainer.querySelectorAll(SELECTORS.INPUT_TAG).forEach(span => {
            span.textContent = '';
            span.classList.remove('visible');
        });
        return;
    }

    NUTRITION_PATTERNS.NUTRIENTS.forEach(nutrient => {
        const row = Array.from(dom.rowsContainer.querySelectorAll(SELECTORS.INPUTS_BLOC))
            .find(r => r.querySelector(SELECTORS.INPUT_LEFT).value.includes(nutrient));

        if (row) {
            const value = parseFloat(row.querySelector(SELECTORS.INPUT_RIGHT).value.replace(',', '.')) || 0;
            const percentage = value > 0 ? `${Math.round((value / servingWeight) * 100)}%` : '';
            const toolSpan = row.querySelector(SELECTORS.INPUT_TAG);
            toolSpan.textContent = percentage;
            toolSpan.classList.toggle('visible', !!percentage);
        }
    });
}

// ============================================================================
// AMINO ACIDS MARKING
// ============================================================================

const ESSENTIAL_AMINOS = [
    'гістидин', 'гистидин',
    'ізолейцин', 'изолейцин',
    'лейцин',
    'лізин', 'лизин',
    'метіонін', 'метионин',
    'фенілаланін', 'фенилаланин',
    'треонін', 'треонин',
    'триптофан',
    'валін', 'валин'
];

/**
 * Позначає незамінні амінокислоти кольоровим індикатором.
 */
export function markEssentialAminoAcids() {
    const dom = getTableDOM();
    if (!dom.rowsContainer) return;

    const rows = dom.rowsContainer.querySelectorAll(SELECTORS.INPUTS_BLOC);

    rows.forEach(row => {
        const leftValue = row.querySelector(SELECTORS.INPUT_LEFT)?.value.toLowerCase() || '';
        const toolSpan = row.querySelector(SELECTORS.INPUT_TAG);

        if (!toolSpan) return;

        const isEssential = ESSENTIAL_AMINOS.some(amino => leftValue.includes(amino));

        if (isEssential) {
            toolSpan.textContent = 'EAA';
            toolSpan.classList.add('visible', 'essential-amino');
        } else {
            toolSpan.classList.remove('essential-amino');
            if (toolSpan.textContent === 'EAA') {
                toolSpan.textContent = '';
                toolSpan.classList.remove('visible');
            }
        }
    });
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Перевіряє, чи заповнене праве поле у рядку "Пищевая ценность".
 * @param {boolean} [silent=false] - Якщо true, не показувати повідомлення.
 * @returns {boolean} - true, якщо поле порожнє.
 */
export function checkForEmptyNutritionFacts(silent = false) {
    const dom = getTableDOM();
    if (!dom.rowsContainer) return false;

    const nutritionRow = Array.from(dom.rowsContainer.querySelectorAll(SELECTORS.INPUTS_BLOC))
        .find(row => row.querySelector(SELECTORS.INPUT_LEFT).value.match(NUTRITION_PATTERNS.SERVING));

    if (nutritionRow && !nutritionRow.querySelector(SELECTORS.INPUT_RIGHT).value.trim()) {
        if (!silent) {
            showToast('Обов\'язкове поле "Пищевая ценность" не заповнено!', 'error');
        }
        return true;
    }
    return false;
}