// js/banned-words/banned-words-manage.js
// Управління словником заборонених слів - таблиця і CRUD операції

import { bannedWordsState } from './banned-words-init.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { initCustomSelects } from '../common/ui-select.js';
import { initDropdowns } from '../common/ui-dropdown.js';
import { escapeHtml } from '../utils/text-utils.js';
import { renderPseudoTable, renderBadge, renderSeverityBadge } from '../common/ui-table.js';

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
            id: 'name_uk',
            label: 'Слова (UA)',
            sortable: true,
            searchable: true,
            className: 'cell-name',
            render: (value) => renderWordChips(value, true)
        },
        {
            id: 'name_ru',
            label: 'Слова (RU)',
            sortable: true,
            searchable: true,
            render: (value) => renderWordChips(value, false)
        },
        {
            id: 'banned_type',
            label: 'Тип',
            sortable: true,
            searchable: true,
            render: (value) => value || '<span style="color: var(--color-on-surface-v);">не вказано</span>'
        },
        {
            id: 'banned_explaine',
            label: 'Пояснення',
            sortable: true,
            searchable: true,
            render: (value) => value || '-'
        },
        {
            id: 'banned_hint',
            label: 'Підказка',
            sortable: true,
            searchable: true,
            render: (value) => value || '-'
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
    console.log('📋 Рендер табу управління...');

    // Рендер таблиці
    await renderBannedWordsTable();

    console.log('✅ Таб управління відрендерений');
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
 * Рендер таблиці заборонених слів (з урахуванням фільтрів і пагінації)
 */
export async function renderBannedWordsTable() {
    const container = document.getElementById('banned-words-table-container');
    if (!container) return;

    // Фільтрація
    let filteredWords = [...bannedWordsState.bannedWords];

    // 1. СПОЧАТКУ застосувати фільтр табу
    const activeFilter = bannedWordsState.tabFilters['tab-manage'] || 'all';
    if (activeFilter === 'checked') {
        filteredWords = filteredWords.filter(word => word.cheaked_line === 'TRUE' || word.cheaked_line === true);
        console.log(`🔍 Фільтр: тільки перевірені. Залишилось: ${filteredWords.length} з ${bannedWordsState.bannedWords.length}`);
    } else if (activeFilter === 'unchecked') {
        filteredWords = filteredWords.filter(word => word.cheaked_line !== 'TRUE' && word.cheaked_line !== true);
        console.log(`🔍 Фільтр: тільки неперевірені. Залишилось: ${filteredWords.length} з ${bannedWordsState.bannedWords.length}`);
    }

    // 2. ПОТІМ пошук
    if (bannedWordsState.searchQuery) {
        const query = bannedWordsState.searchQuery.toLowerCase();
        const columns = bannedWordsState.searchColumns || ['name_uk', 'name_ru'];

        filteredWords = filteredWords.filter(word => {
            return columns.some(column => {
                const value = word[column];
                if (column === 'cheaked_line') {
                    // Для перевіреного статусу шукаємо "так"/"ні" або "true"/"false"
                    const checkValue = (value === 'TRUE' || value === true) ? 'так true' : 'ні false';
                    return checkValue.includes(query);
                }
                return value?.toString().toLowerCase().includes(query);
            });
        });
    }

    // Отримати пагінацію для tab-manage з tabPaginations
    const tabPagination = bannedWordsState.tabPaginations['tab-manage'] || {
        currentPage: 1,
        pageSize: 10,
        totalItems: 0
    };

    // Оновити загальну кількість
    tabPagination.totalItems = filteredWords.length;

    // Пагінація
    const startIndex = (tabPagination.currentPage - 1) * tabPagination.pageSize;
    const endIndex = startIndex + tabPagination.pageSize;
    const paginatedWords = filteredWords.slice(startIndex, endIndex);

    // Оновити лічильники в заголовку (показуємо з відфільтрованих, не загальних)
    updateCounters(paginatedWords.length, filteredWords.length);

    // Визначити які колонки показувати - якщо порожній масив, показуємо всі
const visibleCols = (bannedWordsState.visibleColumns && bannedWordsState.visibleColumns.length > 0)
        ? bannedWordsState.visibleColumns
        : ['local_id', 'severity', 'group_name_ua', 'banned_type', 'cheaked_line'];

    // Рендеринг таблиці через універсальний компонент
    renderPseudoTable(container, {
        data: paginatedWords,
        columns: getColumns(),
        visibleColumns: visibleCols,
        rowActionsCustom: (row) => {
            const selectedSet = bannedWordsState.selectedProducts['tab-manage'] || new Set();
            const isChecked = selectedSet.has(row.local_id);
            return `
                <input type="checkbox" class="row-checkbox" data-product-id="${escapeHtml(row.local_id)}" ${isChecked ? 'checked' : ''}>
                <button class="btn-icon btn-edit" data-row-id="${escapeHtml(row.local_id)}" data-action="edit" title="Редагувати">
                    <span class="material-symbols-outlined">edit</span>
                </button>                
            `;
        },
        rowActionsHeader: '<input type="checkbox" class="select-all-checkbox">',
        emptyState: {
            icon: 'search_off',
            message: 'Заборонені слова не знайдено'
        },
        withContainer: false
    });

    // Оновити лічильники
    if (paginatedWords.length === 0) {
        updateCounters(0, bannedWordsState.bannedWords.length);
    }

    // Оновити footer pagination UI
    const footer = document.querySelector('.fixed-footer');
    if (footer && footer._paginationAPI) {
        footer._paginationAPI.update({
            currentPage: tabPagination.currentPage,
            totalItems: filteredWords.length
        });
    }

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

    // Додати обробник для кнопок редагування
    container.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', () => {
            const wordId = button.dataset.rowId;
            const word = bannedWordsState.bannedWords.find(w => w.local_id === wordId);
            if (word) {
                openBannedWordModal(word);
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

    // Pagination вже ініціалізована в banned-words-init.js через initPagination()
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

    console.log(`🔄 Перемикання статусу "${wordId}": ${newStatus}`);

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

        console.log('✅ Статус оновлено');
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

    console.log(isEdit ? '✏️ Відкриття модалу редагування' : '➕ Відкриття модалу створення');

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

    // ДОДАНО: Логіка кнопки "Позначити перевіреним"
    const markCheckedBtn = document.getElementById('banned-word-mark-checked');
    if (markCheckedBtn) {
        if (isEdit && wordData.cheaked_line !== 'TRUE') {
            markCheckedBtn.classList.remove('u-hidden'); // Показуємо кнопку
            
            // Використовуємо .onclick для простоти (уникаємо накопичення слухачів)
            markCheckedBtn.onclick = async () => {
                await toggleCheckedStatus(wordData.local_id); // Використовуємо існуючу функцію
                closeModal(); // Закриваємо модал
            };
        } else {
            markCheckedBtn.classList.add('u-hidden'); // Ховаємо кнопку
        }
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

    console.log('💾 Збереження заборонного слова:', formData);

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

        console.log('✅ Заборонене слово збережено');

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

            console.log(`🔎 Фільтр застосовано: "${filter}" для табу управління`);
        });
    });

    console.log('✅ Фільтри ініціалізовано для табу управління');
}