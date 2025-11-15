/**
 * Загальні утиліти для всіх модулів
 *
 * @module common-utils
 * @description Центральне сховище багаторазово використовуваних функцій
 *
 * @example
 * import { debounce } from './utils/common-utils.js';
 *
 * const handleSearch = debounce((query) => {
 *     console.log('Searching for:', query);
 * }, 300);
 *
 * @exports debounce
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
