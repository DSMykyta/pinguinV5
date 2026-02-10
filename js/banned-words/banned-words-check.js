// js/banned-words/banned-words-check.js
// Вибіркова перевірка текстів на заборонені слова

import { bannedWordsState, getCachedCheckResults, setCachedCheckResults, invalidateCheckCache } from './banned-words-init.js';
import { loadSheetDataForCheck, checkTextForBannedWords, updateProductStatus } from './banned-words-data.js';
import { showLoader, showErrorDetails } from '../common/ui-loading.js';
import { showToast } from '../common/ui-toast.js';
import { escapeHtml } from '../utils/text-utils.js';
import { createTable, renderBadge } from '../common/table/table-main.js';
import { registerCheckTabPagination } from './banned-words-pagination.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../common/ui-actions.js';

// AbortController для скасування завантаження
let currentAbortController = null;

// Map для зберігання tableAPI для кожного табу check
const checkTableAPIs = new Map();

/**
 * Виконати перевірку ВСІХ обраних заборонених слів в УСІХ обраних колонках
 * @param {string} sheetName - Назва аркуша (або перший з обраних) - для зворотної сумісності
 * @param {string} wordId - ID заборонного слова (або перший з обраних) - для зворотної сумісності
 * @param {string} columnName - Назва колонки (або перша з обраних) - для зворотної сумісності
 */
