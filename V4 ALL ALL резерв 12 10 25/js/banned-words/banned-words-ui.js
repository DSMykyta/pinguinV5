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
import { createColumnSelector } from '../common/ui-table-columns.js';

/**
 * Показати controls для вибраного табу
 * @param {string} tabType - 'tab-manage' або 'tab-check-...'
 */
export function showTabControls(tabType) {
    const manageControls = document.getElementById('tab-manage-controls');
    const checkControls = document.getElementById('tab-check-controls');

    if (tabType === 'tab-manage') {
        if (manageControls) manageControls.style.display = 'flex';
        if (checkControls) checkControls.style.display = 'none';
    } else {
        if (manageControls) manageControls.style.display = 'none';
        if (checkControls) checkControls.style.display = 'flex';
    }
}

/**
 * Показати aside панелі та заповнити їх даними
 */
export function showAsidePanels() {
    // Заповнити селекти для перевірки
    populateCheckSelects();

    // Заповнити колонки для пошуку
    populateSearchColumns();

    // Заповнити колонки таблиці
    populateTableColumns();

    // Ініціалізувати чекбокс приховування
    // initHideCheckedToggle(); Помилка: елемент не знайдено}//
}

/**
 * Заповнити selects в aside для перевірки (аркуші та слова)
 */
export function populateCheckSelects() {
    console.log(`📊 Заповнення селектів: ${bannedWordsState.sheetNames.length} аркушів, ${bannedWordsState.bannedWords.length} слів`);

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

    console.log('✅ Селекти для перевірки заповнено');
}

/**
 * Заповнити колонки для пошуку в dropdown
 */
export function populateSearchColumns() {
    const allSearchColumns = [
        { id: 'local_id', label: 'ID', checked: true },
        { id: 'severity', label: 'Рівень', checked: true }, // ДОДАНО
        { id: 'group_name_ua', label: 'Назва Групи', checked: true }, // ДОДАНО
        { id: 'name_uk', label: 'Ключові слова (UA)', checked: true }, // ЗМІНЕНО
        { id: 'name_ru', label: 'Ключові слова (RU)', checked: true }, // ЗМІНЕНО
        { id: 'banned_type', label: 'Тип порушення', checked: true },
        { id: 'banned_explaine', label: 'Пояснення', checked: false },
        { id: 'banned_hint', label: 'Підказка', checked: false },
        { id: 'cheaked_line', label: 'Перевірено', checked: false }
    ];

    // Створити селектор колонок з фільтрацією по видимих колонках
    createColumnSelector('search-columns-list', allSearchColumns, {
        checkboxPrefix: 'search-col',
        filterBy: bannedWordsState.visibleColumns,
        onChange: (selectedIds) => {
            bannedWordsState.searchColumns = selectedIds;
            console.log('🔍 Колонки пошуку:', bannedWordsState.searchColumns);
        }
    });

    console.log('✅ Колонки пошуку заповнено');
}

/**
 * Заповнити колонки таблиці в dropdown
 */
export function populateTableColumns() {
    const tableColumns = [
        { id: 'local_id', label: 'ID', checked: true },
        { id: 'severity', label: 'Рівень', checked: true }, // ДОДАНО
        { id: 'group_name_ua', label: 'Назва Групи', checked: true }, // ДОДАНО
        { id: 'name_uk', label: 'Ключові слова (UA)', checked: false }, // ЗМІНЕНО (за замовчуванням приховано)
        { id: 'name_ru', label: 'Ключові слова (RU)', checked: false }, // ЗМІНЕНО (за замовчуванням приховано)
        { id: 'banned_type', label: 'Тип', checked: true },
        { id: 'banned_explaine', label: 'Пояснення', checked: false },
        { id: 'banned_hint', label: 'Підказка', checked: false },
        { id: 'cheaked_line', label: 'Перевірено', checked: true }
    ];

    // Створити селектор колонок
    const columnSelector = createColumnSelector('table-columns-list', tableColumns, {
        checkboxPrefix: 'table-col',
        onChange: async (selectedIds) => {
            bannedWordsState.visibleColumns = selectedIds;
            console.log('📋 Видимі колонки:', bannedWordsState.visibleColumns);

            // Оновити колонки пошуку (фільтруються по видимих)
            populateSearchColumns();

            // Перемальовати таблицю
            const { renderBannedWordsTable } = await import('./banned-words-manage.js');
            await renderBannedWordsTable();
        }
    });

    // Зберегти початкові видимі колонки в state
    if (columnSelector) {
        bannedWordsState.visibleColumns = columnSelector.getSelected();
    }

    console.log('✅ Колонки таблиці заповнено');
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
        console.log(`🔍 Приховати перевірені: ${bannedWordsState.hideChecked}`);

        // Перемальовати таблицю
        const { renderBannedWordsTable } = await import('./banned-words-manage.js');
        await renderBannedWordsTable();
    });

    console.log('✅ Чекбокс приховування ініціалізовано');
}
