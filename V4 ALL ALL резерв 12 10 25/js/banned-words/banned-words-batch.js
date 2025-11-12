// js/banned-words/banned-words-batch.js
// Масові операції для banned words (використовує універсальний ui-batch-actions.js)

import { bannedWordsState, invalidateCheckCache } from './banned-words-init.js';
import { TEXTS_SPREADSHEET_ID, BANNED_SPREADSHEET_ID } from './banned-words-data.js';
import { showToast } from '../common/ui-toast.js';
import { createBatchActionsBar, getBatchBar } from '../common/ui-batch-actions.js';
import { batchUpdate } from '../utils/google-sheets-batch.js';

/**
 * Ініціалізувати batch actions bar для табу
 * @param {string} tabId - ID табу
 */
export function initBatchActionsBar(tabId) {
    // Перевірити чи вже існує панель
    const existingBar = getBatchBar(tabId);
    if (existingBar) {
        console.log(`✅ Batch bar для ${tabId} вже існує`);
        return existingBar;
    }

    // Ініціалізувати Set для вибраних товарів
    if (!bannedWordsState.selectedProducts[tabId]) {
        bannedWordsState.selectedProducts[tabId] = new Set();
    }

    // Визначити дії для панелі
    const actions = [
        {
            id: 'mark-checked',
            label: 'Позначити перевіреними',
            icon: 'check_circle',
            primary: true,
            handler: async (selectedIds, tabId) => {
                await batchMarkChecked(selectedIds, tabId);
            }
        },
        {
            id: 'export-csv',
            label: 'Експорт CSV',
            icon: 'download',
            handler: async (selectedIds, tabId) => {
                await batchExportCSV(selectedIds, tabId);
            }
        }
    ];

    // Створити панель
    const batchBar = createBatchActionsBar({
        tabId,
        actions,
        onSelectionChange: (count) => {
            console.log(`📊 ${tabId}: вибрано ${count} елементів`);

            // Синхронізувати зовнішній state при зняті всіх виборів
            if (count === 0 && bannedWordsState.selectedProducts[tabId]) {
                bannedWordsState.selectedProducts[tabId].clear();
            }

            // Оновити візуальний стан чекбоксів при зміні вибору
            updateCheckboxes(tabId);
        }
    });

    console.log(`✅ Batch bar ініціалізовано для ${tabId}`);
    return batchBar;
}

/**
 * Вибрати товар
 * @param {string} tabId - ID табу
 * @param {string} productId - ID товару
 */
export function selectProduct(tabId, productId) {
    const batchBar = getBatchBar(tabId);
    if (batchBar) {
        batchBar.selectItem(productId);
    }

    // Також зберегти в state для сумісності
    if (!bannedWordsState.selectedProducts[tabId]) {
        bannedWordsState.selectedProducts[tabId] = new Set();
    }
    bannedWordsState.selectedProducts[tabId].add(productId);
}

/**
 * Зняти вибір товару
 * @param {string} tabId - ID табу
 * @param {string} productId - ID товару
 */
export function deselectProduct(tabId, productId) {
    const batchBar = getBatchBar(tabId);
    if (batchBar) {
        batchBar.deselectItem(productId);
    }

    // Також видалити з state
    if (bannedWordsState.selectedProducts[tabId]) {
        bannedWordsState.selectedProducts[tabId].delete(productId);
    }
}

/**
 * Перемкнути вибір товару
 * @param {string} tabId - ID табу
 * @param {string} productId - ID товару
 */
export function toggleProductSelection(tabId, productId) {
    const batchBar = getBatchBar(tabId);
    if (batchBar) {
        // СПОЧАТКУ синхронізувати зовнішній state (щоб updateCheckboxes бачив актуальний state)
        if (!bannedWordsState.selectedProducts[tabId]) {
            bannedWordsState.selectedProducts[tabId] = new Set();
        }

        // Передбачити зміну: якщо зараз вибраний - буде знято, якщо ні - буде вибрано
        if (batchBar.isSelected(productId)) {
            bannedWordsState.selectedProducts[tabId].delete(productId);
        } else {
            bannedWordsState.selectedProducts[tabId].add(productId);
        }

        // ПОТІМ викликати toggleItem (який викликає onSelectionChange → updateCheckboxes)
        batchBar.toggleItem(productId);
    }
}

/**
 * Вибрати всі товари
 * @param {string} tabId - ID табу
 * @param {Array<string>} productIds - Масив ID товарів
 */
export function selectAll(tabId, productIds) {
    const batchBar = getBatchBar(tabId);
    if (batchBar) {
        batchBar.selectAll(productIds);
    }

    // Синхронізувати з state
    if (!bannedWordsState.selectedProducts[tabId]) {
        bannedWordsState.selectedProducts[tabId] = new Set();
    }
    productIds.forEach(id => bannedWordsState.selectedProducts[tabId].add(id));

    // Оновити чекбокси
    updateCheckboxes(tabId);
}