export async function performCheck(sheetName, wordId, columnName) {
    const { selectedSheet, selectedWord, selectedColumn } = bannedWordsState;

    // Отримати масиви з fallback на одиничні значення
    const selectedSheets = bannedWordsState.selectedSheets || [selectedSheet || sheetName];
    const selectedColumns = bannedWordsState.selectedColumns || [selectedColumn || columnName];
    // НОВЕ: Підтримка мультиселекту слів
    const selectedWords = bannedWordsState.selectedWords || [selectedWord || wordId];

    // Розрахувати tabId так само як в createCheckResultsTab (враховує всі слова)
    const sheetsKey = [...selectedSheets].sort().join('-');
    const columnsKey = [...selectedColumns].sort().join('-');
    const wordsKey = [...selectedWords].sort().join('-');
    const tabId = `check-${sheetsKey}-${wordsKey}-${columnsKey}`;

    const container = document.getElementById(`check-results-${tabId}`);

    // Перевірити чи контейнер існує
    if (!container) {
        console.error(`❌ Контейнер check-results-${tabId} не знайдено`);
        showToast('Помилка: контейнер для результатів не знайдено', 'error');
        return;
    }

    // Показати loader з прогресом
    const loader = showLoader(container, {
        type: 'progress',
        message: 'Підготовка до перевірки...',
        overlay: true
    });

    // Перевірити чи loader створено
    if (!loader) {
        console.error('❌ Не вдалося створити loader');
        return;
    }

    try {

        // ТИМЧАСОВО: інвалідувати кеш для тестування нової агрегації
        invalidateCheckCache(sheetsKey, wordsKey, columnsKey);

        // Перевірити кеш (ключ враховує всі обрані аркуші, слова та колонки)
        loader.updateProgress(5, 'Перевірка кешу...');
        const cachedResults = getCachedCheckResults(sheetsKey, wordsKey, columnsKey);

        if (cachedResults) {
            loader.updateProgress(50, 'Використання кешованих результатів...');

            // Зберегти результати в state
            bannedWordsState.checkResults = cachedResults;
            bannedWordsState.selectedSheet = sheetName;
            bannedWordsState.selectedWord = selectedWords[0];
            bannedWordsState.selectedColumn = columnName;

            // Відрендерити результати (передаємо null для bannedWord - буде використано selectedWords)
            loader.updateProgress(70, 'Підготовка результатів...');
            await renderCheckResults(sheetName, null);

            // Ініціалізувати пагінацію
            loader.updateProgress(85, 'Налаштування пагінації...');
            registerCheckTabPagination(tabId, cachedResults.length, async () => {
                await renderCheckResults(bannedWordsState.selectedSheet, null);
            });

            // Сортування тепер через Table LEGO плагіни (в initCheckTableAPI)

            // Ініціалізувати фільтри
            loader.updateProgress(95, 'Налаштування фільтрів...');
            initCheckTabFilters(tabId);

            // Оновити статистику
            const totalMatchCount = cachedResults.reduce((sum, r) => sum + (r.matchCount || 0), 0);
            updateAsideStats(cachedResults.length, totalMatchCount);

            // Завершити
            loader.updateProgress(100, 'Готово!');
            setTimeout(() => {
                loader.hide();
                showToast(`Завантажено з кешу: ${cachedResults.length} результатів`, 'success', 2000);
            }, 200);

            return;
        }

        // НОВЕ: Отримати всі обрані заборонені слова та об'єднати їх масиви фраз
        loader.updateProgress(10, 'Підготовка слів для пошуку...');
        const bannedWordObjects = selectedWords
            .map(wId => bannedWordsState.bannedWords.find(w => w.local_id === wId))
            .filter(Boolean);

        if (bannedWordObjects.length === 0) {
            loader.hide();
            showToast('Заборонені слова не знайдено', 'error');
            return;
        }

        // Об'єднати масиви фраз з усіх обраних слів
        const allUkrWords = [];
        const allRusWords = [];
        bannedWordObjects.forEach(word => {
            if (word.name_uk_array) allUkrWords.push(...word.name_uk_array);
            if (word.name_ru_array) allRusWords.push(...word.name_ru_array);
        });

        // Видалити дублікати
        const uniqueUkrWords = [...new Set(allUkrWords)];
        const uniqueRusWords = [...new Set(allRusWords)];


        // Сформувати назву для прогрес-бара (назви груп замість кількості)
        const groupNames = bannedWordObjects.map(w => w.group_name_ua || w.local_id).slice(0, 3);
        const wordsLabel = groupNames.length <= 3
            ? groupNames.join(', ')
            : `${groupNames.join(', ')}... (+${bannedWordObjects.length - 3})`;

        // Результати з усіх комбінацій аркуш/колонка
        const allResults = [];
        let validCombinations = 0;
        let currentStep = 0;
        const totalSteps = selectedSheets.length * selectedColumns.length;

        // Перевірити кожну комбінацію аркуш + колонка
        for (const sheet of selectedSheets) {
            for (const col of selectedColumns) {
                currentStep++;

                // Визначити мову колонки та відповідний масив слів
                let searchWordsArray;
                let langLabel;
                if (col.includes('Ukr')) {
                    searchWordsArray = uniqueUkrWords;
                    langLabel = 'UA';
                } else if (col.includes('Ros') || col.includes('Rus')) {
                    searchWordsArray = uniqueRusWords;
                    langLabel = 'RU';
                } else {
                    continue;
                }

                if (!searchWordsArray || searchWordsArray.length === 0) {
                    continue;
                }

                try {
                    // Детальний прогрес: аркуш / колонка / назва групи
                    const progressPercent = Math.round(10 + (currentStep / totalSteps) * 70);
                    loader.updateProgress(
                        Math.min(progressPercent, 80),
                        `${sheet} / ${col}\n${wordsLabel}`
                    );

                    // Завантажити дані з аркуша
                    const sheetData = await loadSheetDataForCheck(sheet, col);
                    validCombinations++;


                    // Перевірити кожен рядок
                    sheetData.forEach(item => {
                        const foundWords = checkTextForBannedWords(item.targetValue, searchWordsArray);

                        if (foundWords.length > 0) {
                            const totalMatchCount = foundWords.reduce((sum, f) => sum + f.count, 0);

                            allResults.push({
                                id: item.id,
                                title: item.title,
                                cheaked_line: item.cheaked_line,
                                _rowIndex: item._rowIndex,
                                sheetName: sheet,
                                columnName: col,
                                fullText: item.targetValue,
                                searchWords: searchWordsArray,
                                matchCount: totalMatchCount,
                                foundWordsList: foundWords.map(f => f.word)
                            });
                        }
                    });
                } catch (error) {
                    // Якщо колонка не існує в цьому аркуші - пропускаємо тихо
                    if (error.message && error.message.includes('не знайдена')) {
                        continue;
                    }
                    // Internal server error - пропускаємо без спаму (API rate limit)
                    if (error.message && error.message.includes('Internal server error')) {
                        console.warn(`⚠️ API помилка для ${sheet}/${col} - пропускаємо`);
                        continue;
                    }
                    // Інші помилки - логуємо
                    console.error(`❌ Помилка перевірки ${sheet}/${col}:`, error);
                }
            }
        }


        // Агрегувати результати - якщо один товар знайдено в кількох колонках
        loader.updateProgress(85, 'Агрегація результатів...');
        const aggregatedResults = aggregateResultsByProduct(allResults);


        // Зберегти результати в state
        bannedWordsState.checkResults = aggregatedResults;
        bannedWordsState.selectedSheet = sheetName;
        bannedWordsState.selectedWord = selectedWords[0]; // Зворотна сумісність
        bannedWordsState.selectedColumn = columnName;

        // Визначити колонки з помилками (для показу в UI)
        const columnsWithErrors = [...new Set(allResults.map(r => r.columnName))];
        bannedWordsState.columnsWithErrors = columnsWithErrors;

        // Зберегти результати в кеш (ключ використовує wordsKey для всіх слів)
        setCachedCheckResults(sheetsKey, wordsKey, columnsKey, aggregatedResults);

        // Відрендерити результати
        loader.updateProgress(80, 'Підготовка результатів...');
        await renderCheckResults(sheetName, null);

        // Обчислити загальну кількість входжень
        const totalMatchCount = aggregatedResults.reduce((sum, r) => sum + (r.matchCount || 0), 0);

        // Ініціалізувати пагінацію для цього табу
        loader.updateProgress(90, 'Налаштування пагінації...');
        registerCheckTabPagination(tabId, aggregatedResults.length, async () => {
            await renderCheckResults(bannedWordsState.selectedSheet, null);
        });

        // Ініціалізувати сортування для цього табу
        loader.updateProgress(90, 'Налаштування сортування...');
        const { initCheckTabSorting } = await import('./banned-words-events.js');
        initCheckTabSorting(tabId);

        // Ініціалізувати фільтри для цього табу
        loader.updateProgress(95, 'Налаштування фільтрів...');
        initCheckTabFilters(tabId);

        // Оновити aside статистику
        updateAsideStats(aggregatedResults.length, totalMatchCount);

        // Завершити
        loader.updateProgress(100, 'Готово!');
        setTimeout(() => {
            loader.hide();
            const toastType = totalMatchCount > 0 ? 'info' : 'success';
            showToast(`Знайдено ${totalMatchCount} входжень у ${aggregatedResults.length} товарах`, toastType, 3000);
        }, 300);

    } catch (error) {
        console.error('❌ Помилка перевірки:', error);
        loader.hide();
        showErrorDetails(error, 'Перевірка текстів');
    }
}

