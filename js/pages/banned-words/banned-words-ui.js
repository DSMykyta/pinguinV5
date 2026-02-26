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

import { bannedWordsState } from './banned-words-state.js';
import { populateSelect } from '../../components/forms/select.js';

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
 * Column selectors тепер в createManagedTable (banned-words-manage.js)
 */
export function showAsidePanels() {
    populateCheckSelects();
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

// populateSearchColumns та populateTableColumns видалені
// Column selectors тепер в createManagedTable (banned-words-manage.js)
export function populateSearchColumns() {}
export function populateTableColumns() {}

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