/**
 * Зняти вибір всіх товарів
 * @param {string} tabId - ID табу
 */
export function deselectAll(tabId) {
    // СПОЧАТКУ синхронізувати з state (щоб updateCheckboxes бачив очищений state)
    if (bannedWordsState.selectedProducts[tabId]) {
        bannedWordsState.selectedProducts[tabId].clear();
    }

    // ПОТІМ викликати deselectAll (який викликає onSelectionChange → updateCheckboxes)
    const batchBar = getBatchBar(tabId);
    if (batchBar) {
        batchBar.deselectAll();
    }

    // Оновити чекбокси (на всяк випадок, якщо callback не спрацював)
    updateCheckboxes(tabId);
}

/**
 * Оновити видимість batch bar
 * @param {string} tabId - ID табу
 */
export function updateBatchBarVisibility(tabId) {
    const batchBar = getBatchBar(tabId);
    if (batchBar) {
        batchBar.update();
    }
}

/**
 * Перевірити чи всі елементи вибрані
 * @param {string} tabId - ID табу
 * @returns {boolean} true якщо всі вибрані
 */
export function isAllSelected(tabId) {
    const batchBar = getBatchBar(tabId);
    if (!batchBar) return false;

    // Визначити контейнер
    let container;
    if (tabId === 'tab-manage') {
        container = document.getElementById('banned-words-table-container');
    } else {
        container = document.getElementById(`check-results-${tabId}`);
    }

    if (!container) return false;

    const checkboxes = container.querySelectorAll('.row-checkbox');
    if (checkboxes.length === 0) return false;

    const allIds = Array.from(checkboxes).map(cb => cb.dataset.productId);
    const selectedSet = bannedWordsState.selectedProducts[tabId] || new Set();

    return allIds.every(id => selectedSet.has(id));
}

/**
 * Оновити стан всіх чекбоксів в таблиці
 * @param {string} tabId - ID табу
 */
function updateCheckboxes(tabId) {
    // Визначити правильний контейнер для табу
    let container;
    if (tabId === 'tab-manage') {
        container = document.getElementById('banned-words-table-container');
    } else {
        container = document.getElementById(`check-results-${tabId}`);
    }

    if (!container) {
        console.warn(`⚠️ Контейнер не знайдено для ${tabId}`);
        return;
    }

    const checkboxes = container.querySelectorAll('.row-checkbox');
    const selectedSet = bannedWordsState.selectedProducts[tabId] || new Set();

    checkboxes.forEach(checkbox => {
        const productId = checkbox.dataset.productId;
        checkbox.checked = selectedSet.has(productId);
    });

    // Оновити "select all" checkbox
    const selectAllCheckbox = container.querySelector('.select-all-checkbox');
    if (selectAllCheckbox) {
        const allIds = Array.from(checkboxes).map(cb => cb.dataset.productId);
        const allSelected = allIds.length > 0 && allIds.every(id => selectedSet.has(id));
        selectAllCheckbox.checked = allSelected;
    }
}

/**
 * Позначити вибрані товари як перевірені
 * @param {Array<string>} selectedIds - ID вибраних товарів
 * @param {string} tabId - ID табу
 */
