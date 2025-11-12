// js/common/ui-table-search.js
// Універсальна система пошуку в таблицях

/**
 * Ініціалізувати пошук для таблиці з вибором колонок
 * @param {HTMLInputElement} searchInput - Інпут для пошуку
 * @param {Object} options - Опції пошуку
 * @param {HTMLElement} [options.clearButton] - Кнопка очищення
 * @param {HTMLElement} [options.columnsDropdown] - Контейнер для чекбоксів колонок
 * @param {Array} [options.availableColumns] - Доступні колонки [{id, label, checked}]
 * @param {Function} options.onSearch - Callback при пошуку (query, selectedColumns)
 * @param {string} [options.storageKey] - Ключ для збереження в localStorage
 * @returns {Object} API для керування пошуком
 * @example
 * const searchAPI = initTableSearch(input, {
 *   clearButton: clearBtn,
 *   columnsDropdown: dropdown,
 *   availableColumns: [
 *     {id: 'name', label: 'Назва', checked: true},
 *     {id: 'description', label: 'Опис', checked: false}
 *   ],
 *   onSearch: (query, columns) => {
 *     // Фільтрувати дані
 *   },
 *   storageKey: 'myTable-search-columns'
 * });
 */
export function initTableSearch(searchInput, options) {
    const {
        clearButton = null,
        columnsDropdown = null,
        availableColumns = [],
        onSearch,
        storageKey = null
    } = options;

    let selectedColumns = [];

    // Завантажити збережені колонки з localStorage
    if (storageKey && columnsDropdown) {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                selectedColumns = JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to parse saved search columns:', e);
            }
        }
    }

    // Якщо немає збережених - використати checked з availableColumns
    if (selectedColumns.length === 0) {
        selectedColumns = availableColumns
            .filter(col => col.checked !== false)
            .map(col => col.id);
    }

    // Заповнити dropdown чекбоксами
    if (columnsDropdown && availableColumns.length > 0) {
        populateColumnsDropdown(columnsDropdown, availableColumns, selectedColumns, {
            onChange: (newSelectedColumns) => {
                selectedColumns = newSelectedColumns;

                // Зберегти в localStorage
                if (storageKey) {
                    localStorage.setItem(storageKey, JSON.stringify(selectedColumns));
                }

                // Викликати callback якщо є пошуковий запит
                if (searchInput.value.trim() && onSearch) {
                    onSearch(searchInput.value, selectedColumns);
                }
            }
        });
    }

    // Обробник введення в пошук
    const handleInput = () => {
        const query = searchInput.value;

        // Показати/сховати кнопку очищення
        if (clearButton) {
            clearButton.style.display = query ? 'flex' : 'none';
        }

        // Викликати callback
        if (onSearch) {
            onSearch(query, selectedColumns);
        }
    };

    searchInput.addEventListener('input', handleInput);

    // Обробник кнопки очищення
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            clearButton.style.display = 'none';

            if (onSearch) {
                onSearch('', selectedColumns);
            }
        });
    }

    // API для керування
    return {
        /**
         * Отримати поточний запит
         * @returns {string}
         */
        getQuery: () => searchInput.value,

        /**
         * Встановити запит
         * @param {string} query
         */
        setQuery: (query) => {
            searchInput.value = query;
            handleInput();
        },

        /**
         * Очистити пошук
         */
        clear: () => {
            searchInput.value = '';
            if (clearButton) {
                clearButton.style.display = 'none';
            }
            if (onSearch) {
                onSearch('', selectedColumns);
            }
        },

        /**
         * Отримати вибрані колонки
         * @returns {string[]}
         */
        getSelectedColumns: () => [...selectedColumns],

        /**
         * Встановити вибрані колонки
         * @param {string[]} columns
         */
        setSelectedColumns: (columns) => {
            selectedColumns = columns;

            if (storageKey) {
                localStorage.setItem(storageKey, JSON.stringify(selectedColumns));
            }

            // Оновити UI чекбоксів
            if (columnsDropdown) {
                updateCheckboxes(columnsDropdown, selectedColumns);
            }

            // Перевиконати пошук якщо є запит
            if (searchInput.value.trim() && onSearch) {
                onSearch(searchInput.value, selectedColumns);
            }
        },

        /**
         * Відписатися від подій
         */
        destroy: () => {
            searchInput.removeEventListener('input', handleInput);
        }
    };
}

/**
 * Заповнити dropdown чекбоксами колонок
 * @private
 */
function populateColumnsDropdown(container, availableColumns, selectedColumns, options) {
    const { onChange } = options;

    container.innerHTML = availableColumns.map(col => {
        const checked = selectedColumns.includes(col.id) ? 'checked' : '';

        return `
            <label class="checkbox-label">
                <input type="checkbox"
                       value="${col.id}"
                       ${checked}
                       data-column-checkbox>
                <span>${col.label}</span>
            </label>
        `;
    }).join('');

    // Додати обробники
    container.querySelectorAll('[data-column-checkbox]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const newSelectedColumns = Array.from(
                container.querySelectorAll('[data-column-checkbox]:checked')
            ).map(cb => cb.value);

            if (onChange) {
                onChange(newSelectedColumns);
            }
        });
    });
}

/**
 * Оновити стан чекбоксів
 * @private
 */
function updateCheckboxes(container, selectedColumns) {
    container.querySelectorAll('[data-column-checkbox]').forEach(checkbox => {
        checkbox.checked = selectedColumns.includes(checkbox.value);
    });
}

/**
 * Фільтрувати масив даних за запитом та колонками
 * @param {Array} data - Масив даних
 * @param {string} query - Пошуковий запит
 * @param {string[]} searchColumns - Колонки для пошуку
 * @returns {Array} Відфільтрований масив
 * @example
 * const filtered = filterDataBySearch(data, 'test', ['name', 'description']);
 */
export function filterDataBySearch(data, query, searchColumns) {
    if (!query || !query.trim()) return data;

    const lowerQuery = query.toLowerCase().trim();

    return data.filter(item => {
        // Шукати в усіх вказаних колонках
        return searchColumns.some(columnId => {
            const value = item[columnId];
            if (!value) return false;

            return value.toString().toLowerCase().includes(lowerQuery);
        });
    });
}
