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

    } catch (error) {
        console.error('❌ Помилка завантаження aside:', error);
    }
}

/**
 * Отримати вибрані значення з мультиселекту
 * @param {HTMLSelectElement} selectEl - Елемент select
 * @returns {string[]} - Масив вибраних значень
 */
function getSelectedValues(selectEl) {
    return Array.from(selectEl.selectedOptions).map(opt => opt.value).filter(v => v);
}

/**
 * Обробники для aside панелі перевірки (МУЛЬТИСЕЛЕКТ)
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

    /**
     * Оновити стан кнопки перевірки та state
     */
    const updateCheckButton = () => {
        const selectedSheets = getSelectedValues(sheetSelect);
        const selectedWords = getSelectedValues(wordSelect);
        const selectedColumns = getSelectedValues(columnSelect);

        // Оновити state (тепер масиви)
        bannedWordsState.selectedSheets = selectedSheets;
        bannedWordsState.selectedWords = selectedWords;
        bannedWordsState.selectedColumns = selectedColumns;

        // Для зворотної сумісності зберігаємо перше значення
        bannedWordsState.selectedSheet = selectedSheets[0] || null;
        bannedWordsState.selectedWord = selectedWords[0] || null;
        bannedWordsState.selectedColumn = selectedColumns[0] || null;

        // Кнопка активна якщо є хоча б по одному вибраному елементу
        checkButton.disabled = !(selectedSheets.length > 0 && selectedWords.length > 0 && selectedColumns.length > 0);
    };

    // При виборі аркуша - завантажити поля динамічно зі ВСІХ обраних аркушів
    sheetSelect.addEventListener('change', async () => {
        updateCheckButton();
        await loadColumnsForSelectedSheets();
    });

    wordSelect.addEventListener('change', updateCheckButton);
    columnSelect.addEventListener('change', updateCheckButton);

    checkButton.addEventListener('click', async () => {
        const selectedSheets = getSelectedValues(sheetSelect);
        const selectedWords = getSelectedValues(wordSelect);
        const selectedColumns = getSelectedValues(columnSelect);

        if (selectedSheets.length === 0 || selectedWords.length === 0 || selectedColumns.length === 0) return;

        // Створити новий таб для результатів
        // Таб автоматично завантажить дані при першій активації
        const { createCheckResultsTab } = await import('./banned-words-tabs.js');
        await createCheckResultsTab();
    });
}

/**
 * Завантажити колонки для всіх обраних аркушів
 */
async function loadColumnsForSelectedSheets() {
    const sheetSelect = document.getElementById('aside-select-sheet');
    const columnSelect = document.getElementById('aside-select-column');

    if (!sheetSelect || !columnSelect) return;

    const selectedSheets = getSelectedValues(sheetSelect);

    if (selectedSheets.length === 0) {
        columnSelect.innerHTML = '';
        reinitializeCustomSelect(columnSelect);
        return;
    }

    try {
        // Показати loader
        columnSelect.innerHTML = '';
        columnSelect.disabled = true;

        // Завантажити заголовки з усіх обраних аркушів
        const { getSheetHeaders } = await import('./banned-words-data.js');

        // Збираємо всі унікальні колонки з усіх аркушів
        const allColumnsSet = new Set();

        for (const sheetName of selectedSheets) {
            const headers = await getSheetHeaders(sheetName);
            if (headers && headers.length > 0) {
                // Фільтрувати тільки текстові поля
                headers.filter(header => {
                    const h = header.toLowerCase();
                    return h.includes('description') || h.includes('ukr') || h.includes('ros') || h.includes('text');
                }).forEach(col => allColumnsSet.add(col));
            }
        }

        const textColumns = Array.from(allColumnsSet).sort();

        if (textColumns.length === 0) {
            columnSelect.innerHTML = '';
            reinitializeCustomSelect(columnSelect);
            columnSelect.disabled = false;
            return;
        }

        // Заповнити select
        columnSelect.innerHTML = '';
        textColumns.forEach(column => {
            const option = document.createElement('option');
            option.value = column;
            option.textContent = column;
            columnSelect.appendChild(option);
        });

        // Reinit custom select після заповнення
        reinitializeCustomSelect(columnSelect);

        columnSelect.disabled = false;

    } catch (error) {
        console.error('❌ Помилка завантаження колонок:', error);
        columnSelect.innerHTML = '';
        reinitializeCustomSelect(columnSelect);
        columnSelect.disabled = false;
    }
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

    // Пошук — для tab-manage керується через createManagedTable (banned-words-manage.js)
    // Для check табів — ручна фільтрація через renderFn
    const searchInput = document.getElementById('search-banned-words');
    const clearSearchBtn = document.getElementById('clear-search-banned-words');

    if (searchInput) {
        searchInput.addEventListener('input', async (e) => {
            if (clearSearchBtn) {
                clearSearchBtn.classList.toggle('u-hidden', !(e.target.value));
            }

            // Для check табів — ручна фільтрація (tab-manage керується managed table)
            const activeTab = document.querySelector('.tab-content.active');
            if (activeTab) {
                const tabId = activeTab.dataset.tabContent;
                if (tabId !== 'tab-manage') {
                    bannedWordsState.searchQuery = e.target.value.toLowerCase();
                    const tabPagination = bannedWordsState.tabPaginations[tabId];
                    if (tabPagination?.renderFn) await tabPagination.renderFn();
                }
            }
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', async () => {
            if (searchInput) {
                searchInput.value = '';
                clearSearchBtn.classList.add('u-hidden');

                const activeTab = document.querySelector('.tab-content.active');
                if (activeTab) {
                    const tabId = activeTab.dataset.tabContent;
                    if (tabId === 'tab-manage') {
                        bannedWordsState.manageManagedTable?.setSearchQuery('');
                    } else {
                        bannedWordsState.searchQuery = '';
                        const tabPagination = bannedWordsState.tabPaginations[tabId];
                        if (tabPagination?.renderFn) await tabPagination.renderFn();
                    }
                }
            }
        });
    }

    // Кнопка оновлення табу
    const refreshTabButton = document.getElementById('refresh-tab-manage');
    if (refreshTabButton) {
        refreshTabButton.addEventListener('click', async () => {

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

        } catch (error) {
            console.error('❌ Помилка оновлення:', error);
        } finally {
            button.disabled = false;
        }
    });
}
