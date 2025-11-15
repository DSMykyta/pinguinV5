// js/banned-words/banned-words-aside.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                BANNED WORDS - ASIDE PANEL MANAGEMENT                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Відповідає за:
 * - Завантаження aside панелі
 * - Ініціалізацію подій aside панелі перевірки
 * - Завантаження колонок аркуша
 * - Обробників для табу управління (пошук, додавання, оновлення)
 */

import { bannedWordsState } from './banned-words-init.js';
import { initCustomSelects, reinitializeCustomSelect } from '../common/ui-select.js';
import { populateCheckSelects } from './banned-words-ui.js';

/**
 * Завантажити aside панель
 */
export async function loadAside() {
    const panelRightContent = document.getElementById('panel-right-content');
    if (!panelRightContent) return;

    try {
        const response = await fetch('templates/aside/aside-banned-words.html');
        if (!response.ok) throw new Error('Failed to load aside');

        const html = await response.text();
        panelRightContent.innerHTML = html;

        // Ініціалізувати custom selects в aside
        initCustomSelects(panelRightContent);

        // Ініціалізувати dropdown меню
        const { initDropdowns } = await import('../common/ui-dropdown.js');
        initDropdowns();

        // Приховати кнопку фільтрів пошуку за замовчуванням (показувати тільки на tab-manage)
        const searchFilterBtn = document.querySelector('[data-dropdown-trigger][aria-label="Фільтри пошуку"]');
        if (searchFilterBtn) {
            const activeTab = document.querySelector('.tab-content.active');
            const tabId = activeTab ? activeTab.dataset.tabContent : 'tab-manage';
            searchFilterBtn.classList.toggle('u-hidden', !(tabId === 'tab-manage'));
        }

        console.log('✅ Aside завантажено');
    } catch (error) {
        console.error('❌ Помилка завантаження aside:', error);
    }
}

/**
 * Обробники для aside панелі перевірки
 */
export function initCheckPanelEvents() {
    const sheetSelect = document.getElementById('aside-select-sheet');
    const wordSelect = document.getElementById('aside-select-word');
    const columnSelect = document.getElementById('aside-select-column');
    const checkButton = document.getElementById('aside-btn-check');

    if (!sheetSelect || !wordSelect || !columnSelect || !checkButton) return;

    // Уникнути дублювання обробників
    if (sheetSelect.dataset.eventsInit) return;
    sheetSelect.dataset.eventsInit = 'true';

    const updateCheckButton = () => {
        const sheetSelected = sheetSelect.value !== '';
        const wordSelected = wordSelect.value !== '';
        const columnSelected = columnSelect.value !== '';

        bannedWordsState.selectedSheet = sheetSelect.value || null;
        bannedWordsState.selectedWord = wordSelect.value || null;
        bannedWordsState.selectedColumn = columnSelect.value || null;

        checkButton.disabled = !(sheetSelected && wordSelected && columnSelected);
    };

    // При виборі аркуша - завантажити поля динамічно
    sheetSelect.addEventListener('change', async () => {
        updateCheckButton();

        if (sheetSelect.value) {
            await loadSheetColumns(sheetSelect.value);
        } else {
            columnSelect.innerHTML = '<option value="">-- Оберіть аркуш спочатку --</option>';
        }
    });

    wordSelect.addEventListener('change', updateCheckButton);
    columnSelect.addEventListener('change', updateCheckButton);

    checkButton.addEventListener('click', async () => {
        if (!bannedWordsState.selectedSheet || !bannedWordsState.selectedWord || !bannedWordsState.selectedColumn) return;

        // Створити новий таб для результатів
        // Таб автоматично завантажить дані при першій активації
        const { createCheckResultsTab } = await import('./banned-words-tabs.js');
        await createCheckResultsTab();
    });
}

/**
 * Завантажити список колонок для вибраного аркуша
 * @param {string} sheetName - Назва аркуша
 */
export async function loadSheetColumns(sheetName) {
    const columnSelect = document.getElementById('aside-select-column');
    if (!columnSelect) return;

    try {
        // Показати loader
        columnSelect.innerHTML = '<option value="">-- Завантаження... --</option>';
        columnSelect.disabled = true;

        // Завантажити заголовки аркуша
        const { getSheetHeaders } = await import('./banned-words-data.js');
        const headers = await getSheetHeaders(sheetName);

        if (!headers || headers.length === 0) {
            columnSelect.innerHTML = '<option value="">-- Немає колонок --</option>';
            return;
        }

        // Фільтрувати тільки текстові поля
        const textColumns = headers.filter(header => {
            const h = header.toLowerCase();
            return h.includes('description') || h.includes('ukr') || h.includes('ros') || h.includes('text');
        });

        // Заповнити select
        columnSelect.innerHTML = '<option value="">-- Оберіть колонку --</option>';
        textColumns.forEach(column => {
            const option = document.createElement('option');
            option.value = column;
            option.textContent = column;
            columnSelect.appendChild(option);
        });

        // Reinit custom select після заповнення
        reinitializeCustomSelect(columnSelect);

        columnSelect.disabled = false;

        console.log(`✅ Завантажено ${textColumns.length} текстових колонок з аркуша "${sheetName}"`);
    } catch (error) {
        console.error('❌ Помилка завантаження колонок:', error);
        columnSelect.innerHTML = '<option value="">-- Помилка завантаження --</option>';
        columnSelect.disabled = false;
    }
}

