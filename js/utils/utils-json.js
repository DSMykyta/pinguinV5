// js/utils/utils-json.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    JSON UTILS — БЕЗПЕЧНИЙ ПАРСИНГ                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Безпечний JSON.parse з fallback значенням
 * @param {*} value - Значення для парсингу
 * @param {*} [defaultValue=null] - Значення за замовчуванням при помилці
 * @returns {*} Розпарсений об'єкт або defaultValue
 */
export function safeJsonParse(value, defaultValue = null) {
    if (value === null || value === undefined || value === '') return defaultValue;
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value.trim());
    } catch {
        return defaultValue;
    }
}

/**
 * Безпечний JSON.parse для масивів (JSON рядок, URL, або вже масив)
 * @param {*} value - Значення для парсингу
 * @returns {Array} Масив або порожній масив
 */
export function safeJsonParseArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.startsWith('[')) {
            try { return JSON.parse(trimmed); } catch { /* ignore */ }
        }
        if (trimmed.startsWith('http')) return [trimmed];
    }
    return [];
}
