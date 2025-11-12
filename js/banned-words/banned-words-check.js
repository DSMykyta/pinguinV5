// js/banned-words/banned-words-check.js
// Вибіркова перевірка текстів на заборонені слова

import { bannedWordsState, getCachedCheckResults, setCachedCheckResults, invalidateCheckCache } from './banned-words-init.js';
import { loadSheetDataForCheck, checkTextForBannedWords, getTextFragment, updateProductStatus } from './banned-words-data.js';
import { showLoader, hideLoader, showErrorDetails } from '../common/ui-loading.js';
import { showToast } from '../common/ui-toast.js';
import { escapeHtml, highlightText, extractContextWithHighlight } from '../utils/text-utils.js';
import { renderPseudoTable, renderBadge } from '../common/ui-table.js';
import { registerCheckTabPagination } from './banned-words-pagination.js';

// AbortController для скасування завантаження
let currentAbortController = null;

/**
 * Виконати перевірку вибраного заборонного слова в вибраній колонці
 * @param {string} sheetName - Назва аркуша
 * @param {string} wordId - ID заборонного слова (local_id)
 * @param {string} columnName - Назва колонки для перевірки
 */
export async function performCheck(sheetName, wordId, columnName) {
    const { selectedSheet, selectedWord, selectedColumn } = bannedWordsState;
    const tabId = `check-${selectedSheet}-${selectedWord}-${selectedColumn}`;
    const container = document.getElementById(`check-results-${tabId}`);

    // Показати loader з прогресом
    const loader = showLoader(container, {
        type: 'progress',
        message: 'Підготовка до перевірки...',
        overlay: true
    });

    try {
        console.log(`🔍 Початок перевірки: аркуш="${sheetName}", слово="${wordId}", колонка="${columnName}"`);

        // Перевірити кеш
        loader.updateProgress(5, 'Перевірка кешу...');
        const cachedResults = getCachedCheckResults(sheetName, wordId, columnName);

        if (cachedResults) {
            // Використати кешовані результати
            loader.updateProgress(50, 'Використання кешованих результатів...');

            const bannedWord = bannedWordsState.bannedWords.find(w => w.local_id === wordId);

            // Зберегти результати в state
            bannedWordsState.checkResults = cachedResults;
            bannedWordsState.selectedSheet = sheetName;
            bannedWordsState.selectedWord = wordId;
            bannedWordsState.selectedColumn = columnName;

            // Відрендерити результати
            loader.updateProgress(70, 'Підготовка результатів...');
            await renderCheckResults(sheetName, bannedWord);

            // Ініціалізувати пагінацію
            loader.updateProgress(85, 'Налаштування пагінації...');
            registerCheckTabPagination(tabId, cachedResults.length, async () => {
                const bannedWord = bannedWordsState.bannedWords.find(w => w.local_id === bannedWordsState.selectedWord);
                await renderCheckResults(bannedWordsState.selectedSheet, bannedWord);
            });

            // Ініціалізувати сортування
            loader.updateProgress(90, 'Налаштування сортування...');
            const { initCheckTabSorting } = await import('./banned-words-events.js');
            initCheckTabSorting(tabId);

            // Ініціалізувати фільтри
            loader.updateProgress(95, 'Налаштування фільтрів...');
            initCheckTabFilters(tabId);

            // Оновити статистику
            const foundCount = cachedResults.length;
            updateAsideStats(cachedResults.length, foundCount);

            // Завершити
            loader.updateProgress(100, 'Готово!');
            setTimeout(() => {
                loader.hide();
                showToast(`Завантажено з кешу: ${foundCount} результатів`, 'success', 2000);
            }, 200);

            return;
        }

        // Знайти заборонене слово в state
        loader.updateProgress(10, 'Пошук заборонного слова...');
        const bannedWord = bannedWordsState.bannedWords.find(w => w.local_id === wordId);
        if (!bannedWord) {
            loader.hide();
            showToast('Заборонене слово не знайдено', 'error');
            return;
        }

        console.log('📝 Заборонене слово:', bannedWord);
 
         // Визначити мову колонки та відповідне слово для пошуку
        let searchWordsArray; // Це тепер масив
         if (columnName.includes('Ukr')) {
            searchWordsArray = bannedWord.name_uk_array; // Використовуємо масив
         } else if (columnName.includes('Ros') || columnName.includes('Rus')) {
            searchWordsArray = bannedWord.name_ru_array; // Використовуємо масив
         } else {
             loader.hide();
             showToast('Невідома мова колонки', 'error');
             return;
         }
 
        if (!searchWordsArray || searchWordsArray.length === 0) {
             loader.hide();
            showToast('Заборонене слово не має значень для цієї мови', 'info');
             return;
         }
 
        console.log(`🔍 Шукаємо слова:`, searchWordsArray);
 
         // Завантажити дані для перевірки
         loader.updateProgress(30, 'Завантаження даних з Google Sheets...');
        const sheetData = await loadSheetDataForCheck(sheetName, columnName);
        console.log(`📥 Завантажено ${sheetData.length} рядків`);

        // Перевірити кожен рядок на наявність заборонного слова
        loader.updateProgress(60, `Перевірка ${sheetData.length} текстів...`);
        const results = [];
        let foundCount = 0;
 
         sheetData.forEach(item => {
            // Передаємо весь масив слів для пошуку
            const foundWords = checkTextForBannedWords(item.targetValue, searchWordsArray);
 
             if (foundWords.length > 0) {
                 foundCount++;
 
                // Отримати фрагмент тексту з ПЕРШИМ знайденим словом
                 const firstMatch = foundWords[0];
                const fragment = extractContextWithHighlight(item.targetValue, firstMatch.word, 50);
                const totalMatchCount = foundWords.reduce((sum, f) => sum + f.count, 0);
 
                 results.push({
                     id: item.id,
                    title: item.title,
                    cheaked_line: item.cheaked_line,
                    _rowIndex: item._rowIndex,
                    // Додаємо контекстуальну інформацію
                     context: fragment, // Вже з HTML підсвічуванням
                     fullText: item.targetValue,
                    searchWords: searchWordsArray, // Зберігаємо масив слів, які шукали
                    matchCount: totalMatchCount, // Загальна кількість входжень
                    foundWordsList: foundWords.map(f => f.word) // Список слів, які були знайдені
                 });
             }
         });

        console.log(`✅ Перевірка завершена. Знайдено ${foundCount} входжень у ${results.length} товарах`);

        // Зберегти результати в state
        bannedWordsState.checkResults = results;
        bannedWordsState.selectedSheet = sheetName;
        bannedWordsState.selectedWord = wordId;
        bannedWordsState.selectedColumn = columnName;

        // Зберегти результати в кеш
        setCachedCheckResults(sheetName, wordId, columnName, results);

        // Відрендерити результати
        loader.updateProgress(80, 'Підготовка результатів...');
        await renderCheckResults(sheetName, bannedWord);

        // Ініціалізувати пагінацію для цього табу
        loader.updateProgress(90, 'Налаштування пагінації...');
        registerCheckTabPagination(tabId, results.length, async () => {
            const bannedWord = bannedWordsState.bannedWords.find(w => w.local_id === bannedWordsState.selectedWord);
            await renderCheckResults(bannedWordsState.selectedSheet, bannedWord);
        });

        // Ініціалізувати сортування для цього табу
        loader.updateProgress(90, 'Налаштування сортування...');
        const { initCheckTabSorting } = await import('./banned-words-events.js');
        initCheckTabSorting(tabId);

        // Ініціалізувати фільтри для цього табу
        loader.updateProgress(95, 'Налаштування фільтрів...');
        initCheckTabFilters(tabId);

        // Оновити aside статистику
        updateAsideStats(results.length, foundCount);

        // Завершити
        loader.updateProgress(100, 'Готово!');
        setTimeout(() => {
            loader.hide();
            const toastType = foundCount > 0 ? 'info' : 'success';
            showToast(`Знайдено ${foundCount} входжень у ${results.length} товарах`, toastType, 3000);
        }, 300);

    } catch (error) {
        console.error('❌ Помилка перевірки:', error);
        loader.hide();
        showErrorDetails(error, 'Перевірка текстів');
    }
}

