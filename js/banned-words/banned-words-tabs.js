// js/banned-words/banned-words-tabs.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                BANNED WORDS - DYNAMIC TABS MANAGEMENT                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Відповідає за:
 * - Завантаження шаблонів табів
 * - Створення динамічних check табів
 * - Перемикання між табами
 * - Закриття табів з підтвердженням
 */

import { bannedWordsState } from './banned-words-init.js';
import { showTabControls } from './banned-words-ui.js';
import { addTabToState, removeTabFromState, setActiveTab } from './banned-words-state-persistence.js';

let checkTabTemplate = null;
let checkTabContentTemplate = null;

/**
 * Завантажити шаблон кнопки табу перевірки
 * @returns {Promise<string>} HTML шаблон
 */
async function getCheckTabTemplate() {
    if (checkTabTemplate) return checkTabTemplate;
    try {
        const response = await fetch('/templates/partials/check-tab.html');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        checkTabTemplate = await response.text();
        return checkTabTemplate;
    } catch (e) {
        console.error("Не вдалося завантажити шаблон check-tab.html:", e);
        return '<div class="state-layer"><span class="label">{{selectedSheet}}: {{wordName}}</span></div>';
    }
}

/**
 * Завантажити шаблон контенту табу перевірки
 * @returns {Promise<string>} HTML шаблон
 */
async function getCheckTabContentTemplate() {
    if (checkTabContentTemplate) return checkTabContentTemplate;
    try {
        const response = await fetch('/templates/partials/check-tab-content.html');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        checkTabContentTemplate = await response.text();
        return checkTabContentTemplate;
    } catch (e) {
        console.error("Не вдалося завантажити шаблон check-tab-content.html:", e);
        return '';
    }
}

/**
 * Створити новий таб для результатів перевірки
 * @param {boolean} skipAutoActivate - Чи пропустити автоматичну активацію (для відновлення)
 */
