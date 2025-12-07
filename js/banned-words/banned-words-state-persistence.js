// js/banned-words/banned-words-state-persistence.js
// Збереження та відновлення стану перевірочних табів при перезавантаженні сторінки

const STORAGE_KEY = 'bannedWords_tabsState';

/**
 * Структура збереженого стану:
 * {
 *   openTabs: [
 *     {
 *       tabId: 'check-sheet1-word1-column1',
 *       sheetName: 'sheet1',
 *       wordId: 'word1',
 *       columnName: 'column1',
 *       isActive: true,
 *       filter: 'all',
 *       currentPage: 1,
 *       pageSize: 10
 *     }
 *   ],
 *   activeTabId: 'check-sheet1-word1-column1',
 *   timestamp: 1234567890
 * }
 */

/**
 * Зберегти стан табів в localStorage
 * @param {Object} tabsState - Стан табів для збереження
 */
export function saveTabsState(tabsState) {
    try {
        const stateToSave = {
            ...tabsState,
            timestamp: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        console.log('💾 Стан табів збережено:', stateToSave);
    } catch (error) {
        console.error('❌ Помилка збереження стану табів:', error);
    }
}

/**
 * Завантажити стан табів з localStorage
 * @param {number} maxAge - Максимальний вік стану в мілісекундах (за замовчуванням 24 години)
 * @returns {Object|null} Збережений стан або null якщо не знайдено/застарілий
 */
export function loadTabsState(maxAge = 24 * 60 * 60 * 1000) {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
            console.log('📭 Немає збереженого стану табів');
            return null;
        }

        const state = JSON.parse(saved);

        // Перевірити чи не застарілий стан
        if (state.timestamp && (Date.now() - state.timestamp > maxAge)) {
            console.log('⏰ Збережений стан табів застарілий, видаляємо');
            clearTabsState();
            return null;
        }

        console.log('📂 Завантажено стан табів:', state);
        return state;
    } catch (error) {
        console.error('❌ Помилка завантаження стану табів:', error);
        return null;
    }
}

/**
 * Очистити збережений стан табів
 */
export function clearTabsState() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('🗑️ Стан табів очищено');
    } catch (error) {
        console.error('❌ Помилка очищення стану табів:', error);
    }
}

/**
 * Оновити стан для конкретного табу
 * @param {string} tabId - ID табу
 * @param {Object} updates - Оновлення для табу
 */
export function updateTabState(tabId, updates) {
    try {
        const state = loadTabsState() || { openTabs: [], activeTabId: null };

        // Знайти таб в масиві
        const tabIndex = state.openTabs.findIndex(tab => tab.tabId === tabId);

        if (tabIndex !== -1) {
            // Оновити існуючий таб
            state.openTabs[tabIndex] = {
                ...state.openTabs[tabIndex],
                ...updates
            };
        } else {
            // Додати новий таб
            state.openTabs.push({
                tabId,
                ...updates
            });
        }

        saveTabsState(state);
    } catch (error) {
        console.error('❌ Помилка оновлення стану табу:', error);
    }
}

/**
 * Видалити таб зі збереженого стану
 * @param {string} tabId - ID табу для видалення
 */
export function removeTabFromState(tabId) {
    try {
        const state = loadTabsState();
        if (!state) return;

        // Видалити таб з масиву
        state.openTabs = state.openTabs.filter(tab => tab.tabId !== tabId);

        // Якщо це був активний таб, зробити активним перший
        if (state.activeTabId === tabId) {
            state.activeTabId = state.openTabs.length > 0 ? state.openTabs[0].tabId : null;
        }

        saveTabsState(state);
        console.log(`🗑️ Таб ${tabId} видалено зі стану`);
    } catch (error) {
        console.error('❌ Помилка видалення табу зі стану:', error);
    }
}

/**
 * Встановити активний таб
 * @param {string} tabId - ID табу який стане активним
 */
export function setActiveTab(tabId) {
    try {
        const state = loadTabsState();
        if (!state) return;

        state.activeTabId = tabId;

        // Оновити прапорець isActive для всіх табів
        state.openTabs.forEach(tab => {
            tab.isActive = tab.tabId === tabId;
        });

        saveTabsState(state);
    } catch (error) {
        console.error('❌ Помилка встановлення активного табу:', error);
    }
}

/**
 * Отримати стан конкретного табу
 * @param {string} tabId - ID табу
 * @returns {Object|null} Стан табу або null якщо не знайдено
 */
export function getTabState(tabId) {
    try {
        const state = loadTabsState();
        if (!state) return null;

        return state.openTabs.find(tab => tab.tabId === tabId) || null;
    } catch (error) {
        console.error('❌ Помилка отримання стану табу:', error);
        return null;
    }
}

/**
 * Додати новий таб до збереженого стану
 * @param {string} tabId - ID табу
 * @param {string} sheetName - Назва аркуша (перша з масиву)
 * @param {string} wordId - ID забороненого слова (перший з масиву)
 * @param {string} columnName - Назва колонки (перша з масиву)
 * @param {boolean} setActive - Чи зробити цей таб активним
 * @param {Object} multiselect - Масиви для мультиселекту { sheets, words, columns }
 */
export function addTabToState(tabId, sheetName, wordId, columnName, setActive = true, multiselect = null) {
    try {
        const state = loadTabsState() || { openTabs: [], activeTabId: null };

        // Перевірити чи таб вже існує
        const existingIndex = state.openTabs.findIndex(tab => tab.tabId === tabId);

        if (existingIndex !== -1) {
            console.log(`ℹ️ Таб ${tabId} вже існує в стані`);
            if (setActive) {
                setActiveTab(tabId);
            }
            return;
        }

        // Якщо встановлюємо як активний, зняти активність з інших
        if (setActive) {
            state.openTabs.forEach(tab => {
                tab.isActive = false;
            });
        }

        // Додати новий таб
        const newTab = {
            tabId,
            sheetName,
            wordId,
            columnName,
            isActive: setActive,
            filter: 'all',
            currentPage: 1,
            pageSize: 10,
            createdAt: Date.now(),
            // Масиви для мультиселекту
            sheets: multiselect?.sheets || [sheetName],
            words: multiselect?.words || [wordId],
            columns: multiselect?.columns || [columnName]
        };

        state.openTabs.push(newTab);

        if (setActive) {
            state.activeTabId = tabId;
        }

        saveTabsState(state);
        console.log(`➕ Таб ${tabId} додано до стану`);
    } catch (error) {
        console.error('❌ Помилка додавання табу до стану:', error);
    }
}