/**
 * Відрендерити результати перевірки
 * ІДЕНТИЧНО до renderBannedWordsTable з banned-words-manage.js
 */
export async function renderCheckResults(sheetName, bannedWord) {
    const { selectedSheet, selectedWord, selectedColumn } = bannedWordsState;
    const tabId = `check-${selectedSheet}-${selectedWord}-${selectedColumn}`;
    const container = document.getElementById(`check-results-${tabId}`);
    if (!container) {
        console.error('❌ Контейнер для результатів не знайдено:', `check-results-${tabId}`);
        return;
    }

    // Отримати всі результати
    let allResults = bannedWordsState.checkResults;

    // Застосувати фільтр табу (якщо є)
    const activeFilter = bannedWordsState.tabFilters[tabId] || 'all';
    if (activeFilter === 'checked') {
        allResults = allResults.filter(r => r.cheaked_line === 'TRUE' || r.cheaked_line === true);
    } else if (activeFilter === 'unchecked') {
        allResults = allResults.filter(r => r.cheaked_line !== 'TRUE' && r.cheaked_line !== true);
    }

    // Застосувати пошук (якщо є)
    if (bannedWordsState.searchQuery) {
        const query = bannedWordsState.searchQuery.toLowerCase();
        allResults = allResults.filter(result => {
            // Шукати в ID та Назві
            const idMatch = result.id?.toString().toLowerCase().includes(query);
            const titleMatch = result.title?.toLowerCase().includes(query);
            return idMatch || titleMatch;
        });
    }

    // Отримати пагінацію для цього табу
    const tabPagination = bannedWordsState.tabPaginations[tabId] || { currentPage: 1, pageSize: 10 };
    tabPagination.totalItems = allResults.length;

    // Застосувати пагінацію
    const startIndex = (tabPagination.currentPage - 1) * tabPagination.pageSize;
    const endIndex = startIndex + tabPagination.pageSize;
    const paginatedResults = allResults.slice(startIndex, endIndex);

    // Оновити заголовок табу
    const tabTitle = document.getElementById(`check-tab-title-${tabId}`);
    const tabStats = document.getElementById(`check-tab-stats-${tabId}`);
    if (tabTitle) {
        // ЗМІНЕНО: Використовуємо group_name_ua
        const wordName = bannedWord ? (bannedWord.group_name_ua || 'Слово') : 'Слово';
        const shortColumn = selectedColumn.replace(/Ukr$|Ros$/, '');
        tabTitle.textContent = `${selectedSheet}: ${shortColumn}: ${wordName}`;
    }
    if (tabStats) {
        tabStats.textContent = `Показано ${paginatedResults.length} з ${allResults.length}`;
    }

    // Рендеринг таблиці через універсальний компонент
    renderPseudoTable(container, {
        data: paginatedResults,
        columns: [
            {
                id: 'id',
                label: 'ID',
                sortable: true,
                className: 'cell-id',
                render: (value) => `<span class="badge">${escapeHtml(value)}</span>`
            },
            {
                id: 'title',
                label: 'Назва',
                sortable: true,
                className: 'cell-name',
                render: (value) => `<strong>${escapeHtml(value)}</strong>`
             },
             {
                 id: 'context',
                label: 'Фрагмент',
                sortable: false,
                className: 'cell-context',
                render: (value, row) => {
                    if (!value) return '<span class="text-muted">—</span>';

                    // Context вже містить HTML з підсвічуванням від extractContextWithHighlight()
                    return `<div class="context-fragment">${value}</div>`;
                }
            },
            {
                id: 'matchCount',
                label: ' ',
                sortable: true,
                className: 'cell-count',
                render: (value) => {
                    if (!value || value <= 1) return '';
                    return `<span class="match-count-badge">${value}×</span>`;
                }
            },
            {
                id: 'cheaked_line',
                label: 'Перевірено',
                sortable: true,
                className: 'cell-bool',
                render: (value, row) => renderBadge(value, 'checked', {
                    clickable: true,
                    id: row.id
                })
            }
        ],
        rowActionsCustom: (row) => {
            const selectedSet = bannedWordsState.selectedProducts[tabId] || new Set();
            const isChecked = selectedSet.has(row.id);
            return `
                <input type="checkbox" class="row-checkbox" data-product-id="${escapeHtml(row.id)}" ${isChecked ? 'checked' : ''}>
                <button class="btn-icon btn-view-product" data-product-id="${escapeHtml(row.id)}" data-row-index="${row._rowIndex}" title="Переглянути повний текст">
                    <span class="material-symbols-outlined">visibility</span>
                </button>
            `;
        },
        rowActionsHeader: '<input type="checkbox" class="select-all-checkbox">',
        emptyState: {
            icon: 'check_circle',
            message: 'Заборонене слово не знайдено в цій колонці'
        },
        withContainer: false
    });

    // Оновити footer pagination UI
    const footer = document.querySelector('.fixed-footer');
    if (footer && footer._paginationAPI) {
        footer._paginationAPI.update({
            currentPage: tabPagination.currentPage,
            totalItems: allResults.length
        });
    }

    // Додати обробник кліків на clickable badges
    container.querySelectorAll('.badge.clickable').forEach(badge => {
        badge.addEventListener('click', async (e) => {
            e.stopPropagation();
            const productId = badge.dataset.badgeId;
            const currentStatus = badge.dataset.status;
            const newStatus = currentStatus === 'TRUE' ? 'FALSE' : 'TRUE';

            console.log(`🔄 Зміна статусу для ${productId}: ${currentStatus} → ${newStatus}`);

            try {
                // Оновити статус в Google Sheets
                await updateProductStatus(
                    bannedWordsState.selectedSheet,
                    productId,
                    bannedWordsState.selectedColumn,
                    newStatus
                );

                // Інвалідувати кеш для цієї перевірки
                invalidateCheckCache(
                    bannedWordsState.selectedSheet,
                    bannedWordsState.selectedWord,
                    bannedWordsState.selectedColumn
                );

                // Оновити локальний стейт
                const result = bannedWordsState.checkResults.find(r => r.id === productId);
                if (result) {
                    result.cheaked_line = newStatus;
                }

                // Перерендерити таблицю
                const bannedWord = bannedWordsState.bannedWords.find(w => w.local_id === bannedWordsState.selectedWord);
                await renderCheckResults(bannedWordsState.selectedSheet, bannedWord);

                console.log('✅ Статус оновлено');

            } catch (error) {
                console.error('❌ Помилка оновлення статусу:', error);
                alert('Помилка при оновленні статусу: ' + error.message);
            }
        });
    });

    // Додати обробник кліків на кнопки перегляду товару
    container.querySelectorAll('.btn-view-product').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation(); // Запобігти спливанню події

            const productId = button.dataset.productId;
            const rowIndex = button.dataset.rowIndex;

            if (!productId || !rowIndex) {
                console.error('❌ Відсутні дані товару');
                return;
            }

            console.log('📄 Відкриття модалу для товару:', productId);

            // Імпортувати модал (динамічно)
            const { showProductTextModal } = await import('./banned-words-product-modal.js');

            // Відкрити модал з повним текстом товару
            await showProductTextModal(
                productId,
                bannedWordsState.selectedSheet,
                parseInt(rowIndex),
                bannedWordsState.selectedColumn
            );
        });
    });

    // Ініціалізувати batch actions для цього табу
    const { initBatchActionsBar, toggleProductSelection, selectAll, deselectAll, isAllSelected } = await import('./banned-words-batch.js');
    initBatchActionsBar(tabId);

    // Обробник для чекбоксу "вибрати всі"
    const selectAllCheckbox = container.querySelector('.select-all-checkbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const allIds = Array.from(container.querySelectorAll('.row-checkbox')).map(cb => cb.dataset.productId);

            if (e.target.checked) {
                selectAll(tabId, allIds);
            } else {
                deselectAll(tabId);
            }
        });
    }

    // Обробник для чекбоксів рядків
    container.querySelectorAll('.row-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const productId = checkbox.dataset.productId;
            toggleProductSelection(tabId, productId);

            // Оновити стан "select all" checkbox
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = isAllSelected(tabId);
            }
        });
    });
}

