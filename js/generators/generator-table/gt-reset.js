// js/generators/generator-table/gt-reset.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE GENERATOR LEGO - RESET PLUGIN                   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Очищення таблиці                                            ║
 * ║                                                                          ║
 * ║  ФУНКЦІЇ:                                                                ║
 * ║  - performTableReset() — Очистити всі рядки                              ║
 * ║  - Кнопка з підтвердженням через модал                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getTableDOM } from './gt-dom.js';
import { markPluginLoaded, resetRowCounter, runHook } from './gt-state.js';
import { initializeFirstRow } from './gt-row-manager.js';

export const PLUGIN_NAME = 'gt-reset';

// ============================================================================
// ІНІЦІАЛІЗАЦІЯ
// ============================================================================

export function init() {
    markPluginLoaded(PLUGIN_NAME);
    setupResetButton();
}

// ============================================================================
// RESET LOGIC
// ============================================================================

/**
 * Виконує фактичне очищення секції таблиць та UI.
 */
export function performTableReset() {
    const dom = getTableDOM();
    if (!dom.rowsContainer) return;
    const icon = dom.reloadBtn?.querySelector('span');

    // --- Анімація СТАРТ ---
    if (dom.reloadBtn) dom.reloadBtn.disabled = true;
    if (dom.reloadBtn) dom.reloadBtn.style.color = 'var(--color-primary)';
    icon?.classList.add('is-spinning');

    // Виконуємо очищення
    dom.rowsContainer.innerHTML = '';
    resetRowCounter();

    // Викликаємо хук для інших плагінів (session manager очистить сесію)
    runHook('onTableReset');

    initializeFirstRow();

    // --- Анімація СТОП ---
    if (dom.reloadBtn) dom.reloadBtn.disabled = false;
    if (dom.reloadBtn) dom.reloadBtn.style.color = 'var(--text-disabled)';
    icon?.classList.remove('is-spinning');
    if (icon) icon.style.transform = 'none';
}

// ============================================================================
// BUTTON SETUP
// ============================================================================

function setupResetButton() {
    const dom = getTableDOM();
    if (!dom.reloadBtn) return;

    // 1. Кнопка "Оновити" відкриває модал
    dom.reloadBtn.dataset.modalTrigger = 'confirm-clear-modal';
    dom.reloadBtn.dataset.modalSize = 'small';

    // 2. Слухаємо кнопку підтвердження
    document.body.addEventListener('click', handleConfirmClick);
}

function handleConfirmClick(e) {
    const confirmBtn = e.target.closest('#confirm-clear-action');
    if (confirmBtn) {
        performTableReset();
    }
}

// ============================================================================
// CLEANUP
// ============================================================================

export function destroy() {
    document.body.removeEventListener('click', handleConfirmClick);
}