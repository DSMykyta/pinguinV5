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
        return '<span class="material-symbols-outlined">search</span><span class="nav-icon-label">{{tabLabel}}</span><span class="tab-close-btn" role="button" tabindex="0" aria-label="Закрити таб"><span class="material-symbols-outlined">close</span></span>';
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
    const { selectedSheet, selectedWord, selectedColumn, selectedSheets, selectedColumns, selectedWords } = bannedWordsState;

    // Перевірка валідності даних - не створювати таб якщо немає вибраних параметрів
    if (!selectedSheet || !selectedWord || !selectedColumn) {
        console.warn('⚠️ Неможливо створити таб перевірки - відсутні обов\'язкові параметри:', {
            selectedSheet, selectedWord, selectedColumn
        });
        return;
    }

    // Отримати масиви (з fallback на одиничні значення)
    const sheetsArr = selectedSheets || [selectedSheet];
    const columnsArr = selectedColumns || [selectedColumn];
    const wordsArr = selectedWords || [selectedWord];

    // Формуємо назву табу (формат: N аркушів × N колонок × N слів)
    const sheetsLabel = sheetsArr.length === 1 ? sheetsArr[0] : `${sheetsArr.length} аркушів`;
    const columnsLabel = columnsArr.length === 1
        ? columnsArr[0].replace(/Ukr$|Ros$/, '')
        : `${columnsArr.length} колонок`;
    const wordsLabel = wordsArr.length === 1
        ? (bannedWordsState.bannedWords.find(w => w.local_id === wordsArr[0])?.group_name_ua || 'Слово')
        : `${wordsArr.length} слів`;
    const tabLabel = `${sheetsLabel} × ${columnsLabel} × ${wordsLabel}`;

    // Створюємо унікальний tabId який враховує ВСІ обрані аркуші, слова та колонки
    const sheetsKey = [...sheetsArr].sort().join('-');
    const columnsKey = [...columnsArr].sort().join('-');
    const wordsKey = [...wordsArr].sort().join('-');
    const tabId = `check-${sheetsKey}-${wordsKey}-${columnsKey}`;

    // Захист від race conditions - якщо таб вже створюється, чекаємо
    if (tabsBeingCreated.has(tabId)) {
        return;
    }

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

    // Позначити таб як такий, що створюється
    tabsBeingCreated.add(tabId);

    // Створити кнопку табу
    const tabsContainer = document.getElementById('tabs-head-container');
    const tabButton = document.createElement('button');
    tabButton.className = 'nav-icon';
    tabButton.dataset.tabTarget = tabId;

    const tabTemplate = await getCheckTabTemplate();
    const tabHtml = tabTemplate.replace(/{{tabLabel}}/g, tabLabel);
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

    // Зберегти параметри перевірки для цього табу (одиничні для зворотної сумісності)
    tabButton.dataset.checkSheet = selectedSheet;
    tabButton.dataset.checkWord = selectedWord;
    tabButton.dataset.checkColumn = selectedColumn;
    // Зберегти масиви для мультиселекту
    tabButton.dataset.checkSheets = JSON.stringify(sheetsArr);
    tabButton.dataset.checkWords = JSON.stringify(wordsArr);
    tabButton.dataset.checkColumns = JSON.stringify(columnsArr);

    // Додати обробник для кнопки refresh цього check табу
    const refreshButton = tabContent.querySelector(`#refresh-check-${tabId}`);
    if (refreshButton) {
        refreshButton.addEventListener('click', async () => {

            // Отримати збережені параметри перевірки з кнопки табу
            const sheet = tabButton.dataset.checkSheet;
            const word = tabButton.dataset.checkWord;
            const column = tabButton.dataset.checkColumn;
            // Масиви для мультиселекту
            const savedSheets = JSON.parse(tabButton.dataset.checkSheets || '[]');
            const savedWords = JSON.parse(tabButton.dataset.checkWords || '[]');
            const savedColumns = JSON.parse(tabButton.dataset.checkColumns || '[]');

            // Інвалідувати кеш - використовуємо ті самі ключі що і при створенні кешу
            const { invalidateCheckCache } = await import('./banned-words-init.js');
            const sheetsKey = [...savedSheets].sort().join('-');
            const columnsKey = [...savedColumns].sort().join('-');
            const wordsKey = [...savedWords].sort().join('-');
            invalidateCheckCache(sheetsKey, wordsKey, columnsKey);

            // Оновити state перед перевіркою (включно з масивами)
            bannedWordsState.selectedSheet = sheet;
            bannedWordsState.selectedWord = word;
            bannedWordsState.selectedColumn = column;
            bannedWordsState.selectedSheets = savedSheets;
            bannedWordsState.selectedWords = savedWords;
            bannedWordsState.selectedColumns = savedColumns;

            // Повторно виконати перевірку для цього табу
            const { performCheck } = await import('./banned-words-check.js');
            await performCheck(sheet, word, column);
        });
    }


    // Зберегти стан табу для відновлення після перезавантаження (з масивами для мультиселекту)
    addTabToState(tabId, selectedSheet, selectedWord, selectedColumn, true, {
        sheets: sheetsArr,
        words: wordsArr,
        columns: columnsArr
    });

    // Видалити таб зі списку тих, що створюються
    tabsBeingCreated.delete(tabId);

    // Активувати новий таб через клік (затримка для оновлення DOM)
    // ВИПРАВЛЕНО: Пропустити автоактивацію при відновленні табів
    if (!skipAutoActivate) {
        setTimeout(() => {
            tabButton.click();
        }, 50);
    } else {
    }
}

