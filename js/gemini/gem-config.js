// js/gemini/gem-config.js

/**
 * GEMINI CONFIG
 * Завантаження API ключа з Google Sheets (таблиця Users, аркуш Config)
 */

import { callSheetsAPI } from '../utils/api-client.js';

let apiKey = null;
let isLoaded = false;

/**
 * Завантажити API ключ з Google Sheets
 * @returns {Promise<boolean>} true якщо ключ завантажено
 */
export async function loadApiKey() {
    if (isLoaded) {
        return !!apiKey;
    }

    try {
        const data = await callSheetsAPI('get', {
            range: 'Config!A1',
            spreadsheetType: 'users'
        });

        apiKey = data?.[0]?.[0] || null;
        isLoaded = true;

        return !!apiKey;
    } catch (error) {
        console.warn('[Gemini] API ключ недоступний:', error.message);
        isLoaded = true;
        return false;
    }
}

/**
 * Отримати API ключ
 * @returns {string|null}
 */
export function getApiKey() {
    return apiKey;
}

/**
 * Перевірити чи є API ключ
 * @returns {boolean}
 */
export function hasApiKey() {
    return !!apiKey;
}

/**
 * Скинути кеш (для перезавантаження)
 */
export function resetConfig() {
    apiKey = null;
    isLoaded = false;
}
