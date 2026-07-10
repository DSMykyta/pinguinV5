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
    let lastArgs;
    let lastThis;

    function debounced(...args) {
        lastArgs = args;
        lastThis = this;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            timeoutId = null;
            func.apply(lastThis, lastArgs);
            lastArgs = null;
            lastThis = null;
        }, delay);
    }

    debounced.flush = () => {
        if (!timeoutId) return undefined;
        clearTimeout(timeoutId);
        timeoutId = null;
        const result = func.apply(lastThis, lastArgs || []);
        lastArgs = null;
        lastThis = null;
        return result;
    };

    debounced.cancel = () => {
        clearTimeout(timeoutId);
        timeoutId = null;
        lastArgs = null;
        lastThis = null;
    };

    return debounced;
}