/**
 * Агрегувати результати по товарах
 * Якщо товар знайдено в кількох колонках - об'єднати в один запис
 * @param {Array} results - Масив результатів з усіх колонок
 * @returns {Array} - Агреговані результати
 */
function aggregateResultsByProduct(results) {
    // Групувати за комбінацією sheetName + id
    // ВАЖЛИВО: товари з однаковим ID на РІЗНИХ аркушах - це РІЗНІ записи!
    const productMap = new Map();


    for (const result of results) {
        // Перевірка на пусті значення
        if (!result.sheetName || !result.id) {
            console.warn('⚠️ Пропускаємо результат без sheetName або id:', result);
            continue;
        }

        // Унікальний ключ: аркуш + ID (різні аркуші = різні записи)
        const key = `${result.sheetName}::${result.id}`;
        const resultMatchCount = result.matchCount || 0;


        if (!productMap.has(key)) {
            // Новий товар на цьому аркуші
            productMap.set(key, {
                id: result.id,
                title: result.title,
                cheaked_line: result.cheaked_line,
                _rowIndex: result._rowIndex,
                sheetName: result.sheetName,
                columnName: result.columnName,
                columnNames: [],
                matchCount: 0,
                columns: [],
                searchWords: result.searchWords,
                foundWordsList: []
            });
        }

        const existing = productMap.get(key);

        // Додати дані колонки
        existing.columns.push({
            columnName: result.columnName,
            matchCount: resultMatchCount,
            foundWordsList: result.foundWordsList || [],
            fullText: result.fullText
        });

        // Сумувати входження
        existing.matchCount += resultMatchCount;

        // Додати колонку до списку (якщо ще немає)
        if (!existing.columnNames.includes(result.columnName)) {
            existing.columnNames.push(result.columnName);
        }

        // Об'єднати знайдені слова
        if (result.foundWordsList && result.foundWordsList.length > 0) {
            existing.foundWordsList.push(...result.foundWordsList);
        }
    }

    // Конвертувати Map у масив
    const aggregated = Array.from(productMap.values()).map(item => {
        if (item.columnNames.length > 1) {
            item.columnName = `${item.columnNames.length} колонки`;
            item.multipleColumns = true;
        }
        // Дедуплікація знайдених слів
        item.foundWordsList = [...new Set(item.foundWordsList)];

        return item;
    });

    return aggregated;
}

