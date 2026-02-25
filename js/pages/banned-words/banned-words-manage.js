// js/banned-words/banned-words-manage.js
// Управління словником заборонених слів - таблиця і CRUD операції

import { bannedWordsState } from './banned-words-init.js';
import { generateNextId } from '../../utils/common-utils.js';
import { showModal, closeModal } from '../../components/ui-modal.js';
import { initCustomSelects } from '../../components/ui-select.js';
import { initDropdowns } from '../../components/ui-dropdown.js';
import { escapeHtml } from '../../utils/text-utils.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/ui-actions.js';
import { showToast } from '../../components/ui-toast.js';

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ОБРОБНИКІВ ДІЙ
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('banned-words-manage', {
    edit: (rowId) => {
        const word = bannedWordsState.bannedWords.find(w => w.local_id === rowId);
        if (word) {
            openBannedWordModal(word);
        }
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS
// ═══════════════════════════════════════════════════════════════════════════

export function getColumns() {
    return [
        col('local_id', 'ID', 'tag'),
        col('severity', ' ', 'severity', { searchable: true }),
        col('group_name_ua', 'Назва Групи', 'name', { span: 4 }),
        col('banned_type', 'Тип', 'text', { span: 3 }),
        col('cheaked_line', 'Перевірено', 'badge-toggle')
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// MANAGED TABLE
// ═══════════════════════════════════════════════════════════════════════════

let managedTable = null;

function initManagedBannedWordsTable() {
    const visibleCols = bannedWordsState.visibleColumns.length > 0
        ? bannedWordsState.visibleColumns
        : ['local_id', 'severity', 'group_name_ua', 'banned_type', 'cheaked_line'];

    const searchCols = bannedWordsState.searchColumns.length > 0
        ? bannedWordsState.searchColumns
        : ['local_id', 'group_name_ua', 'banned_type'];

    managedTable = createManagedTable({
        container: 'banned-words-table-container',
        columns: getColumns().map(c => ({
            ...c,
            searchable: searchCols.includes(c.id) || c.searchable === true,
            checked: visibleCols.includes(c.id)
        })),
        data: bannedWordsState.bannedWords,

        // DOM IDs
        searchInputId: 'search-banned-words',
        statsId: null,
        paginationId: null,

        tableConfig: {
            rowActionsHeader: '<input type="checkbox" class="select-all-checkbox">',
            rowActions: (row) => {
                const selectedSet = bannedWordsState.selectedProducts['tab-manage'] || new Set();
                const isChecked = selectedSet.has(row.local_id);
                return `
                    <input type="checkbox" class="row-checkbox" data-product-id="${escapeHtml(row.local_id)}" ${isChecked ? 'checked' : ''}>
                    ${actionButton({ action: 'edit', rowId: row.local_id, context: 'banned-words-manage' })}
                `;
            },
            getRowId: (row) => row.local_id,
            emptyState: { message: 'Заборонені слова не знайдено' },
            withContainer: false,
            onAfterRender: attachManageRowEventHandlers,
            plugins: {
                sorting: {
                    columnTypes: {
                        local_id: 'id-number',
                        group_name_ua: 'string',
                        banned_type: 'string',
                        severity: 'string',
                        cheaked_line: 'boolean'
                    }
                }
            }
        },

        preFilter: (data) => {
            const activeFilter = bannedWordsState.tabFilters['tab-manage'] || 'all';
            if (activeFilter === 'checked') {
                return data.filter(w => w.cheaked_line === 'TRUE' || w.cheaked_line === true);
            } else if (activeFilter === 'unchecked') {
                return data.filter(w => w.cheaked_line !== 'TRUE' && w.cheaked_line !== true);
            }
            return data;
        },

        pageSize: null,
        checkboxPrefix: 'banned'
    });

    bannedWordsState.manageTableAPI = managedTable.tableAPI;
    bannedWordsState.manageManagedTable = managedTable;
}

/**
 * Додати обробники подій для рядків таблиці управління
 */
async function attachManageRowEventHandlers(container) {
    initActionHandlers(container, 'banned-words-manage');

    container.querySelectorAll('.badge[data-badge-id]').forEach(badge => {
        badge.addEventListener('click', async (e) => {
            e.stopPropagation();
            const wordId = badge.dataset.badgeId;
            if (wordId) {
                await toggleCheckedStatus(wordId);
            }
        });
    });

    const { initBatchActionsBar, toggleProductSelection, selectAll, deselectAll, isAllSelected } = await import('./banned-words-batch.js');
    initBatchActionsBar('tab-manage');

    const selectAllCheckbox = container.querySelector('.select-all-checkbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const allIds = Array.from(container.querySelectorAll('.row-checkbox')).map(cb => cb.dataset.productId);
            if (e.target.checked) {
                selectAll('tab-manage', allIds);
            } else {
                deselectAll('tab-manage');
            }
        });
    }

    container.querySelectorAll('.row-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const wordId = checkbox.dataset.productId;
            toggleProductSelection('tab-manage', wordId);
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = isAllSelected('tab-manage');
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC RENDER
// ═══════════════════════════════════════════════════════════════════════════

export async function renderBannedWordsManageTab() {
    await renderBannedWordsTable();
}

export async function renderBannedWordsTable() {
    if (!managedTable) {
        if (!document.getElementById('banned-words-table-container')) return;
        initManagedBannedWordsTable();
        return;
    }
    managedTable.updateData(bannedWordsState.bannedWords);
}

export async function renderBannedWordsTableRowsOnly() {
    if (managedTable) {
        managedTable.refilter();
    } else {
        await renderBannedWordsTable();
    }
}

export function resetManageTableAPI() {
    if (managedTable) {
        managedTable.destroy();
        managedTable = null;
    }
    bannedWordsState.manageTableAPI = null;
    bannedWordsState.manageManagedTable = null;
}

/**
 * Перемикнути статус перевірки слова
 */
async function toggleCheckedStatus(wordId) {
    const word = bannedWordsState.bannedWords.find(w => w.local_id === wordId);
    if (!word) return;

    // Перемикаємо статус
    const newStatus = word.cheaked_line === 'TRUE' ? 'FALSE' : 'TRUE';
    word.cheaked_line = newStatus;


    try {
        // Оновити в Google Sheets
        const { saveBannedWord } = await import('./banned-words-data.js');
        await saveBannedWord(word, true);

        // Перерендерити таблицю
        await renderBannedWordsTable();

        // Оновити статистику в aside
        const checkedEl = document.getElementById('manage-checked-words');
        if (checkedEl) {
            const checkedCount = bannedWordsState.bannedWords.filter(w => w.cheaked_line === 'TRUE').length;
            checkedEl.textContent = checkedCount;
        }

    } catch (error) {
        console.error('❌ Помилка оновлення статусу:', error);
        // Відкат змін у разі помилки
        word.cheaked_line = newStatus === 'TRUE' ? 'FALSE' : 'TRUE';
    }
}

// Pagination і renderCheckedBadge видалено - використовується система з ui-pagination.js та ui-table.js

/**
 * Відкрити модальне вікно для створення/редагування слова
 */
export async function openBannedWordModal(wordData = null) {
    const isEdit = !!wordData;


    // Відкрити модал
    await showModal('banned-word-edit', null);

    // Оновити заголовок модалу
    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) {
        modalTitle.textContent = isEdit ? 'Редагування слова' : 'Додати заборонене слово';
    }

    // Заповнити banned_type options (з унікальних типів)
    const typeSelect = document.getElementById('banned-word-type');
    if (typeSelect) {
        const uniqueTypes = [...new Set(bannedWordsState.bannedWords
            .map(w => w.banned_type)
            .filter(t => t && t !== '')
        )];

        uniqueTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeSelect.appendChild(option);
        });

        // Ініціалізувати custom select
        initCustomSelects(typeSelect.parentElement);

        initDropdowns();
    }

    // Зберегти ID в прихованому полі
    const hiddenIdField = document.getElementById('banned-word-local-id');
    
    // ДОДАНО: Знаходимо елементи керування рівнем небезпеки
    const severityHiddenInput = document.getElementById('banned-word-severity');
    const severityTriggerIcon = document.getElementById('severity-trigger-icon');
    const severityOptions = document.querySelectorAll('.dropdown-panel [data-severity-value]');

    // Карта для іконок/тексту рівнів
    const severityMap = {
        low: { icon: 'exclamation', text: 'Перевірити' },
        medium: { icon: 'error', text: 'Несуттєво' },
        high: { icon: 'brightness_alert', text: 'Критично' }
    };

    // Функція оновлення тригера
    const updateSeverityTrigger = (severity) => {
        const config = severityMap[severity] || severityMap.high;
        if (severityHiddenInput) severityHiddenInput.value = severity;
        if (severityTriggerIcon) severityTriggerIcon.textContent = config.icon;
    };

    // Функція оновлення бейджа "Перевірено"
    const updateCheckedBadge = (badge, isChecked) => {
        const icon = badge.querySelector('.material-symbols-outlined');
        const label = badge.querySelector('span:not(.material-symbols-outlined)');

        badge.dataset.status = isChecked ? 'TRUE' : 'FALSE';
        badge.classList.remove('c-red', 'c-green');
        badge.classList.add(isChecked ? 'c-green' : 'c-red');

        if (icon) icon.textContent = isChecked ? 'check_circle' : 'cancel';
        if (label) label.textContent = isChecked ? 'Так' : 'Ні';
    };

    // Навішуємо слухачі на кнопки вибору рівня
    severityOptions.forEach(button => {
        button.addEventListener('click', (e) => {
            const newSeverity = e.currentTarget.dataset.severityValue;
            updateSeverityTrigger(newSeverity);
            // Закриваємо dropdown (якщо він не закривається автоматично)
            const wrapper = button.closest('.dropdown-wrapper');
            if (wrapper) wrapper.classList.remove('open');
        });
    });

    // Якщо редагування - заповнити форму
    if (isEdit && wordData) {
        if (hiddenIdField) hiddenIdField.value = wordData.local_id || '';

        const groupNameInput = document.getElementById('banned-word-group-name');
        if (groupNameInput) groupNameInput.value = wordData.group_name_ua || '';
        
        const nameUkInput = document.getElementById('banned-word-name-uk');
        const nameRuInput = document.getElementById('banned-word-name-ru');
        const explaineInput = document.getElementById('banned-word-explaine');
        const hintInput = document.getElementById('banned-word-hint');
        
        // ПРИБРАНО: const checkedInput = document.getElementById('banned-word-checked');

        if (nameUkInput) nameUkInput.value = wordData.name_uk || '';
        if (nameRuInput) nameRuInput.value = wordData.name_ru || '';
        if (typeSelect) typeSelect.value = wordData.banned_type || '';
        if (explaineInput) explaineInput.value = wordData.banned_explaine || '';
        if (hintInput) hintInput.value = wordData.banned_hint || ''; // ВИПРАВЛЕНО: 'banned_hint'
        
        // Встановлюємо початковий рівень небезпеки
        updateSeverityTrigger(wordData.severity || 'high');

    } else {
        // Генерувати новий ID
        const newId = generateNextId('ban-', bannedWordsState.bannedWords.map(w => w.local_id));
        if (hiddenIdField) hiddenIdField.value = newId;
        // Встановлюємо рівень за замовчуванням
        updateSeverityTrigger('high');
    }

    // Логіка бейджа "Перевірено"
    const checkedBadge = document.getElementById('banned-word-checked-badge');
    if (checkedBadge) {
        const isChecked = isEdit && wordData?.cheaked_line === 'TRUE';
        updateCheckedBadge(checkedBadge, isChecked);

        // Обробник кліку для зміни статусу
        checkedBadge.onclick = async () => {
            if (!isEdit || !wordData?.local_id) return;

            const currentStatus = checkedBadge.dataset.status === 'TRUE';
            const newStatus = !currentStatus;

            // Оновлюємо UI одразу
            updateCheckedBadge(checkedBadge, newStatus);

            // Зберігаємо в даних
            await toggleCheckedStatus(wordData.local_id);
        };
    }


    // Обробник кнопки збереження
    const saveButton = document.getElementById('save-banned-word');
    if (saveButton) {
        // Використовуємо .onclick, щоб передати wordData
        saveButton.onclick = async () => {
            await handleSaveBannedWord(isEdit, wordData); // Передаємо оригінальні дані
        };
    }
}


/**
* Обробник збереження форми
 */
async function handleSaveBannedWord(isEdit, originalWordData = null) { // ДОДАНО: originalWordData
    // Отримати дані з форми
    const formData = {
        local_id: document.getElementById('banned-word-local-id').value,
        group_name_ua: document.getElementById('banned-word-group-name').value.trim(),
        name_uk: document.getElementById('banned-word-name-uk').value.trim(),
        name_ru: document.getElementById('banned-word-name-ru').value.trim(),
        banned_type: document.getElementById('banned-word-type').value,
        banned_explaine: document.getElementById('banned-word-explaine').value.trim(),
        banned_hint: document.getElementById('banned-word-hint').value.trim(), // ВИПРАВЛЕНО: 'banned_hint'
        severity: document.getElementById('banned-word-severity').value || 'high', // ДОДАНО
        
        // ЗМІНЕНО: Логіка для cheaked_line
        cheaked_line: isEdit ? (originalWordData?.cheaked_line || 'FALSE') : 'FALSE'
    };

    // NEW: Додаємо розпарсені масиви для оновлення локального state
    formData.name_uk_array = formData.name_uk.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    formData.name_ru_array = formData.name_ru.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

    // Валідація
if (!formData.group_name_ua || !formData.name_uk || !formData.name_ru) {
        showToast('Будь ласка, заповніть обов\'язкові поля: Назва Групи, Українське слово і Російське слово', 'error');
        return;
    }


    try {
        // Імпортувати функцію збереження
        const { saveBannedWord } = await import('./banned-words-data.js');

        // Зберегти в Google Sheets
        await saveBannedWord(formData, isEdit);

        // Оновити локальний стейт
        if (isEdit) {
            const index = bannedWordsState.bannedWords.findIndex(w => w.local_id === formData.local_id);
            if (index !== -1) {
                bannedWordsState.bannedWords[index] = formData;
            }
        } else {
            bannedWordsState.bannedWords.push(formData);
        }

        // Оновити таблицю
        await renderBannedWordsTable();

        // Оновити статистику в aside
        const totalEl = document.getElementById('manage-total-words');
        const checkedEl = document.getElementById('manage-checked-words');
        if (totalEl) totalEl.textContent = bannedWordsState.bannedWords.length;
        if (checkedEl) {
            const checkedCount = bannedWordsState.bannedWords.filter(w => w.cheaked_line === 'TRUE' || w.cheaked_line === true).length;
            checkedEl.textContent = checkedCount;
        }

        // Закрити модал
        closeModal();

        // Показати toast повідомлення
        const { showToast } = await import('../../components/ui-toast.js');
        showToast(isEdit ? 'Заборонене слово оновлено' : 'Заборонене слово додано', 'success');


    } catch (error) {
        console.error('❌ Помилка збереження:', error);
        const { showToast } = await import('../../components/ui-toast.js');
        showToast('Помилка при збереженні: ' + error.message, 'error');
    }
}

/**
 * Ініціалізувати фільтри для табу управління
 */
export function initManageTabFilters() {
    const filterGroup = document.querySelector('[data-filter-group="bwManage"]');
    if (!filterGroup) return;

    if (!bannedWordsState.tabFilters['tab-manage']) {
        bannedWordsState.tabFilters['tab-manage'] = 'all';
    }

    // Charm filter-pills керує .c-main toggle, ми слухаємо charm:filter
    filterGroup.addEventListener('charm:filter', (e) => {
        bannedWordsState.tabFilters['tab-manage'] = e.detail.value;
        renderBannedWordsTableRowsOnly();
    });
}