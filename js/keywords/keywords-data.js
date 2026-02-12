// js/keywords/keywords-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - DATA MANAGEMENT                            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Робота з Google Sheets API - використовує аркуш Glossary
 * Використовує уніфікований api-client для всіх операцій
 */

import { keywordsState } from './keywords-init.js';
import { callSheetsAPI } from '../utils/api-client.js';
import { MAIN_SPREADSHEET_ID as SPREADSHEET_ID } from '../config/spreadsheet-config.js';

const SHEET_NAME = 'Glossary';
const SHEET_GID = '90240383'; // GID для Glossary

/**
 * Завантажити ключові слова через CSV export (без авторизації)
 */
export async function loadKeywords() {

    try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
        const response = await fetch(csvUrl);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvText = await response.text();

        // Перевіряємо чи завантажено PapaParse
        if (typeof Papa === 'undefined') {
            throw new Error('PapaParse library is not loaded');
        }

        const parsedData = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        const rows = parsedData.data;

        if (!rows || rows.length === 0) {
            console.warn('⚠️ Немає даних в Glossary');
            keywordsState.keywords = [];
            return keywordsState.keywords;
        }

        keywordsState.keywords = rows.map((row, index) => ({
            ...row,
            _rowIndex: index + 2 // +2 бо заголовок + 1-based indexing
        }));

        keywordsState._dataLoaded = true;

        return keywordsState.keywords;
    } catch (error) {
        console.error('❌ Помилка завантаження ключових слів:', error);
        throw error;
    }
}

// callSheetsAPI імпортується з '../utils/api-client.js'

export function getKeywords() {
    return keywordsState.keywords || [];
}

/**
 * Генерувати унікальний local_id у форматі glo + 6 цифр
 */
function generateLocalId() {
    const existingIds = keywordsState.keywords.map(k => k.local_id).filter(id => id && id.startsWith('glo-'));

    // Знайти максимальний номер
    let maxNum = 0;
    existingIds.forEach(id => {
        const num = parseInt(id.substring(4), 10); // glo-000001 -> 4 символи до числа
        if (!isNaN(num) && num > maxNum) {
            maxNum = num;
        }
    });

    // Новий номер
    const newNum = maxNum + 1;

    // Форматувати з нулями на початку (6 цифр) та дефісом
    const localId = 'glo-' + String(newNum).padStart(6, '0');

    return localId;
}

export async function addKeyword(keywordData) {

    try {
        // Переконатися що дані завантажені перед генерацією ID
        if (!keywordsState._dataLoaded) {
            await loadKeywords();
        }

        // Генерувати local_id автоматично
        const local_id = generateLocalId();

        const newRow = [
            local_id,
            keywordData.param_type || '',
            keywordData.parent_local_id || '',
            keywordData.entity_identity_id || '',
            keywordData.name_uk || '',
            keywordData.name_ru || '',
            keywordData.name_en || '',
            keywordData.name_lat || '',
            keywordData.name_alt || '',
            keywordData.trigers || '',
            keywordData.keywords_ua || '',
            keywordData.keywords_ru || '',
            keywordData.glossary_text || ''
        ];

        await callSheetsAPI('append', {
            range: `${SHEET_NAME}!A:M`,
            values: [newRow],
            spreadsheetType: 'main'
        });

        const newEntry = {
            _rowIndex: keywordsState.keywords.length + 2,
            local_id,
            ...keywordData
        };

        keywordsState.keywords.push(newEntry);

        return newEntry;
    } catch (error) {
        console.error('❌ Помилка додавання ключового слова:', error);
        throw error;
    }
}

export async function updateKeyword(localId, updates) {

    try {
        const entry = keywordsState.keywords.find(e => e.local_id === localId);
        if (!entry) {
            throw new Error(`Ключове слово ${localId} не знайдено`);
        }

        const range = `${SHEET_NAME}!A${entry._rowIndex}:M${entry._rowIndex}`;
        const updatedRow = [
            entry.local_id, // ID не змінюється
            updates.param_type !== undefined ? updates.param_type : entry.param_type,
            updates.parent_local_id !== undefined ? updates.parent_local_id : entry.parent_local_id,
            updates.entity_identity_id !== undefined ? updates.entity_identity_id : entry.entity_identity_id,
            updates.name_uk !== undefined ? updates.name_uk : entry.name_uk,
            updates.name_ru !== undefined ? updates.name_ru : entry.name_ru,
            updates.name_en !== undefined ? updates.name_en : entry.name_en,
            updates.name_lat !== undefined ? updates.name_lat : entry.name_lat,
            updates.name_alt !== undefined ? updates.name_alt : entry.name_alt,
            updates.trigers !== undefined ? updates.trigers : entry.trigers,
            updates.keywords_ua !== undefined ? updates.keywords_ua : entry.keywords_ua,
            updates.keywords_ru !== undefined ? updates.keywords_ru : entry.keywords_ru,
            updates.glossary_text !== undefined ? updates.glossary_text : entry.glossary_text
        ];

        await callSheetsAPI('update', {
            range: range,
            values: [updatedRow],
            spreadsheetType: 'main'
        });

        // Оновити локальні дані
        Object.assign(entry, updates);

        return entry;
    } catch (error) {
        console.error('❌ Помилка оновлення ключового слова:', error);
        throw error;
    }
}

export async function deleteKeyword(localId) {

    try {
        const entryIndex = keywordsState.keywords.findIndex(e => e.local_id === localId);
        if (entryIndex === -1) {
            throw new Error(`Ключове слово ${localId} не знайдено`);
        }

        const entry = keywordsState.keywords[entryIndex];

        const range = `${SHEET_NAME}!A${entry._rowIndex}:M${entry._rowIndex}`;
        await callSheetsAPI('update', {
            range: range,
            values: [['', '', '', '', '', '', '', '', '', '', '', '', '']],
            spreadsheetType: 'main'
        });

        keywordsState.keywords.splice(entryIndex, 1);

    } catch (error) {
        console.error('❌ Помилка видалення ключового слова:', error);
        throw error;
    }
}