/**
 * Отримати колонки для таблиці результатів перевірки
 */
function getCheckResultsColumns(selectedSheets, selectedColumns, columnsWithErrors) {
    const showSheetColumn = selectedSheets.length > 1;
    const showColumnColumn = columnsWithErrors.length > 1;

    const columns = [];

    // ID
    columns.push({
        id: 'id',
        label: 'ID',
        sortable: true,
        className: 'cell-m',
        render: (value) => `<span class="badge">${escapeHtml(value)}</span>`
    });

    // Назва
    columns.push({
        id: 'title',
        label: 'Назва',
        sortable: true,
        className: 'cell-l',
        render: (value) => `<strong>${escapeHtml(value)}</strong>`
    });

    // Колонка "Аркуш" - тільки якщо обрано > 1 аркуша
    if (showSheetColumn) {
        columns.push({
            id: 'sheetName',
            label: 'Аркуш',
            sortable: true,
            className: 'cell-l',
            render: (value) => `<span class="text-muted">${escapeHtml(value || '')}</span>`
        });
    }

    // Колонка "Колонка" - тільки якщо помилки в > 1 колонці
    if (showColumnColumn) {
        columns.push({
            id: 'columnName',
            label: 'Колонка',
            sortable: true,
            className: 'cell-l',
            render: (value, row) => {
                if (row.multipleColumns && row.columnNames) {
                    const count = row.columnNames.length;
                    const tooltip = row.columnNames.join(', ');
                    return `<span class="badge badge-warning" title="${escapeHtml(tooltip)}">${count} колонки</span>`;
                }
                return `<span class="text-muted">${escapeHtml(value || '')}</span>`;
            }
        });
    }

    // Кількість входжень
    columns.push({
        id: 'matchCount',
        label: 'Кількість',
        sortable: true,
        className: 'cell-2xs cell-center',
        render: (value) => {
            const count = value || 1;
            return `<span class="match-count-badge">${count}×</span>`;
        }
    });

    // Статус перевірки
    columns.push({
        id: 'cheaked_line',
        label: 'Статус',
        sortable: true,
        className: 'cell-s cell-center',
        render: (value, row) => renderBadge(value, 'checked', {
            clickable: true,
            id: row.id
        })
    });

    return columns;
}

/**
 * Ініціалізувати tableAPI для табу перевірки
 */
