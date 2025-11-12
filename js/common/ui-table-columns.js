// js/common/ui-table-columns.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TABLE COLUMN SELECTOR                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Універсальний компонент для створення dropdown-меню з чекбоксами
 * для вибору видимих колонок таблиці.
 */

/**
 * Створити селектор колонок таблиці з чекбоксами
 *
 * @param {string} containerId - ID контейнера для чекбоксів
 * @param {Array<{id: string, label: string, checked: boolean}>} columns - Масив колонок
 * @param {Object} options - Опції
 * @param {string} options.checkboxPrefix - Префікс для ID чекбоксів (за замовчуванням 'col')
 * @param {Function} options.onChange - Callback при зміні вибору: (selectedIds) => void
 * @param {Array<string>} options.filterBy - Фільтрувати колонки за цим списком ID (опціонально)
 *
 * @returns {{
 *   getSelected: () => string[],
 *   setSelected: (ids: string[]) => void,
 *   refresh: (newColumns: Array) => void,
 *   destroy: () => void
 * }} API для управління селектором
 *
 * @example
 * const columnSelector = createColumnSelector('my-columns-list', [
 *   { id: 'id', label: 'ID', checked: true },
 *   { id: 'name', label: 'Name', checked: true },
 *   { id: 'status', label: 'Status', checked: false }
 * ], {
 *   checkboxPrefix: 'table-col',
 *   onChange: (selectedIds) => {
 *     console.log('Selected columns:', selectedIds);
 *     // Refresh table with new columns
 *   }
 * });
 */
export function createColumnSelector(containerId, columns, options = {}) {
    const {
        checkboxPrefix = 'col',
        onChange = null,
        filterBy = null
    } = options;

    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`⚠️ Column selector container "${containerId}" не знайдено`);
        return null;
    }

    // Фільтруємо колонки якщо задано filterBy
    const filteredColumns = filterBy
        ? columns.filter(col => filterBy.includes(col.id))
        : columns;

    // Зберігаємо вибрані колонки
    let selectedColumns = filteredColumns
        .filter(col => col.checked)
        .map(col => col.id);

    // Створюємо чекбокси
    function render() {
        container.innerHTML = '';

        filteredColumns.forEach(column => {
            const label = document.createElement('label');
            label.className = 'dropdown-item';
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '8px';
            label.style.padding = '8px 16px';
            label.style.cursor = 'pointer';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `${checkboxPrefix}-${column.id}`;
            checkbox.value = column.id;
            checkbox.checked = selectedColumns.includes(column.id);

            const text = document.createElement('span');
            text.textContent = column.label;

            // Обробник зміни чекбоксу
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (!selectedColumns.includes(column.id)) {
                        selectedColumns.push(column.id);
                    }
                } else {
                    selectedColumns = selectedColumns.filter(col => col !== column.id);
                }

                // Викликати callback
                if (onChange) {
                    onChange(selectedColumns);
                }
            });

            label.appendChild(checkbox);
            label.appendChild(text);
            container.appendChild(label);
        });
    }

    // Початковий рендер
    render();

    // API для управління селектором
    return {
        /**
         * Отримати список вибраних колонок
         * @returns {string[]} Масив ID вибраних колонок
         */
        getSelected() {
            return [...selectedColumns];
        },

        /**
         * Встановити вибрані колонки програмно
         * @param {string[]} ids - Масив ID колонок для вибору
         */
        setSelected(ids) {
            selectedColumns = ids;
            render();
            if (onChange) {
                onChange(selectedColumns);
            }
        },

        /**
         * Оновити список колонок
         * @param {Array<{id: string, label: string, checked: boolean}>} newColumns - Нові колонки
         */
        refresh(newColumns) {
            filteredColumns.length = 0;
            filteredColumns.push(...(filterBy
                ? newColumns.filter(col => filterBy.includes(col.id))
                : newColumns));
            render();
        },

        /**
         * Знищити селектор і очистити контейнер
         */
        destroy() {
            container.innerHTML = '';
            selectedColumns = [];
        }
    };
}