/**
 * Обробники для табу управління (пошук, додавання, оновлення)
 */
export function initManageTabEvents() {
    // Кнопка додавання слова
    const addButton = document.getElementById('btn-add-banned-word');
    if (addButton) {
        addButton.addEventListener('click', async () => {
            const { openBannedWordModal } = await import('./banned-words-manage.js');
            await openBannedWordModal();
        });
    }

    // Пошук
    const searchInput = document.getElementById('search-banned-words');
    const clearSearchBtn = document.getElementById('clear-search-banned-words');

    if (searchInput) {
        searchInput.addEventListener('input', async (e) => {
            bannedWordsState.searchQuery = e.target.value.toLowerCase();

            // Показати/сховати кнопку очищення
            if (clearSearchBtn) {
                clearSearchBtn.classList.toggle('u-hidden', !(e.target.value));
            }

            // Знайти активний таб і викликати його renderFn
            const activeTab = document.querySelector('.tab-content.active');
            if (activeTab) {
                const tabId = activeTab.dataset.tabContent;
                const tabPagination = bannedWordsState.tabPaginations[tabId];
                if (tabPagination && tabPagination.renderFn) {
                    await tabPagination.renderFn();
                }
            }
        });
    }

    // Кнопка очищення пошуку
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', async () => {
            if (searchInput) {
                searchInput.value = '';
                bannedWordsState.searchQuery = '';
                clearSearchBtn.classList.add('u-hidden');

                // Знайти активний таб і викликати його renderFn
                const activeTab = document.querySelector('.tab-content.active');
                if (activeTab) {
                    const tabId = activeTab.dataset.tabContent;
                    const tabPagination = bannedWordsState.tabPaginations[tabId];
                    if (tabPagination && tabPagination.renderFn) {
                        await tabPagination.renderFn();
                    }
                }
            }
        });
    }

    // Кнопка оновлення табу
    const refreshTabButton = document.getElementById('refresh-tab-manage');
    if (refreshTabButton) {
        refreshTabButton.addEventListener('click', async () => {
            console.log('🔄 Оновлення табу...');

            // Додати клас обертання до іконки
            refreshTabButton.disabled = true;
            const icon = refreshTabButton.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.classList.add('is-spinning');
            }

            try {
                const { loadBannedWords } = await import('./banned-words-data.js');
                await loadBannedWords();
                const { renderBannedWordsTable } = await import('./banned-words-manage.js');
                await renderBannedWordsTable();

                // Оновити pagination
                if (bannedWordsState.paginationAPI) {
                    bannedWordsState.paginationAPI.updateTotalItems(bannedWordsState.bannedWords.length);
                }

                console.log('✅ Таб оновлено');
            } catch (error) {
                console.error('❌ Помилка оновлення:', error);
            } finally {
                refreshTabButton.disabled = false;
                if (icon) {
                    icon.classList.remove('is-spinning');
                }
            }
        });
    }
}

/**
 * Ініціалізувати кнопку оновлення даних
 */
export function initRefreshButton() {
    const button = document.getElementById('refresh-data-btn');
    if (!button) return;

    button.addEventListener('click', async () => {
        button.disabled = true;
        console.log('🔄 Оновлення заборонених слів...');

        try {
            // Очистити кеш перевірок
            const { clearAllCheckCache } = await import('./banned-words-init.js');
            clearAllCheckCache();

            const { loadBannedWords } = await import('./banned-words-data.js');
            await loadBannedWords();

            // Оновити таблицю якщо в табі управління
            if (bannedWordsState.currentTab === 'tab-manage') {
                const { renderBannedWordsTable } = await import('./banned-words-manage.js');
                await renderBannedWordsTable();
            }

            // Оновити селекти
            populateCheckSelects();

            console.log('✅ Заборонені слова оновлено');
        } catch (error) {
            console.error('❌ Помилка оновлення:', error);
        } finally {
            button.disabled = false;
        }
    });
}