function initCheckTableAPI(tabId, container, selectedSheets, selectedColumns, columnsWithErrors) {
    if (checkTableAPIs.has(tabId)) return checkTableAPIs.get(tabId);

    const columns = getCheckResultsColumns(selectedSheets, selectedColumns, columnsWithErrors);

    // Реєструємо обробник view для цього табу
    registerActionHandlers(`banned-words-check-${tabId}`, {
        view: async (rowId, data) => {
            const productId = rowId;
            const rowIndex = data.rowIndex;

            if (!productId || !rowIndex) {
                console.error('❌ Відсутні дані товару');
                return;
            }


            const { showProductTextModal } = await import('./banned-words-product-modal.js');

            const result = bannedWordsState.checkResults.find(r => r.id === productId);
            const sheetName = result?.sheetName || bannedWordsState.selectedSheet;

            const columnsForProduct = result?.columnNames || [result?.columnName || bannedWordsState.selectedColumn];
            const columnName = columnsForProduct[0];

            await showProductTextModal(
                productId,
                sheetName,
                parseInt(rowIndex),
                columnName,
                bannedWordsState.selectedSheets || [bannedWordsState.selectedSheet],
                columnsForProduct
            );
        }
    });

    const tableAPI = createTable(container, {
        columns,
        rowActions: (row) => {
            const selectedSet = bannedWordsState.selectedProducts[tabId] || new Set();
            const isChecked = selectedSet.has(row.id);
            return `
                <input type="checkbox" class="row-checkbox" data-product-id="${escapeHtml(row.id)}" ${isChecked ? 'checked' : ''}>
                ${actionButton({ action: 'view', rowId: row.id, context: `banned-words-check-${tabId}`, data: { rowIndex: row._rowIndex }, title: 'Переглянути повний текст' })}
            `;
        },
        rowActionsHeader: '<input type="checkbox" class="select-all-checkbox">',
        getRowId: (row) => row.id,
        emptyState: {
            message: 'Заборонене слово не знайдено в цій колонці'
        },
        withContainer: false,
        onAfterRender: (cont) => attachCheckRowEventHandlers(cont, tabId),
        plugins: {
            sorting: {
                dataSource: () => bannedWordsState.checkResults,
                onSort: async (sortedData) => {
                    bannedWordsState.checkResults = sortedData;
                    const bannedWord = bannedWordsState.bannedWords.find(w => w.local_id === bannedWordsState.selectedWord);
                    await renderCheckResults(bannedWordsState.selectedSheet, bannedWord);
                },
                columnTypes: {
                    local_id: 'id-number',
                    severity: 'string',
                    group_name_ua: 'string',
                    name_uk: 'string',
                    name_ru: 'string',
                    banned_type: 'string',
                    banned_explaine: 'string',
                    banned_hint: 'string',
                    cheaked_line: 'boolean'
                }
            }
        }
    });

    checkTableAPIs.set(tabId, tableAPI);
    return tableAPI;
}

/**
 * Додати обробники подій для рядків таблиці перевірки
 */
async function attachCheckRowEventHandlers(container, tabId) {
    // Ініціалізувати ui-actions
    initActionHandlers(container, `banned-words-check-${tabId}`);

    // Додати обробник кліків на clickable badges
    container.querySelectorAll('.badge.clickable').forEach(badge => {
        badge.addEventListener('click', async (e) => {
            e.stopPropagation();
            const productId = badge.dataset.badgeId;
            const currentStatus = badge.dataset.status;
            const newStatus = currentStatus === 'TRUE' ? 'FALSE' : 'TRUE';


            try {
                await updateProductStatus(
                    bannedWordsState.selectedSheet,
                    productId,
                    bannedWordsState.selectedColumn,
                    newStatus
                );

                const selectedSheets = bannedWordsState.selectedSheets || [bannedWordsState.selectedSheet];
                const selectedColumns = bannedWordsState.selectedColumns || [bannedWordsState.selectedColumn];
                const selectedWords = bannedWordsState.selectedWords || [bannedWordsState.selectedWord];
                const sheetsKey = [...selectedSheets].sort().join('-');
                const columnsKey = [...selectedColumns].sort().join('-');
                const wordsKey = [...selectedWords].sort().join('-');
                invalidateCheckCache(sheetsKey, wordsKey, columnsKey);

                const result = bannedWordsState.checkResults.find(r => r.id === productId);
                if (result) {
                    result.cheaked_line = newStatus;
                }

                const bannedWord = bannedWordsState.bannedWords.find(w => w.local_id === bannedWordsState.selectedWord);
                await renderCheckResults(bannedWordsState.selectedSheet, bannedWord);


            } catch (error) {
                console.error('❌ Помилка оновлення статусу:', error);
                alert('Помилка при оновленні статусу: ' + error.message);
            }
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

            if (selectAllCheckbox) {
                selectAllCheckbox.checked = isAllSelected(tabId);
            }
        });
    });
}

