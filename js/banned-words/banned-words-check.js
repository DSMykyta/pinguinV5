// js/banned-words/banned-words-check.js
// Вибіркова перевірка текстів на заборонені слова

import { bannedWordsState, getCachedCheckResults, setCachedCheckResults, invalidateCheckCache } from './banned-words-init.js';
import { loadSheetDataForCheck, checkTextForBannedWords, getTextFragment, updateProductStatus } from './banned-words-data.js';
import { showLoader, hideLoader, showErrorDetails } from '../common/ui-loading.js';
import { showToast } from '../common/ui-toast.js';
import { escapeHtml, highlightText } from '../utils/text-utils.js';
import { renderPseudoTable, renderBadge } from '../common/ui-table.js';
import { registerCheckTabPagination } from './banned-words-pagination.js';

// AbortController для скасування завантаження
let currentAbortController = null;

/**
 * Виконати перевірку вибраного заборонного слова в УСІХ обраних колонках
 * @param {string} sheetName - Назва аркуша (або перший з обраних)
 * @param {string} wordId - ID заборонного слова (local_id)
 * @param {string} columnName - Назва колонки (або перша з обраних) - для зворотної сумісності
 */
export async function performCheck(sheetName, wordId, columnName) {
    const { selectedSheet, selectedWord, selectedColumn } = bannedWordsState;
    const tabId = `check-${selectedSheet}-${selectedWord}-${selectedColumn}`;
    const container = document.getElementById(`check-results-${tabId}`);

    // Отримати ВСІ обрані аркуші та колонки
    const selectedSheets = bannedWordsState.selectedSheets || [sheetName];
    const selectedColumns = bannedWordsState.selectedColumns || [columnName];

    // Показати loader з прогресом
    const loader = showLoader(container, {
        type: 'progress',
        message: 'Підготовка до перевірки...',
        overlay: true
    });

    try {
        console.log(`🔍 Початок перевірки: аркуші=${selectedSheets.join(', ')}, слово="${wordId}", колонки=${selectedColumns.join(', ')}`);

        // Знайти заборонене слово в state
        loader.updateProgress(5, 'Пошук заборонного слова...');
        const bannedWord = bannedWordsState.bannedWords.find(w => w.local_id === wordId);
        if (!bannedWord) {
            loader.hide();
            showToast('Заборонене слово не знайдено', 'error');
            return;
        }

        console.log('📝 Заборонене слово:', bannedWord);

        // Результати з усіх комбінацій аркуш/колонка
        const allResults = [];
        let validCombinations = 0;

        // Показати початковий прогрес
        loader.updateProgress(10, 'Визначення доступних колонок...');

        // Перевірити кожну комбінацію аркуш + колонка
        for (const sheet of selectedSheets) {
            for (const col of selectedColumns) {
                // Визначити мову колонки
                let searchWordsArray;
                if (col.includes('Ukr')) {
                    searchWordsArray = bannedWord.name_uk_array;
                } else if (col.includes('Ros') || col.includes('Rus')) {
                    searchWordsArray = bannedWord.name_ru_array;
                } else {
                    console.log(`⏭️ Пропускаємо ${col} - невідома мова`);
                    continue;
                }

                if (!searchWordsArray || searchWordsArray.length === 0) {
                    console.log(`⏭️ Пропускаємо ${col} - немає слів для цієї мови`);
                    continue;
                }

                try {
                    // Спочатку перевіряємо чи колонка існує (завантаження даних)
                    const sheetData = await loadSheetDataForCheck(sheet, col);

                    // Колонка існує - тепер показуємо прогрес
                    validCombinations++;
                    const progressPercent = Math.round(10 + (validCombinations * 10));
                    loader.updateProgress(Math.min(progressPercent, 80), `Перевірка ${sheet}: ${col}...`);

                    console.log(`📥 ${sheet}/${col}: завантажено ${sheetData.length} рядків`);

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
                        // Тихо пропускаємо - це очікувана ситуація
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

        console.log(`✅ Перевірено ${validCombinations} валідних комбінацій аркуш/колонка`);

        // Агрегувати результати - якщо один товар знайдено в кількох колонках
        loader.updateProgress(85, 'Агрегація результатів...');
        const aggregatedResults = aggregateResultsByProduct(allResults);

        console.log(`✅ Перевірка завершена. Знайдено ${aggregatedResults.length} унікальних товарів`);

        // Зберегти результати в state
        bannedWordsState.checkResults = aggregatedResults;
        bannedWordsState.selectedSheet = sheetName;
        bannedWordsState.selectedWord = wordId;
        bannedWordsState.selectedColumn = columnName;

        // Визначити колонки з помилками (для показу в UI)
        const columnsWithErrors = [...new Set(allResults.map(r => r.columnName))];
        bannedWordsState.columnsWithErrors = columnsWithErrors;
        console.log(`📊 Колонки з помилками: ${columnsWithErrors.join(', ')}`);

        // Зберегти результати в кеш
        const cacheKey = `${selectedSheets.join(',')}-${wordId}-${selectedColumns.join(',')}`;
        setCachedCheckResults(sheetName, wordId, columnName, aggregatedResults);

        // Відрендерити результати
        loader.updateProgress(80, 'Підготовка результатів...');
        await renderCheckResults(sheetName, bannedWord);

        // Обчислити загальну кількість входжень
        const totalMatchCount = aggregatedResults.reduce((sum, r) => sum + (r.matchCount || 0), 0);

        // Ініціалізувати пагінацію для цього табу
        loader.updateProgress(90, 'Налаштування пагінації...');
        registerCheckTabPagination(tabId, aggregatedResults.length, async () => {
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
    // Групувати за комбінацією id + sheetName
    const productMap = new Map();

    results.forEach(result => {
        const key = `${result.sheetName}-${result.id}`;

        if (productMap.has(key)) {
            // Товар вже є - додати інформацію про колонку
            const existing = productMap.get(key);
            existing.columns.push({
                columnName: result.columnName,
                matchCount: result.matchCount,
                foundWordsList: result.foundWordsList,
                fullText: result.fullText
            });
            existing.totalMatchCount += result.matchCount;
            // Додати колонку до списку
            if (!existing.columnNames.includes(result.columnName)) {
                existing.columnNames.push(result.columnName);
            }
        } else {
            // Новий товар
            productMap.set(key, {
                id: result.id,
                title: result.title,
                cheaked_line: result.cheaked_line,
                _rowIndex: result._rowIndex,
                sheetName: result.sheetName,
                // Для відображення в таблиці
                columnName: result.columnName,
                columnNames: [result.columnName],
                matchCount: result.matchCount,
                totalMatchCount: result.matchCount,
                // Деталі по колонках
                columns: [{
                    columnName: result.columnName,
                    matchCount: result.matchCount,
                    foundWordsList: result.foundWordsList,
                    fullText: result.fullText
                }],
                searchWords: result.searchWords,
                foundWordsList: result.foundWordsList
            });
        }
    });

    // Конвертувати Map у масив та оновити columnName для відображення
    return Array.from(productMap.values()).map(item => {
        if (item.columnNames.length > 1) {
            // Багато колонок - показати кількість
            item.columnName = `${item.columnNames.length} колонки`;
            item.multipleColumns = true;
        }
        // Загальна кількість входжень
        item.matchCount = item.totalMatchCount;
        return item;
    });
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

    // Визначити чи показувати колонки Аркуш/Колонка
    const selectedSheets = bannedWordsState.selectedSheets || [bannedWordsState.selectedSheet];
    const columnsWithErrors = bannedWordsState.columnsWithErrors || [];
    const showSheetColumn = selectedSheets.length > 1;
    // Показувати колонку "Колонка" тільки якщо помилки знайдено в > 1 колонці
    const showColumnColumn = columnsWithErrors.length > 1;

    // Динамічно будуємо колонки
    const columns = [];

    // ID
    columns.push({
        id: 'id',
        label: 'ID',
        sortable: true,
        className: 'cell-id',
        render: (value) => `<span class="badge">${escapeHtml(value)}</span>`
    });

    // Назва
    columns.push({
        id: 'title',
        label: 'Назва',
        sortable: true,
        className: 'cell-name',
        render: (value) => `<strong>${escapeHtml(value)}</strong>`
    });

    // Колонка "Аркуш" - тільки якщо обрано > 1 аркуша (після Назви)
    if (showSheetColumn) {
        columns.push({
            id: 'sheetName',
            label: 'Аркуш',
            sortable: true,
            className: 'cell-sheet',
            render: (value) => `<span class="text-muted">${escapeHtml(value || '')}</span>`
        });
    }

    // Колонка "Колонка" - тільки якщо помилки в > 1 колонці
    if (showColumnColumn) {
        columns.push({
            id: 'columnName',
            label: 'Колонка',
            sortable: true,
            className: 'cell-column',
            render: (value, row) => {
                // Якщо товар має помилки в кількох колонках - показати badge
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
        className: 'cell-count',
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
        className: 'cell-bool',
        render: (value, row) => renderBadge(value, 'checked', {
            clickable: true,
            id: row.id
        })
    });

    // Рендеринг таблиці через універсальний компонент
    renderPseudoTable(container, {
        data: paginatedResults,
        columns,
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

            // Отримати інформацію про джерело з результатів
            const result = bannedWordsState.checkResults.find(r => r.id === productId);
            const sheetName = result?.sheetName || bannedWordsState.selectedSheet;

            // Якщо товар має помилки в кількох колонках - передати всі колонки з помилками
            // Інакше передати одну колонку
            const columnsForProduct = result?.columnNames || [result?.columnName || bannedWordsState.selectedColumn];
            const columnName = columnsForProduct[0];

            // Відкрити модал з повним текстом товару
            await showProductTextModal(
                productId,
                sheetName,
                parseInt(rowIndex),
                columnName,
                // Передаємо всі обрані аркуші
                bannedWordsState.selectedSheets || [bannedWordsState.selectedSheet],
                // Передаємо колонки з помилками для цього товару
                columnsForProduct
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
