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
import { showToast } from '../../components/feedback/toast.js';
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

function collectInputRows(rowsContainer) {
    return Array.from(rowsContainer.querySelectorAll(SELECTORS.INPUTS_BLOC)).map(row => ({
        left: row.querySelector(SELECTORS.INPUT_LEFT),
        right: row.querySelector(SELECTORS.INPUT_RIGHT),
        tag: row.querySelector(SELECTORS.INPUT_TAG)
    }));
}

export function updateCalculatedTableHints() {
    const dom = getTableDOM();
    if (!dom.rowsContainer) return;

    const rowsData = collectInputRows(dom.rowsContainer);
    calculatePercentages(rowsData);
    markEssentialAminoAcids(rowsData);
}

/**
 * Головна функція для розрахунку відсотків.
 */
export function calculatePercentages(rowsData = null) {
    const dom = getTableDOM();
    if (!dom.rowsContainer) return;

    const rows = rowsData || collectInputRows(dom.rowsContainer);
    const servingRow = rows.find(item => (item.left?.value || '').match(NUTRITION_PATTERNS.SERVING));

    let servingWeight = 0;
    if (servingRow) {
        const weightMatch = (servingRow.right?.value || '').match(/(\d+(\.\d+)?)/);
        if (weightMatch) servingWeight = parseFloat(weightMatch[0]);
    }

    if (servingWeight === 0) {
        rows.forEach(item => {
            if (!item.tag) return;
            item.tag.textContent = '';
            item.tag.classList.remove('visible');
        });
        return;
    }

    const nutrientRows = new Map();
    rows.forEach(item => {
        const leftValue = item.left?.value || '';
        NUTRITION_PATTERNS.NUTRIENTS.forEach(nutrient => {
            if (!nutrientRows.has(nutrient) && leftValue.includes(nutrient)) {
                nutrientRows.set(nutrient, item);
            }
        });
    });

    NUTRITION_PATTERNS.NUTRIENTS.forEach(nutrient => {
        const item = nutrientRows.get(nutrient);
        if (item?.tag) {
            const value = parseFloat((item.right?.value || '').replace(',', '.')) || 0;
            const percentage = value > 0 ? `${Math.round((value / servingWeight) * 100)}%` : '';
            item.tag.textContent = percentage;
            item.tag.classList.toggle('u-hidden', !percentage);
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
export function markEssentialAminoAcids(rowsData = null) {
    const dom = getTableDOM();
    if (!dom.rowsContainer) return;

    const rows = rowsData || collectInputRows(dom.rowsContainer);

    rows.forEach(item => {
        const leftValue = item.left?.value.toLowerCase() || '';
        const toolSpan = item.tag;

        if (!toolSpan) return;

        const isEssential = ESSENTIAL_AMINOS.some(amino => leftValue.includes(amino));

        if (isEssential) {
            toolSpan.textContent = 'EAA';
            toolSpan.classList.remove('u-hidden', 'c-main');
            toolSpan.classList.add('c-yellow');
        } else {
            toolSpan.classList.remove('c-yellow');
            toolSpan.classList.add('c-main');
            if (toolSpan.textContent === 'EAA') {
                toolSpan.textContent = '';
                toolSpan.classList.add('u-hidden');
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
