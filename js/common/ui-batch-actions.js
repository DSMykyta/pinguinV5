// js/common/ui-batch-actions.js
// Uniwersальний компонент для масових операцій з вибраними елементами

/**
 * Глобальне сховище batch bars
 * Структура: { tabId: { bar: HTMLElement, config: Object, selectedItems: Set } }
 */
const batchBars = {};

/**
 * Створити панель масових дій
 * @param {Object} config - Конфігурація панелі
 * @param {string} config.tabId - ID табу/сторінки
 * @param {Array} config.actions - Масив кнопок-дій
 * @param {Function} [config.onSelectionChange] - Callback при зміні вибору
 * @returns {Object} API для керування панеллю
 *
 * @example
 * const batchBar = createBatchActionsBar({
 *     tabId: 'my-tab',
 *     actions: [
 *         {
 *             label: 'Видалити',
 *             icon: 'delete',
 *             primary: true,
 *             handler: async (selectedIds, tabId) => { ... }
 *         }
 *     ],
 *     onSelectionChange: (count) => { console.log(`Selected: ${count}`); }
 * });
 */
export function createBatchActionsBar(config) {
    const { tabId, actions = [], onSelectionChange } = config;

    // Перевірити чи панель вже існує
    if (batchBars[tabId]) {
        console.warn(`⚠️ Batch bar для ${tabId} вже існує`);
        return getBatchBarAPI(tabId);
    }

    // Створити DOM елемент панелі
    const bar = document.createElement('div');
    bar.className = 'batch-actions-bar';
    bar.dataset.tabId = tabId;

    // Створити HTML кнопок
    const actionsHTML = actions.map(action => {
        const primaryClass = action.primary ? ' primary' : '';
        return `
            <button class="batch-btn${primaryClass}" data-action="${action.id || action.label}">
                <span class="material-symbols-outlined">${action.icon}</span>
                ${action.label}
            </button>
        `;
    }).join('');

    // Скасувати вибір завжди останньою кнопкою
    const deselectAllHTML = `
        <button class="batch-btn" data-action="deselect-all">
            <span class="material-symbols-outlined">close</span>
            Скасувати вибір
        </button>
    `;

    bar.innerHTML = `
        <div class="selection-info">
            <span class="selection-count" data-selection-count>0</span>
            <span class="selection-label">обрано</span>
        </div>
        <div class="batch-actions">
            ${actionsHTML}
            ${deselectAllHTML}
        </div>
    `;

    // Додати обробники подій
    actions.forEach(action => {
        const button = bar.querySelector(`[data-action="${action.id || action.label}"]`);
        if (button && action.handler) {
            button.addEventListener('click', async () => {
                const selectedIds = Array.from(batchBars[tabId].selectedItems);
                await action.handler(selectedIds, tabId);
            });
        }
    });

    // Обробник для "Скасувати вибір"
    const deselectBtn = bar.querySelector('[data-action="deselect-all"]');
    if (deselectBtn) {
        deselectBtn.addEventListener('click', () => {
            deselectAll(tabId);
        });
    }

    // Додати панель до body
    document.body.appendChild(bar);

    // Зберегти в глобальному сховищі
    batchBars[tabId] = {
        bar,
        config,
        selectedItems: new Set(),
        onSelectionChange
    };


    // Повернути API
    return getBatchBarAPI(tabId);
}

/**
 * Отримати API для керування панеллю
 * @param {string} tabId - ID табу
 * @returns {Object} API
 */
function getBatchBarAPI(tabId) {
    const data = batchBars[tabId];
    if (!data) {
        // Не логуємо помилку - це очікувана поведінка при першій ініціалізації
        return null;
    }

    return {
        /**
         * Вибрати елемент
         * @param {string} itemId - ID елемента
         */
        selectItem: (itemId) => selectItem(tabId, itemId),

        /**
         * Зняти вибір елемента
         * @param {string} itemId - ID елемента
         */
        deselectItem: (itemId) => deselectItem(tabId, itemId),

        /**
         * Перемкнути вибір елемента
         * @param {string} itemId - ID елемента
         */
        toggleItem: (itemId) => toggleItem(tabId, itemId),

        /**
         * Вибрати всі елементи
         * @param {Array<string>} itemIds - Масив ID елементів
         */
        selectAll: (itemIds) => selectAll(tabId, itemIds),

        /**
         * Зняти вибір всіх елементів
         */
        deselectAll: () => deselectAll(tabId),

        /**
         * Отримати вибрані елементи
         * @returns {Array<string>} Масив ID вибраних елементів
         */
        getSelected: () => Array.from(data.selectedItems),

        /**
         * Отримати кількість вибраних
         * @returns {number}
         */
        getCount: () => data.selectedItems.size,

        /**
         * Перевірити чи елемент вибраний
         * @param {string} itemId - ID елемента
         * @returns {boolean}
         */
        isSelected: (itemId) => data.selectedItems.has(itemId),

        /**
         * Оновити видимість панелі
         */
        update: () => updateVisibility(tabId),

        /**
         * Показати панель
         */
        show: () => showBatchBar(tabId),

        /**
         * Приховати панель
         */
        hide: () => hideBatchBar(tabId),

        /**
         * Видалити панель
         */
        destroy: () => destroyBatchBar(tabId)
    };
}

