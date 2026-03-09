// js/pages/products/products-crud-table-generator.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          PRODUCTS CRUD — TABLE GENERATOR (WIZARD BRIDGE)                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — підключає generator-table в wizard модал товару.
 *
 * Завантажує aside-table.html в col-2, ініціалізує генератор
 * з тим самим кодом без дублювання.
 *
 * Кнопка "Додати" — генерує HTML/BR і вставляє в editor секції
 * "Код складу" та "1 порція" (замість копіювання в буфер).
 */

import { loadHTML } from '../../utils/html-loader.js';
import { showToast } from '../../components/feedback/toast.js';

let _initialized = false;

// ═══════════════════════════════════════════════════════════════════════════
// MODAL EVENTS
// ═══════════════════════════════════════════════════════════════════════════

async function onModalOpened(e) {
    if (e.detail.modalId !== 'product-edit') return;
    if (_initialized) return;

    const asideContainer = document.getElementById('wizard-table-aside');
    if (!asideContainer) return;

    // 1. Завантажуємо шаблон кнопок
    await loadHTML('templates/aside/aside-table.html', asideContainer);

    // 2. Wizard: показати "Додати", сховати "Склад" і "1 порція"
    const cardHtml = document.getElementById('result-card-html');
    const cardBr = document.getElementById('result-card-br');
    const cardInsert = document.getElementById('result-card-insert');
    if (cardHtml) cardHtml.classList.add('u-hidden');
    if (cardBr) cardBr.classList.add('u-hidden');
    if (cardInsert) {
        cardInsert.classList.remove('u-hidden');
        cardInsert.addEventListener('click', handleInsert);
    }

    // 3. Динамічно імпортуємо та ініціалізуємо генератор
    const { initTableGenerator } = await import('../../generators/generator-table/gt-main.js');
    await initTableGenerator(asideContainer);

    _initialized = true;
    console.log('[Products] Table generator connected to wizard');
}

function onModalClosed(e) {
    if (e.detail.modalId !== 'product-edit') return;
    if (!_initialized) return;

    _initialized = false;

    // Скидаємо генератор для наступного відкриття
    import('../../generators/generator-table/gt-main.js').then(({ destroyTableGenerator }) => {
        destroyTableGenerator();
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// INSERT INTO EDITORS
// ═══════════════════════════════════════════════════════════════════════════

async function handleInsert() {
    const { generateHtmlTable } = await import('../../generators/generator-table/gt-html-builder.js');
    const { generateBrText } = await import('../../generators/generator-table/gt-br-builder.js');
    const { checkForEmptyNutritionFacts } = await import('../../generators/generator-table/gt-calculator.js');

    if (checkForEmptyNutritionFacts()) return;

    const htmlResult = generateHtmlTable();
    const brResult = generateBrText();

    // Код складу → UA editor
    const codeUa = document.querySelector('#product-composition-code-ua-editor [contenteditable]');
    if (codeUa && htmlResult) codeUa.innerHTML = htmlResult;

    // 1 порція → UA editor
    const notesUa = document.querySelector('#product-composition-notes-ua-editor [contenteditable]');
    if (notesUa && brResult) notesUa.innerHTML = brResult;

    showToast('Склад додано в секції', 'success');
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

export function init() {
    document.addEventListener('modal-opened', onModalOpened);
    document.addEventListener('modal-closed', onModalClosed);
}
