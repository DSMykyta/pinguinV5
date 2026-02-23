// js/banned-words/banned-words-check.js
// Вибіркова перевірка текстів на заборонені слова
// Таблиця результатів — через createManagedTable

import { bannedWordsState, getCachedCheckResults, setCachedCheckResults, invalidateCheckCache } from './banned-words-init.js';
import { loadSheetDataForCheck, checkTextForBannedWords, updateProductStatus } from './banned-words-data.js';
import { showLoader, showErrorDetails } from '../common/ui-loading.js';
import { showToast } from '../common/ui-toast.js';
import { escapeHtml } from '../utils/text-utils.js';
import { createManagedTable } from '../common/table/table-managed.js';
import { col } from '../common/table/table-main.js';
import { initPaginationCharm } from '../common/charms/pagination/pagination-main.js';
import { registerActionHandlers, initActionHandlers, actionButton} from '../common/ui-actions.js';

// AbortController для скасування завантаження
let currentAbortController = null;

// Map для зберігання managed tables для кожного табу check
const checkManagedTables = new Map();

/**
 * Виконати перевірку ВСІХ обраних заборонених слів в УСІХ обраних колонках
 */
export async function performCheck(sheetName, wordId, columnName) {
    const { selectedSheet, selectedWord, selectedColumn } = bannedWordsState;

    const selectedSheets = bannedWordsState.selectedSheets || [selectedSheet || sheetName];
    const selectedColumns = bannedWordsState.selectedColumns || [selectedColumn || columnName];
    const selectedWords = bannedWordsState.selectedWords || [selectedWord || wordId];

    const sheetsKey = [...selectedSheets].sort().join('-');
    const columnsKey = [...selectedColumns].sort().join('-');
    const wordsKey = [...selectedWords].sort().join('-');
    const tabId = `check-${sheetsKey}-${wordsKey}-${columnsKey}`;

    const container = document.getElementById(`check-results-${tabId}`);

    if (!container) {
        console.error(`❌ Контейнер check-results-${tabId} не знайдено`);
        showToast('Помилка: контейнер для результатів не знайдено', 'error');
        return;
    }

    const loader = showLoader(container, {
        type: 'progress',
        message: 'Підготовка до перевірки...',
        overlay: true
    });

    if (!loader) {
        console.error('❌ Не вдалося створити loader');
        return;
    }

    try {
        invalidateCheckCache(sheetsKey, wordsKey, columnsKey);

        loader.updateProgress(5, 'Перевірка кешу...');
        const cachedResults = getCachedCheckResults(sheetsKey, wordsKey, columnsKey);

        if (cachedResults) {
            loader.updateProgress(50, 'Використання кешованих результатів...');

            bannedWordsState.checkResults = cachedResults;
            bannedWordsState.selectedSheet = sheetName;
            bannedWordsState.selectedWord = selectedWords[0];
            bannedWordsState.selectedColumn = columnName;

            loader.updateProgress(70, 'Підготовка результатів...');
            initCheckManagedTable(tabId, container, cachedResults, selectedSheets, selectedColumns);

            loader.updateProgress(85, 'Налаштування пагінації...');
            bannedWordsState.tabPaginations[tabId] = {
                renderFn: async () => { const mt = checkManagedTables.get(tabId); if (mt) mt.refilter(); }
            };
            initPaginationCharm(container.parentElement);

            loader.updateProgress(95, 'Налаштування фільтрів...');
            initCheckTabFilters(tabId);

            const totalMatchCount = cachedResults.reduce((sum, r) => sum + (r.matchCount || 0), 0);
            updateAsideStats(cachedResults.length, totalMatchCount);

            loader.updateProgress(100, 'Готово!');
            setTimeout(() => {
                loader.hide();
                showToast(`Завантажено з кешу: ${cachedResults.length} результатів`, 'success', 2000);
            }, 200);

            return;
        }

        // Отримати всі обрані заборонені слова
        loader.updateProgress(10, 'Підготовка слів для пошуку...');
        const bannedWordObjects = selectedWords
            .map(wId => bannedWordsState.bannedWords.find(w => w.local_id === wId))
            .filter(Boolean);

        if (bannedWordObjects.length === 0) {
            loader.hide();
            showToast('Заборонені слова не знайдено', 'error');
            return;
        }

        const allUkrWords = [];
        const allRusWords = [];
        bannedWordObjects.forEach(word => {
            if (word.name_uk_array) allUkrWords.push(...word.name_uk_array);
            if (word.name_ru_array) allRusWords.push(...word.name_ru_array);
        });

        const uniqueUkrWords = [...new Set(allUkrWords)];
        const uniqueRusWords = [...new Set(allRusWords)];

        const groupNames = bannedWordObjects.map(w => w.group_name_ua || w.local_id).slice(0, 3);
        const wordsLabel = groupNames.length <= 3
            ? groupNames.join(', ')
            : `${groupNames.join(', ')}... (+${bannedWordObjects.length - 3})`;

        const allResults = [];
        let validCombinations = 0;
        let currentStep = 0;
        const totalSteps = selectedSheets.length * selectedColumns.length;

        for (const sheet of selectedSheets) {
            for (const colName of selectedColumns) {
                currentStep++;

                let searchWordsArray;
                if (colName.includes('Ukr')) {
                    searchWordsArray = uniqueUkrWords;
                } else if (colName.includes('Ros') || colName.includes('Rus')) {
                    searchWordsArray = uniqueRusWords;
                } else {
                    continue;
                }

                if (!searchWordsArray || searchWordsArray.length === 0) continue;

                try {
                    const progressPercent = Math.round(10 + (currentStep / totalSteps) * 70);
                    loader.updateProgress(
                        Math.min(progressPercent, 80),
                        `${sheet} / ${colName}\n${wordsLabel}`
                    );

                    const sheetData = await loadSheetDataForCheck(sheet, colName);
                    validCombinations++;

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
                                columnName: colName,
                                fullText: item.targetValue,
                                searchWords: searchWordsArray,
                                matchCount: totalMatchCount,
                                foundWordsList: foundWords.map(f => f.word)
                            });
                        }
                    });
                } catch (error) {
                    if (error.message && error.message.includes('не знайдена')) continue;
                    if (error.message && error.message.includes('Internal server error')) {
                        console.warn(`⚠️ API помилка для ${sheet}/${colName} - пропускаємо`);
                        continue;
                    }
                    console.error(`❌ Помилка перевірки ${sheet}/${colName}:`, error);
                }
            }
        }

        loader.updateProgress(85, 'Агрегація результатів...');
        const aggregatedResults = aggregateResultsByProduct(allResults);

        bannedWordsState.checkResults = aggregatedResults;
        bannedWordsState.selectedSheet = sheetName;
        bannedWordsState.selectedWord = selectedWords[0];
        bannedWordsState.selectedColumn = columnName;

        const columnsWithErrors = [...new Set(allResults.map(r => r.columnName))];
        bannedWordsState.columnsWithErrors = columnsWithErrors;

        setCachedCheckResults(sheetsKey, wordsKey, columnsKey, aggregatedResults);

        loader.updateProgress(80, 'Підготовка результатів...');
        initCheckManagedTable(tabId, container, aggregatedResults, selectedSheets, selectedColumns);

        const totalMatchCount = aggregatedResults.reduce((sum, r) => sum + (r.matchCount || 0), 0);

        loader.updateProgress(90, 'Налаштування пагінації...');
        bannedWordsState.tabPaginations[tabId] = {
            renderFn: async () => { const mt = checkManagedTables.get(tabId); if (mt) mt.refilter(); }
        };
        initPaginationCharm(container.parentElement);

        loader.updateProgress(95, 'Налаштування фільтрів...');
        initCheckTabFilters(tabId);

        updateAsideStats(aggregatedResults.length, totalMatchCount);

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
 */
