// js/pages/banned-words/banned-words-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            BANNED WORDS - MAIN INITIALIZATION MODULE                     ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔒 ЯДРО (прямий імпорт):                                               ║
 * ║  ├── banned-words-state.js           — State модуля                      ║
 * ║                                                                          ║
 * ║  🔌 ПЛАГІНИ (loadPlugins → Promise.allSettled):                          ║
 * ║  ├── banned-words-aside.js           — Aside панель                      ║
 * ║  ├── banned-words-tabs.js            — Динамічні таби                    ║
 * ║  ├── banned-words-events.js          — Обробники подій                   ║
 * ║  ├── banned-words-ui.js              — UI менеджмент                     ║
 * ║  ├── banned-words-manage.js          — CRUD таблиця                      ║
 * ║  ├── banned-words-check.js           — Перевірка текстів                 ║
 * ║  ├── banned-words-batch.js           — Масові операції                   ║
 * ║  └── banned-words-product-modal.js   — Модал товару                      ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { initTooltips } from '../../components/feedback/tooltip.js';
import './banned-words-aside.js';
import { initCheckPanelEvents } from './banned-words-aside.js';
import { showAsidePanels } from './banned-words-ui.js';
import { initTabHandlers } from './banned-words-tabs.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';

// ── Ядро (прямий імпорт) ──
import { bannedWordsState } from './banned-words-state.js';

export { bannedWordsState, getCachedCheckResults, setCachedCheckResults, invalidateCheckCache, clearAllCheckCache } from './banned-words-state.js';

// ── Плагіни ──
const PLUGINS = [
    () => import('./banned-words-aside.js'),
    () => import('./banned-words-tabs.js'),
    () => import('./banned-words-events.js'),
    () => import('./banned-words-ui.js'),
    () => import('./banned-words-manage.js'),
    () => import('./banned-words-check.js'),
    () => import('./banned-words-batch.js'),
    () => import('./banned-words-product-modal.js'),
];

/**
 * Завантажити плагіни через Promise.allSettled
 */
async function loadPlugins(state) {
    const results = await Promise.allSettled(
        PLUGINS.map(fn => fn())
    );

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.init) {
            result.value.init(state);
        } else if (result.status === 'rejected') {
            console.warn(`[BannedWords] ⚠️ Плагін ${index} — не завантажено`);
        }
    });
}

/**
 * Головна функція ініціалізації модуля Banned Words
 */
export function initBannedWords() {
    // Завантажити плагіни
    loadPlugins(bannedWordsState);

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
    const { renderBannedWordsTable } = await import('./banned-words-manage.js');
    await renderBannedWordsTable();

    // 4. Ініціалізувати події
    const { initBannedWordsEvents } = await import('./banned-words-events.js');
    initBannedWordsEvents();

    // 6. Ініціалізувати обробники aside (FAB та refresh вже ініціалізовані в initializeUIWithoutData)
    initCheckPanelEvents();
}