// Прапорець для запобігання повторної ініціалізації
let handlersInitialized = false;

// Прапорець для запобігання повторному виклику закриття табу
let isClosingTab = false;

// Set для відстеження табів, що зараз створюються (захист від race conditions)
const tabsBeingCreated = new Set();

/**
 * Ініціалізувати обробники для всіх табів
 * Використовує делегування подій на document
 */
export function initTabHandlers() {
    if (handlersInitialized) {
        return;
    }

    handlersInitialized = true;

    // Обробник для кнопки закриття табу (використовуємо CAPTURE фазу для гарантованого першого виклику)
    document.addEventListener('click', async (e) => {
        const closeButton = e.target.closest('.tab-close-btn');
        if (!closeButton) return;

        // Зупиняємо подію ОДРАЗУ в capture фазі
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Захист від повторних кліків поки модал відкритий
        if (isClosingTab) {
            return;
        }

        // Знайти батьківську кнопку табу
        const tabButton = closeButton.closest('.nav-icon');
        if (!tabButton) return;

        const tabId = tabButton.dataset.tabTarget;
        if (!tabId || tabId === 'tab-manage') return; // Не дозволяємо закрити головний таб


        isClosingTab = true;

        try {
            // Використовуємо showConfirmModal з ui-modal-confirm.js
            const { showConfirmModal } = await import('../common/ui-modal-confirm.js');
            const confirmed = await showConfirmModal({
                title: 'Закрити таб?',
                message: 'Всі незбережені дані будуть втрачені. Продовжити?',
                confirmText: 'Закрити',
                cancelText: 'Скасувати',
                confirmClass: 'btn-delete'
            });

            if (confirmed) {
                removeCheckTab(tabId);
            }
        } finally {
            isClosingTab = false;
        }
    }, true); // CAPTURE = true - обробник спрацьовує першим

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

            // Оновити currentTab в state
            bannedWordsState.currentTab = tabId;

            // Оновити активний таб в збереженому стані
            setActiveTab(tabId);

            // Відновити пагінацію для цього табу
            const tabPagination = bannedWordsState.tabPaginations[tabId];
            if (tabPagination) {
                const footer = document.querySelector('.footer');
                if (footer && footer._paginationAPI) {
                    footer._paginationAPI.update({
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

}

/**
 * Видалити таб перевірки
 * @param {string} tabId - ID табу для видалення
 */
export function removeCheckTab(tabId) {

    // Знайти кнопку табу
    const tabButton = document.querySelector(`[data-tab-target="${tabId}"]`);
    const tabContent = document.querySelector(`[data-tab-content="${tabId}"]`);

    // Перевірити чи таб активний
    const wasActive = tabButton?.classList.contains('active');

    // Видалити з DOM
    if (tabButton) {
        tabButton.remove();
    }

    if (tabContent) {
        tabContent.remove();
    }

    // Видалити пагінацію з state
    if (bannedWordsState.tabPaginations[tabId]) {
        delete bannedWordsState.tabPaginations[tabId];
    }

    // Видалити фільтри з state
    if (bannedWordsState.tabFilters[tabId]) {
        delete bannedWordsState.tabFilters[tabId];
    }

    // Видалити вибрані продукти з state
    if (bannedWordsState.selectedProducts[tabId]) {
        delete bannedWordsState.selectedProducts[tabId];
    }

    // Видалити таб зі збереженого стану
    removeTabFromState(tabId);

    // Якщо таб був активним, переключитись на tab-manage
    if (wasActive) {
        const manageTab = document.querySelector('[data-tab-target="tab-manage"]');
        if (manageTab) {
            setTimeout(() => {
                manageTab.click();
            }, 100);
        }
    }

}

/**
 * Відновити збережені таби після перезавантаження сторінки
 */
export async function restoreSavedTabs() {
    const { loadTabsState } = await import('./banned-words-state-persistence.js');
    const savedState = loadTabsState();

    if (!savedState || !savedState.openTabs || savedState.openTabs.length === 0) {
        return;
    }


    // Відновити кожен таб (некоректні таби вже відфільтровані в loadTabsState)
    for (const tab of savedState.openTabs) {
        try {

            // Відновити масиви (з fallback на одиничні значення для старих збережень)
            const sheets = tab.sheets || [tab.sheetName];
            const words = tab.words || [tab.wordId];
            const columns = tab.columns || [tab.columnName];

            // Оновити state (встановити і одиничні і масивні значення)
            bannedWordsState.selectedSheet = tab.sheetName;
            bannedWordsState.selectedWord = tab.wordId;
            bannedWordsState.selectedColumn = tab.columnName;
            // Масиви для мультиселекту
            bannedWordsState.selectedSheets = sheets;
            bannedWordsState.selectedWords = words;
            bannedWordsState.selectedColumns = columns;

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
            }
        }, 500);
    }

}