function aggregateResultsByProduct(results) {
    const productMap = new Map();

    for (const result of results) {
        if (!result.sheetName || !result.id) continue;

        const key = `${result.sheetName}::${result.id}`;
        const resultMatchCount = result.matchCount || 0;

        if (!productMap.has(key)) {
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

        existing.columns.push({
            columnName: result.columnName,
            matchCount: resultMatchCount,
            foundWordsList: result.foundWordsList || [],
            fullText: result.fullText
        });

        existing.matchCount += resultMatchCount;

        if (!existing.columnNames.includes(result.columnName)) {
            existing.columnNames.push(result.columnName);
        }

        if (result.foundWordsList && result.foundWordsList.length > 0) {
            existing.foundWordsList.push(...result.foundWordsList);
        }
    }

    const aggregated = Array.from(productMap.values()).map(item => {
        if (item.columnNames.length > 1) {
            item.columnName = `${item.columnNames.length} колонки`;
            item.multipleColumns = true;
        }
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
    const showColumnColumn = (columnsWithErrors || []).length > 1;

    const columns = [
        { ...col('id', 'ID', 'tag'), searchable: true },
        { ...col('title', 'Назва', 'name', { span: 4 }), searchable: true }
    ];

    if (showSheetColumn) {
        columns.push(col('sheetName', 'Аркуш', 'code', { span: 2 }));
    }

    if (showColumnColumn) {
        columns.push({
            id: 'columnName',
            label: 'Колонка',
            span: 2,
            sortable: true,
            render: (value, row) => {
                if (row.multipleColumns && row.columnNames) {
                    const tooltip = row.columnNames.join('\n');
                    return `<code data-tooltip="${escapeHtml(tooltip)}" data-tooltip-always>${escapeHtml(value)}</code>`;
                }
                return value ? `<code>${escapeHtml(value)}</code>` : '';
            }
        });
    }

    columns.push(
        {
            ...col('matchCount', 'Кількість', 'counter'),
            tooltip: false,
            render: (value) => (value != null && value !== '')
                ? `<span class="counter c-red">${value}×</span>`
                : ''
        },
        col('cheaked_line', 'Статус', 'badge-toggle')
    );

    return columns;
}

/**
 * Створити / оновити managed table для check табу
 */
function initCheckManagedTable(tabId, container, data, selectedSheets, selectedColumns) {
    const columnsWithErrors = bannedWordsState.columnsWithErrors || [];

    // Реєструємо обробник view
    registerActionHandlers(`banned-words-check-${tabId}`, {
        view: async (rowId, actionData) => {
            const productId = rowId;
            const rowIndex = actionData.rowIndex;

            if (!productId || !rowIndex) return;

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

    // Видалити стару managed table якщо є
    if (checkManagedTables.has(tabId)) {
        checkManagedTables.get(tabId).destroy();
        checkManagedTables.delete(tabId);
    }

    const columns = getCheckResultsColumns(selectedSheets, selectedColumns, columnsWithErrors);

    const mt = createManagedTable({
        container: container,
        columns: columns,
        data: data,
        columnsListId: null,
        searchInputId: null, // Пошук через shared input (banned-words-aside.js)
        statsId: null,
        paginationId: null,
        tableConfig: {
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
            emptyState: { message: 'Заборонене слово не знайдено в цій колонці' },
            withContainer: false,
            onAfterRender: (cont) => attachCheckRowEventHandlers(cont, tabId),
            plugins: {
                sorting: {
                    columnTypes: {
                        id: 'id-text',
                        title: 'string',
                        sheetName: 'string',
                        columnName: 'string',
                        matchCount: 'number',
                        cheaked_line: 'boolean'
                    }
                }
            }
        },
        preFilter: (items) => {
            let filtered = items;

            // Фільтр checked/unchecked
            const activeFilter = bannedWordsState.tabFilters[tabId] || 'all';
            if (activeFilter === 'checked') {
                filtered = filtered.filter(r => r.cheaked_line === 'TRUE' || r.cheaked_line === true);
            } else if (activeFilter === 'unchecked') {
                filtered = filtered.filter(r => r.cheaked_line !== 'TRUE' && r.cheaked_line !== true);
            }

            // Текстовий пошук (shared input)
            if (bannedWordsState.searchQuery) {
                const query = bannedWordsState.searchQuery.toLowerCase();
                filtered = filtered.filter(result => {
                    const idMatch = result.id?.toString().toLowerCase().includes(query);
                    const titleMatch = result.title?.toLowerCase().includes(query);
                    return idMatch || titleMatch;
                });
            }

            return filtered;
        },
        pageSize: null,
        checkboxPrefix: `banned-check-${tabId}`
    });

    checkManagedTables.set(tabId, mt);

    // Оновити заголовок табу
    updateCheckTabHeader(tabId, selectedSheets, selectedColumns);
}

/**
 * Оновити заголовок check табу
 */
function updateCheckTabHeader(tabId, selectedSheets, selectedColumns) {
    const selectedWords = bannedWordsState.selectedWords || [bannedWordsState.selectedWord];

    const tabTitle = document.getElementById(`check-tab-title-${tabId}`);
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
}

/**
 * Додати обробники подій для рядків таблиці перевірки
 */
async function attachCheckRowEventHandlers(container, tabId) {
    initActionHandlers(container, `banned-words-check-${tabId}`);

    // Обробник кліків на clickable badges
    container.querySelectorAll('.badge[data-badge-id]').forEach(badge => {
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

                // refilter замість повного рендеру
                const mt = checkManagedTables.get(tabId);
                if (mt) mt.refilter();

            } catch (error) {
                console.error('❌ Помилка оновлення статусу:', error);
                showToast('Помилка при оновленні статусу: ' + error.message, 'error');
            }
        });
    });

    // Ініціалізувати batch actions
    const { initBatchActionsBar, toggleProductSelection, selectAll, deselectAll, isAllSelected } = await import('./banned-words-batch.js');
    initBatchActionsBar(tabId);

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
 * Оновити тільки рядки таблиці перевірки (refilter)
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

    const mt = checkManagedTables.get(tabId);
    if (mt) {
        mt.refilter();
    } else {
        await renderCheckResults(sheetName, bannedWord);
    }
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
    if (!container) return;

    const mt = checkManagedTables.get(tabId);
    if (mt) {
        mt.updateData(bannedWordsState.checkResults);
    } else {
        initCheckManagedTable(tabId, container, bannedWordsState.checkResults, selectedSheets, selectedColumns);
    }
}

/**
 * Скинути всі checkManagedTables
 */
export function resetCheckTableAPIs() {
    checkManagedTables.forEach(mt => mt.destroy());
    checkManagedTables.clear();
}

/**
 * Ініціалізувати фільтри для check табу
 */
export function initCheckTabFilters(tabId) {
    const filterButtons = document.querySelectorAll(`.btn-icon.expand[data-filter][data-tab-id="${tabId}"]`);
    if (!filterButtons.length) return;

    if (!bannedWordsState.tabFilters[tabId]) {
        bannedWordsState.tabFilters[tabId] = 'all';
    }

    filterButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const filter = button.dataset.filter;

            bannedWordsState.tabFilters[tabId] = filter;

            const { updateTabState } = await import('./banned-words-state-persistence.js');
            updateTabState(tabId, { filter });

            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // refilter через managed table
            const mt = checkManagedTables.get(tabId);
            if (mt) mt.refilter();
        });
    });
}

/**
 * Оновити статистику в aside
 */
function updateAsideStats(productCount, totalOccurrences) {
    const statsEl = document.getElementById('check-results-count');
    if (statsEl) {
        statsEl.textContent = productCount;
    }
}
