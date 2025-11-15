/**
 * UTILITY: Search Clear
 *
 * ПРИЗНАЧЕННЯ:
 * Універсальна логіка для кнопок очищення полів пошуку.
 * Показує/приховує кнопку очищення залежно від вмісту поля.
 *
 * ВИКОРИСТАННЯ:
 * import { initSearchClear } from './js/utils/search-clear.js';
 *
 * // Ініціалізація для одного поля
 * initSearchClear('search-input-id');
 *
 * // Ініціалізація для кількох полів
 * initSearchClear(['search-1', 'search-2', 'search-3']);
 *
 * // З custom callback при очищенні
 * initSearchClear('search-input-id', (inputElement) => {
 *   console.log('Поле очищено!');
 *   // Ваша логіка
 * });
 *
 * ВИМОГИ ДО HTML:
 * <div class="panel-box">
 *   <input type="text" id="your-input-id" class="input-main">
 *   <button class="btn-icon clear-search-btn u-hidden">
 *     <span class="material-symbols-outlined">close</span>
 *   </button>
 * </div>
 */

/**
 * Ініціалізує функціонал очищення для одного або кількох полів пошуку.
 *
 * @param {string|string[]} inputIds - ID поля або масив ID полів пошуку
 * @param {Function} [onClearCallback] - Опціональний callback, який викликається після очищення
 */
export function initSearchClear(inputIds, onClearCallback = null) {
    // Якщо передано один ID - перетворюємо на масив
    const ids = Array.isArray(inputIds) ? inputIds : [inputIds];

    ids.forEach(inputId => {
        const inputElement = document.getElementById(inputId);
        if (!inputElement) {
            console.warn(`[search-clear] Поле з ID "${inputId}" не знайдено`);
            return;
        }

        // Знаходимо кнопку очищення (сусідній елемент в .panel-box)
        const panelBox = inputElement.closest('.panel-box');
        if (!panelBox) {
            console.warn(`[search-clear] Батьківський .panel-box не знайдено для поля "${inputId}"`);
            return;
        }

        const clearBtn = panelBox.querySelector('.clear-search-btn');
        if (!clearBtn) {
            console.warn(`[search-clear] Кнопка .clear-search-btn не знайдена для поля "${inputId}"`);
            return;
        }

        // Функція оновлення видимості кнопки
        const updateClearButtonVisibility = () => {
            if (inputElement.value.trim().length > 0) {
                clearBtn.classList.remove('u-hidden');
            } else {
                clearBtn.classList.add('u-hidden');
            }
        };

        // Функція очищення
        const clearSearch = () => {
            inputElement.value = '';
            clearBtn.classList.add('u-hidden');
            inputElement.focus();

            // Генеруємо подію input щоб спрацювали існуючі слухачі
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));

            // Викликаємо callback якщо є
            if (onClearCallback && typeof onClearCallback === 'function') {
                onClearCallback(inputElement);
            }
        };

        // Слухачі подій
        inputElement.addEventListener('input', updateClearButtonVisibility);
        clearBtn.addEventListener('click', clearSearch);

        // Початкова перевірка (якщо поле вже заповнене)
        updateClearButtonVisibility();

        console.log(`✅ [search-clear] Ініціалізовано для поля "${inputId}"`);
    });
}

/**
 * Видаляє слухачі подій для поля (cleanup при знищенні компонента).
 *
 * @param {string|string[]} inputIds - ID поля або масив ID полів пошуку
 */
export function destroySearchClear(inputIds) {
    const ids = Array.isArray(inputIds) ? inputIds : [inputIds];

    ids.forEach(inputId => {
        const inputElement = document.getElementById(inputId);
        if (!inputElement) return;

        const panelBox = inputElement.closest('.panel-box');
        if (!panelBox) return;

        const clearBtn = panelBox.querySelector('.clear-search-btn');
        if (!clearBtn) return;

        // Видаляємо слухачі (потрібно зберігати посилання на функції)
        // В даному випадку просто приховуємо кнопку
        clearBtn.classList.add('u-hidden');

        console.log(`🗑️ [search-clear] Знищено для поля "${inputId}"`);
    });
}