async function batchMarkChecked(selectedIds, tabId) {
    if (selectedIds.length === 0) {
        showToast('Не вибрано жодного елемента', 'warning');
        return;
    }

    const count = selectedIds.length;
    showToast(`Оновлення ${count} записів...`, 'info', 2000);

    try {
        let successCount = 0;
        let failedCount = 0;

        // Визначити джерело даних та spreadsheet
        let dataSource;
        let sheetName;
        let spreadsheetId;
        let columnLetter; // Літера колонки (A, B, G...)

        if (tabId === 'tab-manage') {
            // Для tab-manage оновлюємо заборонені слова
            dataSource = bannedWordsState.bannedWords;
            sheetName = 'Banned';
            spreadsheetId = BANNED_SPREADSHEET_ID;
            columnLetter = 'G'; // cheaked_line в таблиці Banned
        } else {
            // Для check табів оновлюємо результати перевірки
            dataSource = bannedWordsState.checkResults;
            sheetName = bannedWordsState.selectedSheet;
            spreadsheetId = TEXTS_SPREADSHEET_ID;
            columnLetter = 'G'; // cheaked_line зазвичай в колонці G
        }

        // Зібрати елементи для оновлення
        const itemsToUpdate = [];

        for (const id of selectedIds) {
            let item;
            if (tabId === 'tab-manage') {
                item = dataSource.find(w => w.local_id === id);
            } else {
                item = dataSource.find(p => p.id === id);
            }

            if (!item) {
                console.warn(`⚠️ Товар ${id} не знайдено`);
                failedCount++;
                continue;
            }

            // Пропустити якщо вже перевірено
            if (item.cheaked_line === 'TRUE' || item.cheaked_line === true) {
                console.log(`ℹ️ ${id} вже перевірено`);
                successCount++;
                continue;
            }

            // Перевірити наявність _rowIndex
            if (!item._rowIndex) {
                console.warn(`⚠️ ${id} не має _rowIndex`);
                failedCount++;
                continue;
            }

            itemsToUpdate.push(item);
        }

        // Якщо є елементи для оновлення - викликати batch API
        if (itemsToUpdate.length > 0) {
            const updates = itemsToUpdate.map(item => ({
                sheet: sheetName,
                row: item._rowIndex,
                column: columnLetter, // Використовуємо літеру колонки (G)
                value: 'TRUE'
            }));

            console.log(`📦 Batch update: ${updates.length} комірок...`);

            try {
                // Один запит замість багатьох!
                await batchUpdate({ spreadsheetId, updates });

                // Оновити локальні дані для всіх успішно оновлених елементів
                itemsToUpdate.forEach(item => {
                    item.cheaked_line = 'TRUE';
                    successCount++;
                    console.log(`✅ ${item.id || item.local_id} позначено як перевірене`);
                });

            } catch (error) {
                console.error(`❌ Помилка batch оновлення:`, error);
                failedCount += itemsToUpdate.length;
            }
        }

        // Очистити кеш якщо це check таб
        if (tabId.startsWith('check-')) {
            const [, sheet, word, column] = tabId.split('-');
            invalidateCheckCache(bannedWordsState.selectedSheet, bannedWordsState.selectedWord, bannedWordsState.selectedColumn);
        }

        // Показати результат
        if (successCount > 0) {
            showToast(`✅ ${successCount} слів позначено як перевірені`, 'success', 3000);
        }
        if (failedCount > 0) {
            showToast(`⚠️ ${failedCount} помилок при оновленні`, 'warning', 3000);
        }

        // Зняти вибір
        deselectAll(tabId);

        // Перерендерити таблицю
        if (tabId === 'tab-manage') {
            const { renderBannedWordsTable } = await import('./banned-words-manage.js');
            await renderBannedWordsTable();
        } else {
            const { renderCheckResults } = await import('./banned-words-check.js');
            const bannedWord = bannedWordsState.bannedWords.find(w => w.local_id === bannedWordsState.selectedWord);
            await renderCheckResults(bannedWordsState.selectedSheet, bannedWord);
        }
    } catch (error) {
        console.error('❌ Помилка масового оновлення:', error);
        showToast('Помилка оновлення', 'error');
    }
}

/**
 * Експортувати вибрані товари в CSV
 * @param {Array<string>} selectedIds - ID вибраних товарів
 * @param {string} tabId - ID табу
 */
async function batchExportCSV(selectedIds, tabId) {
    if (selectedIds.length === 0) {
        showToast('Не вибрано жодного елемента', 'warning');
        return;
    }

    try {
        let headers, rows, fileName;

        if (tabId === 'tab-manage') {
            // Експорт заборонених слів
            const selectedWords = bannedWordsState.bannedWords.filter(w => selectedIds.includes(w.local_id));

            headers = ['ID', 'Українське', 'Російське', 'Тип', 'Пояснення', 'Підказка', 'Перевірено'];
            rows = selectedWords.map(word => [
                word.local_id || '',
                `"${(word.name_uk || '').replace(/"/g, '""')}"`,
                `"${(word.name_ru || '').replace(/"/g, '""')}"`,
                `"${(word.banned_type || '').replace(/"/g, '""')}"`,
                `"${(word.banned_explaine || '').replace(/"/g, '""')}"`,
                `"${(word.banned_hint || '').replace(/"/g, '""')}"`,
                word.cheaked_line === 'TRUE' || word.cheaked_line === true ? 'Так' : 'Ні'
            ]);
            fileName = `banned-words-${new Date().toISOString().split('T')[0]}.csv`;
        } else {
            // Експорт результатів перевірки
            const selectedProducts = bannedWordsState.checkResults.filter(p => selectedIds.includes(p.id));

            headers = ['ID', 'Назва', 'Текст', 'Кількість входжень', 'Перевірено'];
            rows = selectedProducts.map(product => [
                product.id,
                `"${(product.title || '').replace(/"/g, '""')}"`,
                `"${(product.fullText || '').replace(/"/g, '""')}"`,
                product.matchCount || 0,
                product.cheaked_line === 'TRUE' || product.cheaked_line === true ? 'Так' : 'Ні'
            ]);
            fileName = `check-results-${new Date().toISOString().split('T')[0]}.csv`;
        }

        // Створити CSV
        const csv = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Завантажити файл
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);

        showToast(`✅ Експортовано ${selectedIds.length} записів`, 'success');
    } catch (error) {
        console.error('❌ Помилка експорту:', error);
        showToast('Помилка експорту', 'error');
    }
}