/**
 * Вибрати елемент
 * @param {string} tabId - ID табу
 * @param {string} itemId - ID елемента
 */
function selectItem(tabId, itemId) {
    const data = batchBars[tabId];
    if (!data) return;

    data.selectedItems.add(itemId);
    updateVisibility(tabId);

    if (data.onSelectionChange) {
        data.onSelectionChange(data.selectedItems.size);
    }
}

/**
 * Зняти вибір елемента
 * @param {string} tabId - ID табу
 * @param {string} itemId - ID елемента
 */
function deselectItem(tabId, itemId) {
    const data = batchBars[tabId];
    if (!data) return;

    data.selectedItems.delete(itemId);
    updateVisibility(tabId);

    if (data.onSelectionChange) {
        data.onSelectionChange(data.selectedItems.size);
    }
}

/**
 * Перемкнути вибір елемента
 * @param {string} tabId - ID табу
 * @param {string} itemId - ID елемента
 */
function toggleItem(tabId, itemId) {
    const data = batchBars[tabId];
    if (!data) return;

    if (data.selectedItems.has(itemId)) {
        deselectItem(tabId, itemId);
    } else {
        selectItem(tabId, itemId);
    }
}

/**
 * Вибрати всі елементи
 * @param {string} tabId - ID табу
 * @param {Array<string>} itemIds - Масив ID елементів
 */
function selectAll(tabId, itemIds) {
    const data = batchBars[tabId];
    if (!data) return;

    itemIds.forEach(id => data.selectedItems.add(id));
    updateVisibility(tabId);

    if (data.onSelectionChange) {
        data.onSelectionChange(data.selectedItems.size);
    }
}

/**
 * Зняти вибір всіх елементів
 * @param {string} tabId - ID табу
 */
function deselectAll(tabId) {
    const data = batchBars[tabId];
    if (!data) return;

    data.selectedItems.clear();

    // Визначити tab name для чекбоксів (mapper-categories -> categories)
    const checkboxTabId = tabId.replace('mapper-', '');

    // Зняти checked з усіх чекбоксів цього табу
    document.querySelectorAll(`[data-tab="${checkboxTabId}"].row-checkbox`).forEach(cb => {
        cb.checked = false;
    });

    // Зняти checked з "select all" чекбокса
    const selectAllCheckbox = document.querySelector(`[data-tab="${checkboxTabId}"].select-all-checkbox`);
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }

    updateVisibility(tabId);

    if (data.onSelectionChange) {
        data.onSelectionChange(0);
    }
}

/**
 * Оновити видимість панелі
 * @param {string} tabId - ID табу
 */
function updateVisibility(tabId) {
    const data = batchBars[tabId];
    if (!data) return;

    const count = data.selectedItems.size;

    // Оновити лічильник
    const countEl = data.bar.querySelector('[data-selection-count]');
    if (countEl) {
        countEl.textContent = count;
    }

    // Показати/приховати панель
    if (count > 0) {
        showBatchBar(tabId);
    } else {
        hideBatchBar(tabId);
    }
}

/**
 * Показати панель
 * @param {string} tabId - ID табу
 */
function showBatchBar(tabId) {
    // Приховати всі інші панелі
    Object.keys(batchBars).forEach(id => {
        if (id !== tabId) {
            hideBatchBar(id);
        }
    });

    const data = batchBars[tabId];
    if (data && data.bar) {
        data.bar.classList.add('visible');
    }
}

/**
 * Приховати панель
 * @param {string} tabId - ID табу
 */
function hideBatchBar(tabId) {
    const data = batchBars[tabId];
    if (data && data.bar) {
        data.bar.classList.remove('visible');
    }
}

/**
 * Видалити панель
 * @param {string} tabId - ID табу
 */
function destroyBatchBar(tabId) {
    const data = batchBars[tabId];
    if (!data) return;

    // Видалити DOM елемент
    if (data.bar && data.bar.parentNode) {
        data.bar.parentNode.removeChild(data.bar);
    }

    // Видалити з сховища
    delete batchBars[tabId];

}

/**
 * Отримати всі панелі
 * @returns {Object} Об'єкт з усіма панелями
 */
export function getAllBatchBars() {
    return batchBars;
}

/**
 * Отримати панель по tabId
 * @param {string} tabId - ID табу
 * @returns {Object|null} API панелі або null
 */
export function getBatchBar(tabId) {
    return getBatchBarAPI(tabId);
}