/**
 * Отримати відфільтровані та пагіновані дані для check табу
 */
function getCheckFilteredPaginatedData(tabId) {
    let allResults = [...bannedWordsState.checkResults];

    // Застосувати фільтр табу
    const activeFilter = bannedWordsState.tabFilters[tabId] || 'all';
    if (activeFilter === 'checked') {
        allResults = allResults.filter(r => r.cheaked_line === 'TRUE' || r.cheaked_line === true);
    } else if (activeFilter === 'unchecked') {
        allResults = allResults.filter(r => r.cheaked_line !== 'TRUE' && r.cheaked_line !== true);
    }

    // Застосувати пошук
    if (bannedWordsState.searchQuery) {
        const query = bannedWordsState.searchQuery.toLowerCase();
        allResults = allResults.filter(result => {
            const idMatch = result.id?.toString().toLowerCase().includes(query);
            const titleMatch = result.title?.toLowerCase().includes(query);
            return idMatch || titleMatch;
        });
    }

    const tabPagination = bannedWordsState.tabPaginations[tabId] || { currentPage: 1, pageSize: 10 };
    tabPagination.totalItems = allResults.length;

    const startIndex = (tabPagination.currentPage - 1) * tabPagination.pageSize;
    const endIndex = Math.min(startIndex + tabPagination.pageSize, allResults.length);

    return {
        all: bannedWordsState.checkResults,
        filtered: allResults,
        paginated: allResults.slice(startIndex, endIndex)
    };
}

/**
 * Оновити тільки рядки таблиці перевірки (заголовок залишається)
 */
export async function renderCheckResultsRowsOnly(sheetName, bannedWord) {
    const { selectedSheet, selectedWord, selectedColumn } = bannedWordsState;

    const selectedSheets = bannedWordsState.selectedSheets || [selectedSheet];
    const selectedColumns = bannedWordsState.selectedColumns || [selectedColumn];
    const selectedWords = bannedWordsState.selectedWords || [selectedWord];
    const sheetsKey = [...selectedSheets].sort().join('-');
    const columnsKey = [...selectedColumns].sort().join('-');
    const wordsKey = [...selectedWords].sort().join('-');
    const tabId = `check-${sheetsKey}-${wordsKey}-${columnsKey}`;

    const tableAPI = checkTableAPIs.get(tabId);
    if (!tableAPI) {
        await renderCheckResults(sheetName, bannedWord);
        return;
    }

    const { filtered, paginated } = getCheckFilteredPaginatedData(tabId);

    // Оновити статистику
    const tabStats = document.getElementById(`check-tab-stats-${tabId}`);
    if (tabStats) {
        tabStats.textContent = `Показано ${paginated.length} з ${filtered.length}`;
    }

    // Оновити footer pagination UI
    const footer = document.querySelector('.fixed-footer');
    if (footer && footer._paginationAPI) {
        footer._paginationAPI.update({
            currentPage: bannedWordsState.tabPaginations[tabId]?.currentPage || 1,
            totalItems: filtered.length
        });
    }

    // Оновлюємо тільки рядки
    tableAPI.updateRows(paginated);
}

/**
 * Відрендерити результати перевірки (повний рендер)
 */
