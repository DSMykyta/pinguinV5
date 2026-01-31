// js/banned-words/banned-words-manage.js
// Управління словником заборонених слів - таблиця і CRUD операції

import { bannedWordsState } from './banned-words-init.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { initCustomSelects } from '../common/ui-select.js';
import { initDropdowns } from '../common/ui-dropdown.js';
import { escapeHtml } from '../utils/text-utils.js';
import { createPseudoTable, renderBadge, renderSeverityBadge } from '../common/ui-table.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../common/ui-actions.js';

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

// Table API instance
let manageTableAPI = null;

/**
 * Допоміжна функція для рендерингу чіпів
 */
const renderWordChips = (value, isPrimary = false) => {
    if (!value) return '-';
    const words = value.split(',').map(s => s.trim()).filter(Boolean);
    if (words.length === 0) return '-';
    const primaryClass = isPrimary ? ' primary' : '';
    const chipsHtml = words.map(word => `<span class="word-chip${primaryClass}">${escapeHtml(word)}</span>`).join('');
    return `<div class="cell-words-list">${chipsHtml}</div>`;
};

/**
 * Отримати конфігурацію колонок для таблиці заборонених слів
 */
export function getColumns() {
    return [
        {
            id: 'local_id',
            label: 'ID',
            sortable: true,
            searchable: true,
            className: 'cell-id',
            render: (value) => `<span class="word-chip">${value || 'Невідомо'}</span>`
        },
        {
            id: 'severity',
            label: ' ',
            sortable: true,
            searchable: true,
            className: 'cell-severity',
            render: (value) => renderSeverityBadge(value)
        },
        {
            id: 'group_name_ua',
            label: 'Назва Групи',
            sortable: true,
            searchable: true,
            className: 'cell-main-name',
            render: (value) => `<strong>${escapeHtml(value || 'N/A')}</strong>`
        },
        {
            id: 'banned_type',
            label: 'Тип',
            sortable: true,
            searchable: true,
            render: (value) => value || '<span style="color: var(--color-on-surface-v);">не вказано</span>'
        },
        {
            id: 'cheaked_line',
            label: 'Перевірено',
            sortable: true,
            className: 'cell-bool',
            render: (value, row) => renderBadge(value, 'checked', {
                clickable: true,
                id: row.local_id
            })
        }
    ];
}

/**
 * Рендер табу управління забороненими словами
 */
export async function renderBannedWordsManageTab() {

    // Рендер таблиці
    await renderBannedWordsTable();

}

/**
 * Оновити лічильники на сторінці
 */
function updateCounters(pageCount, totalCount) {
    // Оновити статистику в tab header
    const tabStats = document.getElementById('tab-stats-manage');
    if (tabStats) {
        tabStats.textContent = `Показано ${pageCount} з ${totalCount}`;
    }
}

/**
 * Ініціалізувати таблицю управління (викликається один раз)
 */
function initManageTableAPI() {
    const container = document.getElementById('banned-words-table-container');
    if (!container || manageTableAPI) return;

    const visibleCols = (bannedWordsState.visibleColumns && bannedWordsState.visibleColumns.length > 0)
        ? bannedWordsState.visibleColumns
        : ['local_id', 'severity', 'group_name_ua', 'banned_type', 'cheaked_line'];

    manageTableAPI = createPseudoTable(container, {
        columns: getColumns(),
        visibleColumns: visibleCols,
        rowActionsCustom: (row) => {
            const selectedSet = bannedWordsState.selectedProducts['tab-manage'] || new Set();
            const isChecked = selectedSet.has(row.local_id);
            return `
                <input type="checkbox" class="row-checkbox" data-product-id="${escapeHtml(row.local_id)}" ${isChecked ? 'checked' : ''}>
                ${actionButton({ action: 'edit', rowId: row.local_id, context: 'banned-words-manage' })}
            `;
        },
        rowActionsHeader: '<input type="checkbox" class="select-all-checkbox">',
        getRowId: (row) => row.local_id,
        emptyState: {
            icon: 'search_off',
            message: 'Заборонені слова не знайдено'
        },
        withContainer: false,
        onAfterRender: attachManageRowEventHandlers
    });

    bannedWordsState.manageTableAPI = manageTableAPI;
}

/**
 * Додати обробники подій для рядків таблиці управління
 */
async function attachManageRowEventHandlers(container) {
    // Ініціалізувати ui-actions
    initActionHandlers(container, 'banned-words-manage');

    // Додати обробник кліків на clickable badges
    container.querySelectorAll('.badge.clickable').forEach(badge => {
        badge.addEventListener('click', async (e) => {
            e.stopPropagation();
            const wordId = badge.dataset.badgeId;
            if (wordId) {
                await toggleCheckedStatus(wordId);
            }
        });
    });

    // Ініціалізувати batch actions для tab-manage
    const { initBatchActionsBar, toggleProductSelection, selectAll, deselectAll, isAllSelected } = await import('./banned-words-batch.js');
    initBatchActionsBar('tab-manage');

    // Обробник для чекбоксу "вибрати всі"
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

    // Обробник для чекбоксів рядків
    container.querySelectorAll('.row-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const wordId = checkbox.dataset.productId;
            toggleProductSelection('tab-manage', wordId);

            // Оновити стан "select all" checkbox
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = isAllSelected('tab-manage');
            }
        });
    });
}

/**
 * Отримати відфільтровані та пагіновані дані
 */