export async function createCheckResultsTab(skipAutoActivate = false) {
    const { selectedSheet, selectedWord, selectedColumn, selectedSheets, selectedColumns } = bannedWordsState;

    // Перевірка валідності даних - не створювати таб якщо немає вибраних параметрів
    if (!selectedSheet || !selectedWord || !selectedColumn) {
        console.warn('⚠️ Неможливо створити таб перевірки - відсутні обов\'язкові параметри:', {
            selectedSheet, selectedWord, selectedColumn
        });
        return;
    }

    // Знайти слово для назви табу
    const word = bannedWordsState.bannedWords.find(w => w.local_id === selectedWord);
    // ЗМІНЕНО: Використовуємо group_name_ua
    const wordName = word ? (word.group_name_ua || 'Слово') : 'Слово';

    // Створюємо унікальний tabId який враховує ВСІ обрані аркуші та колонки
    const sheetsKey = (selectedSheets || [selectedSheet]).sort().join('-');
    const columnsKey = (selectedColumns || [selectedColumn]).sort().join('-');
    const tabId = `check-${sheetsKey}-${selectedWord}-${columnsKey}`;

    // Перевірити чи таб вже існує
    let existingTab = document.querySelector(`[data-tab-target="${tabId}"]`);
    if (existingTab) {
        // Активувати існуючий таб і перезапустити перевірку
        existingTab.click();

        // Перезапустити перевірку з поточними параметрами
        const { performCheck } = await import('./banned-words-check.js');
        await performCheck(selectedSheet, selectedWord, selectedColumn);
        return;
    }

    // Створити кнопку табу
    const tabsContainer = document.getElementById('tabs-head-container');
    const tabButton = document.createElement('button');
    tabButton.className = 'nav-icon';
    tabButton.dataset.tabTarget = tabId;

    const tabTemplate = await getCheckTabTemplate();
    const tabHtml = tabTemplate
        .replace(/{{selectedSheet}}/g, selectedSheet)
        .replace(/{{wordName}}/g, wordName);
    tabButton.innerHTML = tabHtml;

    tabsContainer.appendChild(tabButton);

    // Створити контент табу
    const contentContainer = document.getElementById('sheet-tabs-content-container');
    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';
    tabContent.dataset.tabContent = tabId;

    const contentTemplate = await getCheckTabContentTemplate();
    const contentHtml = contentTemplate.replace(/{{tabId}}/g, tabId);
    tabContent.innerHTML = contentHtml;

    contentContainer.appendChild(tabContent);

    // Зберегти параметри перевірки для цього табу
    tabButton.dataset.checkSheet = selectedSheet;
    tabButton.dataset.checkWord = selectedWord;
    tabButton.dataset.checkColumn = selectedColumn;

    // Додати обробник для кнопки refresh цього check табу
    const refreshButton = tabContent.querySelector(`#refresh-check-${tabId}`);
    if (refreshButton) {
        refreshButton.addEventListener('click', async () => {
            console.log(`🔄 Оновлення даних для табу "${tabId}"`);

            // Отримати збережені параметри перевірки з кнопки табу
            const sheet = tabButton.dataset.checkSheet;
            const word = tabButton.dataset.checkWord;
            const column = tabButton.dataset.checkColumn;

            // Інвалідувати кеш для цієї перевірки
            const { invalidateCheckCache } = await import('./banned-words-init.js');
            invalidateCheckCache(sheet, word, column);

            // Оновити state перед перевіркою
            bannedWordsState.selectedSheet = sheet;
            bannedWordsState.selectedWord = word;
            bannedWordsState.selectedColumn = column;

            // Повторно виконати перевірку для цього табу
            const { performCheck } = await import('./banned-words-check.js');
            await performCheck(sheet, word, column);
        });
    }

    console.log(`📋 Таб створено: кнопка="${tabId}", контент створено`);
    console.log(`📋 Кнопка додана до DOM:`, tabsContainer.contains(tabButton));
    console.log(`📋 Контент додано до DOM:`, contentContainer.contains(tabContent));

    // Зберегти стан табу для відновлення після перезавантаження
    addTabToState(tabId, selectedSheet, selectedWord, selectedColumn, true);

    // Активувати новий таб через клік (затримка для оновлення DOM)
    // ВИПРАВЛЕНО: Пропустити автоактивацію при відновленні табів
    if (!skipAutoActivate) {
        setTimeout(() => {
            console.log(`🖱️ Імітуємо клік по табу "${tabId}"`);
            tabButton.click();
        }, 50);
    } else {
        console.log(`⏭️ Автоактивацію пропущено для табу "${tabId}"`);
    }
}

// Прапорець для запобігання повторної ініціалізації
let handlersInitialized = false;

/**
 * Ініціалізувати обробники для всіх табів
 * Використовує делегування подій на document
 */
