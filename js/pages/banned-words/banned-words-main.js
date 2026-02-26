// js/pages/banned-words/banned-words-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            BANNED WORDS - MAIN INITIALIZATION MODULE                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Головний файл ініціалізації системи перевірки заборонених слів.
 * Відповідає тільки за координацію ініціалізації всіх модулів.
 * Уся логіка винесена в окремі модулі.
 */

import { initTooltips } from '../../components/feedback/tooltip.js';
import './banned-words-aside.js';
import { initCheckPanelEvents } from './banned-words-aside.js';
import { showAsidePanels } from './banned-words-ui.js';
import { initTabHandlers } from './banned-words-tabs.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';

export { bannedWordsState, getCachedCheckResults, setCachedCheckResults, invalidateCheckCache, clearAllCheckCache } from './banned-words-state.js';

/**
 * Головна функція ініціалізації модуля Banned Words
 */
export function initBannedWords() {
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
    // Перевіряємо глобальний стан авторизації з custom-auth.js
    if (window.isAuthorized) {

        // Завантажити ТІЛЬКИ заборонені слова
        const { loadBannedWords } = await import('./banned-words-data.js');
        await loadBannedWords();

        // Отримати список аркушів
        const { loadSheetNames } = await import('./banned-words-data.js');
        await loadSheetNames();

        // Оновити UI з даними
        await updateUIWithData();

        // Відновити збережені таби після перезавантаження
        const { restoreSavedTabs } = await import('./banned-words-tabs.js');
        await restoreSavedTabs();
    }
}

/**
 * Ініціалізація UI без даних (показати aside, порожні таблиці)
 */
async function initializeUIWithoutData() {
    // 1. Ініціалізувати обробники табів (не потребує даних)
    initTabHandlers();

    // 2. Показати порожню таблицю з аватаром
    const container = document.getElementById('banned-words-table-container');
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
    // 1. Показати панелі з даними (заповнює dropdowns)
    showAsidePanels();

    // 2. Реініціалізувати dropdowns після заповнення
    const { initDropdowns } = await import('../../components/forms/dropdown.js');
    initDropdowns();

    // 3. Відрендерити таблицю (createManagedTable створює колонки + пошук автоматично)
    const { renderBannedWordsTable, initManageTabFilters } = await import('./banned-words-manage.js');
    await renderBannedWordsTable();

    // 4.5. Ініціалізувати фільтри для табу управління
    initManageTabFilters();

    // 5. Ініціалізувати події
    const { initBannedWordsEvents } = await import('./banned-words-events.js');
    initBannedWordsEvents();

    // 6. Ініціалізувати обробники aside (FAB та refresh вже ініціалізовані в initializeUIWithoutData)
    initCheckPanelEvents();
}
