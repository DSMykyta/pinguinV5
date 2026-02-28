// js/utils/common-utils.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    COMMON UTILS — ЗАГАЛЬНІ УТИЛІТИ                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🛠️ УТИЛІТА — debounce, generateNextId, capitalizeFirst, formatDate     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Затримує виконання функції до закінчення періоду неактивності
 *
 * @param {Function} func - Функція для виконання
 * @param {number} delay - Затримка в мілісекундах
 * @returns {Function} Debounced функція
 *
 * @example
 * const search = debounce((query) => {
 *     console.log('Searching for:', query);
 * }, 300);
 *
 * input.addEventListener('input', (e) => {
 *     search(e.target.value);
 * });
 */
export function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

/**
 * Згенерувати наступний ID з авто-інкрементом
 *
 * @param {string} prefix - Префікс ID (наприклад 'task-', 'bran-', 'line-')
 * @param {string[]} existingIds - Масив існуючих ID
 * @returns {string} Новий ID у форматі prefix + 6 цифр (наприклад 'task-000001')
 *
 * @example
 * generateNextId('task-', ['task-000001', 'task-000005'])
 * // → 'task-000006'
 */
export function generateNextId(prefix, existingIds) {
    let maxNum = 0;
    existingIds.forEach(id => {
        if (id && id.startsWith(prefix)) {
            const num = parseInt(id.replace(prefix, ''), 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });
    return `${prefix}${String(maxNum + 1).padStart(6, '0')}`;
}

/**
 * Капіталізує першу літеру рядка
 *
 * @param {string} str - Вхідний рядок
 * @returns {string} Рядок з великою першою літерою
 *
 * @example
 * capitalizeFirst('penguin') // → 'Penguin'
 */
export function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Форматує дату у формат DD.MM.YY
 *
 * @param {Date} date - Об'єкт дати
 * @returns {string} Форматована дата
 *
 * @example
 * formatDate(new Date(2025, 0, 15)) // → '15.01.25'
 */
export function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
}
