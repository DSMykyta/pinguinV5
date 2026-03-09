// js/pages/products/products-crud-table-generator.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          PRODUCTS CRUD — TABLE GENERATOR (WIZARD BRIDGE)                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — підключає generator-table в wizard модал товару.
 *
 * Завантажує aside-table.html в col-4, ініціалізує генератор
 * з тим самим кодом без дублювання.
 */

import { loadHTML } from '../../utils/html-loader.js';

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

    // 2. Динамічно імпортуємо та ініціалізуємо генератор
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
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

export function init() {
    document.addEventListener('modal-opened', onModalOpened);
    document.addEventListener('modal-closed', onModalClosed);
}
