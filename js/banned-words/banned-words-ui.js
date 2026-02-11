// js/banned-words/banned-words-ui.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BANNED WORDS - UI MANAGEMENT                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Відповідає за:
 * - Показ/приховування tab controls
 * - Заповнення aside панелей
 * - Ініціалізацію селекторів колонок
 * - Управління фільтрами
 */

import { bannedWordsState } from './banned-words-init.js';
import { populateSelect } from '../common/ui-select.js';
import { setupSearchColumnsSelector, setupTableColumnsSelector } from '../common/table/table-columns.js';
import { getColumns } from './banned-words-manage.js';

/**
 * Показати controls для вибраного табу
 * @param {string} tabType - 'tab-manage' або 'tab-check-...'
 */
export function showTabControls(tabType) {
    const manageControls = document.getElementById('tab-manage-controls');
    const checkControls = document.getElementById('tab-check-controls');

    if (tabType === 'tab-manage') {
        if (manageControls) manageControls.classList.remove('u-hidden');
        if (checkControls) checkControls.classList.add('u-hidden');
    } else {
        if (manageControls) manageControls.classList.add('u-hidden');
        if (checkControls) checkControls.classList.remove('u-hidden');
    }
}

/**
 * Показати aside панелі та заповнити їх даними
 */
export function showAsidePanels() {
    // Заповнити селекти для перевірки
    populateCheckSelects();

    // Заповнити колонки таблиці ПЕРЕД колонками пошуку
    populateTableColumns();

    // Заповнити колонки для пошуку (залежать від visibleColumns)
    populateSearchColumns();

    // Ініціалізувати чекбокс приховування (вимкнено - елемент не знайдено)
    // initHideCheckedToggle();
}

/**
 * Заповнити selects в aside для перевірки (аркуші та слова)
 */
export function populateCheckSelects() {

    // Заповнити аркуші
    populateSelect('aside-select-sheet',
        bannedWordsState.sheetNames.map(name => ({ value: name, text: name })),
        { placeholder: '-- Оберіть аркуш --' }
    );

    // Заповнити заборонені слова
    populateSelect('aside-select-word',
        bannedWordsState.bannedWords.map(word => {
            // ЗМІНЕНО: Використовуємо group_name_ua
            const displayName = word.group_name_ua || 'N/A';
            return { value: word.local_id, text: displayName };
        }),
         { placeholder: '-- Оберіть слово --' }
     );

}

/**
 * Заповнити колонки для пошуку в aside
 * Використовує універсальну функцію setupSearchColumnsSelector
 */
export function populateSearchColumns() {
    setupSearchColumnsSelector({
        containerId: 'search-columns-list',
        getColumns,
        state: bannedWordsState,
        checkboxPrefix: 'search-col-banned'
    });
}

/**
 * Заповнити колонки таблиці в dropdown
 * Використовує універсальну функцію setupTableColumnsSelector
 */
export function populateTableColumns() {
    setupTableColumnsSelector({
        containerId: 'table-columns-list',
        getColumns,
        state: bannedWordsState,
        checkboxPrefix: 'banned-col',
        searchColumnsContainerId: 'search-columns-list',
        onVisibilityChange: async (selectedIds) => {
            // Оновити visible columns в tableAPI якщо він існує
            if (bannedWordsState.manageTableAPI) {
                bannedWordsState.manageTableAPI.setVisibleColumns(selectedIds);
            }
            // Перемальовати таблицю
            const { renderBannedWordsTable } = await import('./banned-words-manage.js');
            await renderBannedWordsTable();
        }
    });
}

/**
 * Ініціалізувати чекбокс приховування перевірених рядків
 */
export function initHideCheckedToggle() {
    const hideCheckedToggle = document.getElementById('hide-checked-toggle');
    if (!hideCheckedToggle) {
        console.warn('⚠️ hide-checked-toggle не знайдено');
        return;
    }

    // Уникнути дублювання
    if (hideCheckedToggle.dataset.eventInit) return;
    hideCheckedToggle.dataset.eventInit = 'true';

    hideCheckedToggle.addEventListener('change', async (e) => {
        bannedWordsState.hideChecked = e.target.checked;

        // Перемальовати таблицю
        const { renderBannedWordsTable } = await import('./banned-words-manage.js');
        await renderBannedWordsTable();
    });

}
