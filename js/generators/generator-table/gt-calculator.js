// js/generators/generator-table/gt-calculator.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                TABLE GENERATOR - КАЛЬКУЛЯТОР (CALCULATOR)                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * * ПРИЗНАЧЕННЯ:
 * Містить всю математичну логіку. Відповідає за розрахунок відсотків БЖВ
 * та за перевірку заповненості ключових полів перед генерацією.
 */

import { getTableDOM } from './gt-dom.js';
import { NUTRITION_PATTERNS, SELECTORS } from './gt-config.js';
// 1. Імпортуємо нову функцію для показу повідомлень
import { showToast } from '../../common/ui-toast.js';

const dom = getTableDOM();

/**
 * Головна функція для розрахунку відсотків.
 */
export function calculatePercentages() {
    const servingRow = Array.from(dom.rowsContainer.querySelectorAll(SELECTORS.INPUTS_BLOC))
        .find(r => r.querySelector(SELECTORS.INPUT_LEFT).value.match(NUTRITION_PATTERNS.SERVING));
    
    let servingWeight = 0;
    if (servingRow) {
        const weightMatch = servingRow.querySelector(SELECTORS.INPUT_RIGHT).value.match(/(\d+(\.\d+)?)/);
        if (weightMatch) servingWeight = parseFloat(weightMatch[0]);
    }

    if (servingWeight === 0) {
        dom.rowsContainer.querySelectorAll(SELECTORS.INPUT_RIGHT_TOOL).forEach(span => {
            span.textContent = '';
            span.classList.remove('tooltip-sm');
        });
        return;
    }

    NUTRITION_PATTERNS.NUTRIENTS.forEach(nutrient => {
        const row = Array.from(dom.rowsContainer.querySelectorAll(SELECTORS.INPUTS_BLOC))
            .find(r => r.querySelector(SELECTORS.INPUT_LEFT).value.includes(nutrient));
        
        if (row) {
            const value = parseFloat(row.querySelector(SELECTORS.INPUT_RIGHT).value.replace(',', '.')) || 0;
            const percentage = value > 0 ? `${Math.round((value / servingWeight) * 100)}%` : '';
            const toolSpan = row.querySelector(SELECTORS.INPUT_RIGHT_TOOL);
            toolSpan.textContent = percentage;
            toolSpan.classList.toggle('tooltip-sm', !!percentage);
        }
    });
}

/**
 * Позначає незамінні амінокислоти кольоровим індикатором.
 * Додає клас до .input-right-tool без тексту (просто кольоровий маркер).
 */
export function markEssentialAminoAcids() {
    // 9 незамінних амінокислот (укр + рос варіанти)
    const essentialAminos = [
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

    const rows = dom.rowsContainer.querySelectorAll(SELECTORS.INPUTS_BLOC);

    rows.forEach(row => {
        const leftValue = row.querySelector(SELECTORS.INPUT_LEFT)?.value.toLowerCase() || '';
        const toolSpan = row.querySelector(SELECTORS.INPUT_RIGHT_TOOL);

        if (!toolSpan) return;

        const isEssential = essentialAminos.some(amino => leftValue.includes(amino));

        if (isEssential) {
            // Додаємо клас та текст EAA (Essential Amino Acid)
            toolSpan.textContent = 'EAA';
            toolSpan.classList.add('tooltip-sm', 'essential-amino');
        } else {
            toolSpan.classList.remove('essential-amino');
            // Очищаємо текст тільки якщо це був EAA (не відсоток)
            if (toolSpan.textContent === 'EAA') {
                toolSpan.textContent = '';
                toolSpan.classList.remove('tooltip-sm');
            }
        }
    });
}

/**
 * Перевіряє, чи заповнене праве поле у рядку "Пищевая ценность".
 * @param {boolean} [silent=false] - Якщо true, не показувати повідомлення.
 * @returns {boolean} - true, якщо поле порожнє.
 */
export function checkForEmptyNutritionFacts(silent = false) {
    const nutritionRow = Array.from(dom.rowsContainer.querySelectorAll(SELECTORS.INPUTS_BLOC))
        .find(row => row.querySelector(SELECTORS.INPUT_LEFT).value.match(NUTRITION_PATTERNS.SERVING));

    if (nutritionRow && !nutritionRow.querySelector(SELECTORS.INPUT_RIGHT).value.trim()) {
        if (!silent) {
            // 2. Замінюємо alert(...) на showToast(...)
            showToast('Обов\'язкове поле "Пищевая ценность" не заповнено!', 'error');
        }
        return true;
    }
    return false;
}