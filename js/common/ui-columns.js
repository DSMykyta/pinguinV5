// js/common/ui-columns.js
// Управління видимістю колонок (спільний модуль для всього проєкту)

/**
 * Ініціалізує систему управління колонками
 * @param {HTMLElement} container - Контейнер з чекбоксами колонок
 * @param {HTMLElement} tableContainer - Контейнер таблиці
 * @param {Object} options - Опції
 * @param {string} options.storageKey - Ключ для localStorage
 * @param {Function} options.onColumnToggle - Callback при зміні видимості (columnName, isVisible)
 */
export function initColumnVisibility(container, tableContainer, options = {}) {
    if (!container || !tableContainer) return;

    const storageKey = options.storageKey || 'columnVisibility';
    const onColumnToggle = options.onColumnToggle || (() => {});

    // Завантажити збережений стан з localStorage
    const savedState = loadColumnState(storageKey);

    // Застосувати збережений стан до чекбоксів
    container.querySelectorAll('input[type="checkbox"][data-column]').forEach(checkbox => {
        const columnName = checkbox.dataset.column;
        if (savedState.hasOwnProperty(columnName)) {
            checkbox.checked = savedState[columnName];
        }
        // Застосувати початковий стан до таблиці
        toggleColumn(tableContainer, columnName, checkbox.checked);
    });

    // Слухати зміни чекбоксів
    container.addEventListener('change', (e) => {
        const checkbox = e.target.closest('input[type="checkbox"][data-column]');
        if (!checkbox) return;

        const columnName = checkbox.dataset.column;
        const isVisible = checkbox.checked;

        toggleColumn(tableContainer, columnName, isVisible);
        saveColumnState(storageKey, columnName, isVisible);
        onColumnToggle(columnName, isVisible);
    });
}

/**
 * Додає нові чекбокси колонок динамічно (наприклад, при додаванні маркетплейсу)
 * @param {HTMLElement} container - Контейнер з чекбоксами
 * @param {Array<{name: string, label: string, checked: boolean}>} columns - Масив колонок
 * @param {string} groupLabel - Назва групи (опціонально)
 */
export function addColumnCheckboxes(container, columns, groupLabel = null) {
    if (!container) return;

    if (groupLabel) {
        const separator = document.createElement('div');
        separator.className = 'columns-group-separator';
        separator.textContent = groupLabel;
        container.appendChild(separator);
    }

    columns.forEach(column => {
        const label = document.createElement('label');
        label.className = 'column-toggle-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = column.checked !== false;
        checkbox.dataset.column = column.name;

        const labelText = document.createTextNode(` ${column.label}`);

        label.appendChild(checkbox);
        label.appendChild(labelText);
        container.appendChild(label);
    });
}

/**
 * Видаляє чекбокси колонок групи
 * @param {HTMLElement} container - Контейнер
 * @param {string} groupLabel - Назва групи
 */
export function removeColumnGroup(container, groupLabel) {
    if (!container) return;

    const separators = Array.from(container.querySelectorAll('.columns-group-separator'));
    const separator = separators.find(s => s.textContent === groupLabel);
    if (!separator) return;

    // Видалити всі елементи до наступного separator або до кінця
    let nextEl = separator.nextElementSibling;
    const toRemove = [separator];
    while (nextEl && !nextEl.classList.contains('columns-group-separator')) {
        toRemove.push(nextEl);
        nextEl = nextEl.nextElementSibling;
    }
    toRemove.forEach(el => el.remove());
}

/**
 * Перемикає видимість колонки в таблиці
 */
function toggleColumn(tableContainer, columnName, isVisible) {
    const cells = tableContainer.querySelectorAll(`[data-column="${columnName}"]`);
    cells.forEach(cell => {
        cell.classList.toggle('u-hidden', !(isVisible));
    });
}

/**
 * Зберігає стан колонки в localStorage
 */
function saveColumnState(storageKey, columnName, isVisible) {
    const state = loadColumnState(storageKey);
    state[columnName] = isVisible;
    try {
        localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
        console.warn('Failed to save column state to localStorage:', e);
    }
}

/**
 * Завантажує збережений стан колонок з localStorage
 */
function loadColumnState(storageKey) {
    try {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.warn('Failed to load column state from localStorage:', e);
        return {};
    }
}

/**
 * Отримує поточний стан видимості всіх колонок
 */
export function getColumnVisibility(storageKey) {
    return loadColumnState(storageKey);
}

/**
 * Скидає стан колонок до значень за замовчуванням
 */
export function resetColumnVisibility(storageKey) {
    try {
        localStorage.removeItem(storageKey);
    } catch (e) {
        console.warn('Failed to reset column visibility:', e);
    }
}
