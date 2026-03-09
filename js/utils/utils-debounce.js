// js/utils/utils-debounce.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    DEBOUNCE — ЗАТРИМКА ВИКЛИКУ                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  📋 Експорти:                                                            ║
 * ║  └── debounce(func, delay) — затримує виклик до закінчення неактивності  ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Затримує виконання функції до закінчення періоду неактивності
 *
 * @param {Function} func - Функція для виконання
 * @param {number} delay - Затримка в мілісекундах
 * @returns {Function} Debounced функція
 */
export function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}