function getManageFilteredPaginatedData() {
    let filteredWords = [...bannedWordsState.bannedWords];

    // 1. СПОЧАТКУ застосувати фільтр табу
    const activeFilter = bannedWordsState.tabFilters['tab-manage'] || 'all';
    if (activeFilter === 'checked') {
        filteredWords = filteredWords.filter(word => word.cheaked_line === 'TRUE' || word.cheaked_line === true);
    } else if (activeFilter === 'unchecked') {
        filteredWords = filteredWords.filter(word => word.cheaked_line !== 'TRUE' && word.cheaked_line !== true);
    }

    // 2. ПОТІМ пошук
    if (bannedWordsState.searchQuery) {
        const query = bannedWordsState.searchQuery.toLowerCase();
        const columns = bannedWordsState.searchColumns || ['name_uk', 'name_ru'];

        filteredWords = filteredWords.filter(word => {
            return columns.some(column => {
                const value = word[column];
                if (column === 'cheaked_line') {
                    const checkValue = (value === 'TRUE' || value === true) ? 'так true' : 'ні false';
                    return checkValue.includes(query);
                }
                return value?.toString().toLowerCase().includes(query);
            });
        });
    }

    // Отримати пагінацію для tab-manage
    const tabPagination = bannedWordsState.tabPaginations['tab-manage'] || {
        currentPage: 1,
        pageSize: 10,
        totalItems: 0
    };

    tabPagination.totalItems = filteredWords.length;

    const startIndex = (tabPagination.currentPage - 1) * tabPagination.pageSize;
    const endIndex = Math.min(startIndex + tabPagination.pageSize, filteredWords.length);

    return {
        all: bannedWordsState.bannedWords,
        filtered: filteredWords,
        paginated: filteredWords.slice(startIndex, endIndex)
    };
}

/**
 * Оновити тільки рядки таблиці (заголовок залишається)
 */
export async function renderBannedWordsTableRowsOnly() {
    if (!manageTableAPI) {
        await renderBannedWordsTable();
        return;
    }

    const { all, filtered, paginated } = getManageFilteredPaginatedData();

    // Оновити footer pagination UI
    const footer = document.querySelector('.fixed-footer');
    if (footer && footer._paginationAPI) {
        footer._paginationAPI.update({
            currentPage: bannedWordsState.tabPaginations['tab-manage']?.currentPage || 1,
            totalItems: filtered.length
        });
    }

    // Оновлюємо тільки рядки
    manageTableAPI.updateRows(paginated);

    updateCounters(paginated.length, filtered.length);
}

/**
 * Рендер таблиці заборонених слів (повний рендер)
 */
export async function renderBannedWordsTable() {
    const container = document.getElementById('banned-words-table-container');
    if (!container) return;

    // Ініціалізуємо API якщо потрібно
    if (!manageTableAPI) {
        initManageTableAPI();
    }

    const { all, filtered, paginated } = getManageFilteredPaginatedData();

    // Оновити лічильники
    updateCounters(paginated.length, filtered.length);

    // Оновити footer pagination UI
    const footer = document.querySelector('.fixed-footer');
    if (footer && footer._paginationAPI) {
        footer._paginationAPI.update({
            currentPage: bannedWordsState.tabPaginations['tab-manage']?.currentPage || 1,
            totalItems: filtered.length
        });
    }

    // Повний рендер таблиці
    manageTableAPI.render(paginated);

    // Якщо немає даних
    if (paginated.length === 0) {
        updateCounters(0, all.length);
    }
}

/**
 * Скинути manageTableAPI (для реініціалізації)
 */
export function resetManageTableAPI() {
    manageTableAPI = null;
    bannedWordsState.manageTableAPI = null;
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
    const severityOptions = document.querySelectorAll('.dropdown-menu [data-severity-value]');

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
        const label = badge.querySelector('.badge-label');

        badge.dataset.status = isChecked ? 'TRUE' : 'FALSE';
        badge.classList.remove('badge-neutral', 'badge-success');
        badge.classList.add(isChecked ? 'badge-success' : 'badge-neutral');

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
            if (wrapper) wrapper.classList.remove('is-open');
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
        const newId = generateBannedWordId();
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
 * Генерувати новий ID для заборонених слів
 */
function generateBannedWordId() {
    // Знайти максимальний номер
    let maxNum = 0;

    bannedWordsState.bannedWords.forEach(word => {
        if (word.local_id && word.local_id.startsWith('ban-')) {
            const num = parseInt(word.local_id.replace('ban-', ''), 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });

    // Новий номер
    const newNum = maxNum + 1;

    // Форматувати як ban-XXXXXX
    return `ban-${String(newNum).padStart(6, '0')}`;
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
        alert('Будь ласка, заповніть обов\'язкові поля: Назва Групи, Українське слово і Російське слово');
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
        const { showToast } = await import('../common/ui-toast.js');
        showToast(isEdit ? 'Заборонене слово оновлено' : 'Заборонене слово додано', 'success');


    } catch (error) {
        console.error('❌ Помилка збереження:', error);
        const { showToast } = await import('../common/ui-toast.js');
        showToast('Помилка при збереженні: ' + error.message, 'error');
    }
}

/**
 * Ініціалізувати фільтри для табу управління
 */
export function initManageTabFilters() {
    const filterButtons = document.querySelectorAll('.nav-icon[data-filter][data-tab-id="tab-manage"]');

    if (!filterButtons.length) {
        console.warn('⚠️ Фільтри не знайдено для табу управління');
        return;
    }

    // Встановити початковий фільтр
    if (!bannedWordsState.tabFilters['tab-manage']) {
        bannedWordsState.tabFilters['tab-manage'] = 'all';
    }

    filterButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const filter = button.dataset.filter;

            // Оновити стан фільтру
            bannedWordsState.tabFilters['tab-manage'] = filter;

            // Оновити UI активних кнопок
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Перерендерити таблицю з новим фільтром
            await renderBannedWordsTable();

        });
    });

}