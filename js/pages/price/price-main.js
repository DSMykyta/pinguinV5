// js/pages/price/price-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PRICE - MAIN INITIALIZATION MODULE                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Головний файл ініціалізації системи прайсу/чекліста викладки.
 * Координує ініціалізацію всіх модулів.
 */

import { initTooltips } from '../../components/feedback/tooltip.js';
import './price-aside.js';
import { initPriceImport } from './price-import.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';

export { priceState } from './price-state.js';

/**
 * Головна функція ініціалізації модуля Price
 */
export function initPrice() {
    // Ініціалізувати tooltip систему
    initTooltips();

    // Завантажити UI одразу (без даних)
    initializeUIWithoutData();

    // Перевірити стан авторизації
    checkAuthAndLoadData();

    // Слухати події зміни авторизації
    document.addEventListener('auth-state-changed', (event) => {
        if (event.detail.isAuthorized) {
            checkAuthAndLoadData();
        }
    });
}

/**
 * Перевірити авторизацію та завантажити дані
 */
async function checkAuthAndLoadData() {
    if (window.isAuthorized) {
        // Завантажити дані прайсу та користувачів паралельно
        const { loadPriceData, loadUsersData } = await import('./price-data.js');
        await Promise.all([
            loadPriceData(),
            loadUsersData()
        ]);

        // Оновити UI з даними
        await updateUIWithData();
    }
}

/**
 * Ініціалізація UI без даних
 */
async function initializeUIWithoutData() {
    // Ініціалізувати імпорт (drag-drop та file input)
    initPriceImport();

    // 3. Показати порожню таблицю з аватаром
    const container = document.getElementById('price-table-container');
    if (container) {
        container.innerHTML = renderAvatarState('authLogin', {
            message: 'Авторизуйтесь для завантаження даних',
            size: 'medium',
            containerClass: 'empty-state',
            avatarClass: 'empty-state-avatar',
            messageClass: 'avatar-state-message',
            showMessage: true
        });
    }
}

/**
 * Оновити UI після завантаження даних
 */
async function updateUIWithData() {
    // 1. Ініціалізувати dropdowns
    const { initDropdowns } = await import('../../components/forms/dropdown.js');
    initDropdowns();

    // 3. Заповнити таби резервів (юзерів з аватарками)
    const { populateReserveTabs } = await import('./price-ui.js');
    populateReserveTabs();

    // 5. Відрендерити таблицю (createManagedTable створює колонки + пошук автоматично)
    const { renderPriceTable } = await import('./price-table.js');
    renderPriceTable();

    // 6. Ініціалізувати dropdowns
    const { initDropdowns } = await import('../../components/forms/dropdown.js');
    initDropdowns();

    // 7. Ініціалізувати події таблиці
    const { initPriceEvents } = await import('./price-events.js');
    initPriceEvents();
}

/**
 * Публічна функція для оновлення таблиці
 */
export async function refreshPriceTable() {
    const { loadPriceData } = await import('./price-data.js');
    await loadPriceData();

    const { renderPriceTable } = await import('./price-table.js');
    await renderPriceTable();
}

// Експорт для window (backward compatibility)
window.refreshPriceTable = refreshPriceTable;