export function initTabHandlers() {
    if (handlersInitialized) {
        console.log('⚠️ Обробники табів вже ініціалізовані, пропускаємо...');
        return;
    }

    console.log('🎯 Ініціалізація обробників табів...');
    handlersInitialized = true;

    // Обробник для кнопки закриття табу (ПЕРШИЙ, щоб запобігти активації табу)
    document.addEventListener('click', async (e) => {
        const closeButton = e.target.closest('.tab-close-btn');
        if (!closeButton) return;

        e.preventDefault();
        e.stopPropagation();

        // Знайти батьківську кнопку табу
        const tabButton = closeButton.closest('.nav-icon');
        if (!tabButton) return;

        const tabId = tabButton.dataset.tabTarget;
        if (!tabId || tabId === 'tab-manage') return; // Не дозволяємо закрити головний таб

        console.log(`🗑️ Спроба закрити таб: ${tabId}`);

        // Використовуємо showConfirmModal з ui-modal-confirm.js
        const { showConfirmModal } = await import('../common/ui-modal-confirm.js');
        const confirmed = await showConfirmModal({
            title: 'Закрити таб?',
            message: 'Всі незбережені дані будуть втрачені. Продовжити?',
            confirmText: 'Закрити',
            cancelText: 'Скасувати',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            removeCheckTab(tabId);
        }
    });

    // Використовуємо делегування подій на document для надійності
    document.addEventListener('click', async (e) => {
        // Ігноруємо кліки на кнопці закриття табу
        if (e.target.closest('.tab-close-btn')) return;

        // Шукаємо клікнуту кнопку табу
        const tabButton = e.target.closest('.nav-icon');
        if (!tabButton) return;

        // Перевіряємо чи є data-tab-target
        const tabId = tabButton.dataset.tabTarget;
        if (!tabId) return;

        // Перевіряємо чи кнопка всередині tabs-head-container
        const tabsContainer = document.getElementById('tabs-head-container');
        if (!tabsContainer || !tabsContainer.contains(tabButton)) return;

        e.preventDefault();
        e.stopPropagation();

        console.log(`🔄 Перемикання на таб: "${tabId}"`);

        // Знімаємо active з ВСІХ кнопок
        tabsContainer.querySelectorAll('.nav-icon').forEach(btn => {
            btn.classList.remove('active');
        });

        // Знімаємо active з ВСІХ контентів
        document.querySelectorAll('.tab-content.active').forEach(content => {
            content.classList.remove('active');
        });

        // Додаємо active на клікнуту кнопку
        tabButton.classList.add('active');

        // Шукаємо контент табу
        const tabContent = document.querySelector(`[data-tab-content="${tabId}"]`);

        if (tabContent) {
            tabContent.classList.add('active');

            // Оновити активний таб в збереженому стані
            setActiveTab(tabId);

            // Відновити пагінацію для цього табу
            const tabPagination = bannedWordsState.tabPaginations[tabId];
            if (tabPagination) {
                const footer = document.querySelector('.fixed-footer');
                if (footer && footer._paginationAPI) {
                    footer._paginationAPI.update({
                        currentPage: tabPagination.currentPage,
                        pageSize: tabPagination.pageSize,
                        totalItems: tabPagination.totalItems
                    });
                    console.log(`🔄 Відновлено пагінацію для табу ${tabId}:`, {
                        currentPage: tabPagination.currentPage,
                        pageSize: tabPagination.pageSize,
                        totalItems: tabPagination.totalItems
                    });

                    // Оновити відображення розміру сторінки в UI
                    const pageSizeLabel = document.getElementById('page-size-label');
                    if (pageSizeLabel) {
                        pageSizeLabel.textContent = tabPagination.pageSize;
                    }
                }
            } else {
                console.warn(`⚠️ Пагінація для табу ${tabId} не знайдена`);

                // Якщо це check таб і пагінація відсутня - завантажити дані
                if (tabId.startsWith('check-') && tabButton.dataset.checkSheet) {
                    console.log(`🔄 Автоматичне завантаження даних для табу "${tabId}"`);

                    const sheet = tabButton.dataset.checkSheet;
                    const word = tabButton.dataset.checkWord;
                    const column = tabButton.dataset.checkColumn;

                    // Оновити state
                    bannedWordsState.selectedSheet = sheet;
                    bannedWordsState.selectedWord = word;
                    bannedWordsState.selectedColumn = column;

                    // Завантажити дані
                    const { performCheck } = await import('./banned-words-check.js');
                    await performCheck(sheet, word, column);
                }
            }

            // Показати відповідні controls
            showTabControls(tabId);

            // Приховати/показати dropdown колонок пошуку
            const searchFilterBtn = document.querySelector('[data-dropdown-trigger][aria-label="Фільтри пошуку"]');
            if (searchFilterBtn) {
                if (tabId === 'tab-manage') {
                    searchFilterBtn.classList.remove('u-hidden');
                } else {
                    searchFilterBtn.classList.add('u-hidden');
                }
            }

            // Оновити видимість batch action bars
            const { updateBatchBarVisibility } = await import('./banned-words-batch.js');
            updateBatchBarVisibility(tabId);

            // Відновити візуальний стан чекбоксів
            const selectedSet = bannedWordsState.selectedProducts[tabId];
            if (selectedSet && selectedSet.size > 0) {
                const checkboxes = tabContent.querySelectorAll('.row-checkbox');
                checkboxes.forEach(checkbox => {
                    const productId = checkbox.dataset.productId;
                    checkbox.checked = selectedSet.has(productId);
                });

                // Оновити select-all checkbox
                const selectAllCheckbox = tabContent.querySelector('.select-all-checkbox');
                if (selectAllCheckbox) {
                    const allIds = Array.from(checkboxes).map(cb => cb.dataset.productId);
                    const allSelected = allIds.length > 0 && allIds.every(id => selectedSet.has(id));
                    selectAllCheckbox.checked = allSelected;
                }
            }
        }
    });

    console.log('✅ Обробники табів ініціалізовано (глобально на document)');
}

/**
 * Видалити таб перевірки
 * @param {string} tabId - ID табу для видалення
 */
export function removeCheckTab(tabId) {
    console.log(`🗑️ Видалення табу: ${tabId}`);

    // Знайти кнопку табу
    const tabButton = document.querySelector(`[data-tab-target="${tabId}"]`);
    const tabContent = document.querySelector(`[data-tab-content="${tabId}"]`);

    // Перевірити чи таб активний
    const wasActive = tabButton?.classList.contains('active');

    // Видалити з DOM
    if (tabButton) {
        tabButton.remove();
        console.log(`✅ Кнопка табу видалена`);
    }

    if (tabContent) {
        tabContent.remove();
        console.log(`✅ Контент табу видалений`);
    }

    // Видалити пагінацію з state
    if (bannedWordsState.tabPaginations[tabId]) {
        delete bannedWordsState.tabPaginations[tabId];
        console.log(`✅ Пагінація табу видалена`);
    }

    // Видалити таб зі збереженого стану
    removeTabFromState(tabId);

    // Якщо таб був активним, переключитись на tab-manage
    if (wasActive) {
        const manageTab = document.querySelector('[data-tab-target="tab-manage"]');
        if (manageTab) {
            setTimeout(() => {
                manageTab.click();
                console.log(`🔄 Переключено на таб управління`);
            }, 100);
        }
    }

    console.log(`✅ Таб ${tabId} успішно видалено`);
}

/**
 * Відновити збережені таби після перезавантаження сторінки
 */
export async function restoreSavedTabs() {
    const { loadTabsState } = await import('./banned-words-state-persistence.js');
    const savedState = loadTabsState();

    if (!savedState || !savedState.openTabs || savedState.openTabs.length === 0) {
        console.log('📭 Немає збережених табів для відновлення');
        return;
    }

    console.log(`🔄 Відновлення ${savedState.openTabs.length} збережених табів...`);

    // Відновити кожен таб (некоректні таби вже відфільтровані в loadTabsState)
    for (const tab of savedState.openTabs) {
        try {
            console.log(`📂 Відновлення табу: ${tab.tabId}`);

            // Оновити state
            bannedWordsState.selectedSheet = tab.sheetName;
            bannedWordsState.selectedWord = tab.wordId;
            bannedWordsState.selectedColumn = tab.columnName;

            // Відновити фільтр
            if (tab.filter) {
                bannedWordsState.tabFilters[tab.tabId] = tab.filter;
            }

            // Відновити пагінацію
            if (tab.currentPage && tab.pageSize) {
                bannedWordsState.tabPaginations[tab.tabId] = {
                    currentPage: tab.currentPage,
                    pageSize: tab.pageSize,
                    totalItems: 0 // буде оновлено при завантаженні даних
                };
            }

            // ВИПРАВЛЕНО: Спочатку створити таб UI БЕЗ автоактивації
            await createCheckResultsTab(true); // skipAutoActivate = true

            // Тепер виконати перевірку вручну (контейнер вже існує)
            const { performCheck } = await import('./banned-words-check.js');
            await performCheck(tab.sheetName, tab.wordId, tab.columnName);

            console.log(`✅ Таб відновлено: ${tab.tabId}`);
        } catch (error) {
            console.error(`❌ Помилка відновлення табу ${tab.tabId}:`, error);
        }
    }

    // Активувати збережений активний таб
    if (savedState.activeTabId) {
        setTimeout(() => {
            const activeTabButton = document.querySelector(`[data-tab-target="${savedState.activeTabId}"]`);
            if (activeTabButton) {
                activeTabButton.click();
                console.log(`✅ Активовано збережений таб: ${savedState.activeTabId}`);
            }
        }, 500);
    }

    console.log(`✅ Відновлення табів завершено`);
}