export async function renderCheckResults(sheetName, bannedWord) {
    const { selectedSheet, selectedWord, selectedColumn } = bannedWordsState;

    const selectedSheets = bannedWordsState.selectedSheets || [selectedSheet];
    const selectedColumns = bannedWordsState.selectedColumns || [selectedColumn];
    const selectedWords = bannedWordsState.selectedWords || [selectedWord];
    const sheetsKey = [...selectedSheets].sort().join('-');
    const columnsKey = [...selectedColumns].sort().join('-');
    const wordsKey = [...selectedWords].sort().join('-');
    const tabId = `check-${sheetsKey}-${wordsKey}-${columnsKey}`;

    const container = document.getElementById(`check-results-${tabId}`);
    if (!container) {
        console.error('❌ Контейнер для результатів не знайдено:', `check-results-${tabId}`);
        return;
    }

    const columnsWithErrors = bannedWordsState.columnsWithErrors || [];

    // Ініціалізуємо або оновлюємо tableAPI
    // Видаляємо старий API якщо колонки змінились
    if (checkTableAPIs.has(tabId)) {
        checkTableAPIs.delete(tabId);
    }

    const tableAPI = initCheckTableAPI(tabId, container, selectedSheets, selectedColumns, columnsWithErrors);

    const { filtered, paginated } = getCheckFilteredPaginatedData(tabId);

    // Оновити заголовок табу
    const tabTitle = document.getElementById(`check-tab-title-${tabId}`);
    const tabStats = document.getElementById(`check-tab-stats-${tabId}`);
    if (tabTitle) {
        const sheetsLabel = selectedSheets.length === 1 ? selectedSheets[0] : `${selectedSheets.length} аркушів`;
        const columnsLabel = selectedColumns.length === 1
            ? selectedColumns[0].replace(/Ukr$|Ros$/, '')
            : `${selectedColumns.length} колонок`;
        const wordsLabel = selectedWords.length === 1
            ? (bannedWordsState.bannedWords.find(w => w.local_id === selectedWords[0])?.group_name_ua || 'Слово')
            : `${selectedWords.length} слів`;

        tabTitle.textContent = `${sheetsLabel} × ${columnsLabel} × ${wordsLabel}`;
    }
    if (tabStats) {
        tabStats.textContent = `Показано ${paginated.length} з ${filtered.length}`;
    }

    // Оновити footer pagination UI
    const footer = document.querySelector('.fixed-footer');
    if (footer && footer._paginationAPI) {
        footer._paginationAPI.update({
            currentPage: bannedWordsState.tabPaginations[tabId]?.currentPage || 1,
            totalItems: filtered.length
        });
    }

    // Повний рендер таблиці
    tableAPI.render(paginated);
}

/**
 * Скинути всі checkTableAPIs (для реініціалізації)
 */
export function resetCheckTableAPIs() {
    checkTableAPIs.clear();
}

/**
 * Ініціалізувати фільтри для check табу
 * @param {string} tabId - ID табу
 */
export function initCheckTabFilters(tabId) {
    const filterButtons = document.querySelectorAll(`.nav-icon[data-filter][data-tab-id="${tabId}"]`);

    if (!filterButtons.length) {
        console.warn('⚠️ Фільтри не знайдено для табу:', tabId);
        return;
    }

    // Встановити початковий фільтр
    if (!bannedWordsState.tabFilters[tabId]) {
        bannedWordsState.tabFilters[tabId] = 'all';
    }

    filterButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const filter = button.dataset.filter;

            // Оновити стан фільтру
            bannedWordsState.tabFilters[tabId] = filter;

            // Зберегти стан фільтра в localStorage
            const { updateTabState } = await import('./banned-words-state-persistence.js');
            updateTabState(tabId, { filter });

            // Оновити UI активних кнопок
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Перерендерити результати з новим фільтром
            const bannedWord = bannedWordsState.bannedWords.find(w => w.local_id === bannedWordsState.selectedWord);
            await renderCheckResults(bannedWordsState.selectedSheet, bannedWord);

        });
    });

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