/**
 * Ініціалізувати фільтри для check табу
 * @param {string} tabId - ID табу
 */
export function initCheckTabFilters(tabId) {
    const filterPills = document.querySelectorAll(`.filter-pill[data-tab-id="${tabId}"]`);

    if (!filterPills.length) {
        console.warn('⚠️ Фільтри не знайдено для табу:', tabId);
        return;
    }

    // Встановити початковий фільтр
    if (!bannedWordsState.tabFilters[tabId]) {
        bannedWordsState.tabFilters[tabId] = 'all';
    }

    filterPills.forEach(pill => {
        pill.addEventListener('click', async () => {
            const filter = pill.dataset.filter;

            // Оновити стан фільтру
            bannedWordsState.tabFilters[tabId] = filter;

            // Оновити UI активних pills
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            // Перерендерити результати з новим фільтром
            const bannedWord = bannedWordsState.bannedWords.find(w => w.local_id === bannedWordsState.selectedWord);
            await renderCheckResults(bannedWordsState.selectedSheet, bannedWord);

            console.log(`🔎 Фільтр застосовано: "${filter}" для табу "${tabId}"`);
        });
    });

    console.log(`✅ Фільтри ініціалізовано для табу "${tabId}"`);
}

// escapeHtml, renderBadge та обробники статусу видалено - використовуються компоненти з ui-table.js

/**
 * Оновити статистику в aside
 */
function updateAsideStats(productCount, totalOccurrences) {
    const statsEl = document.getElementById('check-results-count');
    if (statsEl) {
        statsEl.textContent = productCount;
    }
}
