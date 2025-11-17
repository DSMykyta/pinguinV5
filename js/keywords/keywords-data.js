// js/keywords/keywords-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - DATA MANAGEMENT                            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Робота з Google Sheets API - використовує аркуш Glossary
 */

import { keywordsState } from './keywords-init.js';

const SHEET_NAME = 'Glossary';

export async function loadKeywords() {
    console.log('📥 Завантаження ключових слів з Google Sheets (Glossary)...');

    try {
        const response = await window.apiClient.sheets.get(SHEET_NAME);

        const values = response.result?.values || response.data || [];
        if (!values || values.length === 0) {
            console.warn('⚠️ Немає даних в Glossary');
            keywordsState.keywords = [];
            return keywordsState.keywords;
        }

        keywordsState.keywords = parseSheetData(values);
        console.log(`✅ Завантажено ${keywordsState.keywords.length} ключових слів`);

        return keywordsState.keywords;
    } catch (error) {
        console.error('❌ Помилка завантаження ключових слів:', error);
        throw error;
    }
}

function parseSheetData(values) {
    if (!values || values.length === 0) return [];

    const headers = values[0];
    const rows = values.slice(1);

    return rows.map((row, index) => {
        const obj = { _rowIndex: index + 2 };
        headers.forEach((header, colIndex) => {
            obj[header] = row[colIndex] || '';
        });
        return obj;
    });
}

export function getKeywords() {
    return keywordsState.keywords || [];
}

export async function addKeyword(keywordData) {
    console.log('➕ Додавання нового ключового слова:', keywordData);

    try {
        const newRow = [
            keywordData.local_id || '',
            keywordData.param_type || '',
            keywordData.parent_local_id || '',
            keywordData.characteristics_local_id || '',
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

        await window.apiClient.sheets.append(SHEET_NAME, [newRow]);

        const newEntry = {
            _rowIndex: keywordsState.keywords.length + 2,
            ...keywordData
        };

        keywordsState.keywords.push(newEntry);

        console.log('✅ Ключове слово додано:', newEntry);
        return newEntry;
    } catch (error) {
        console.error('❌ Помилка додавання ключового слова:', error);
        throw error;
    }
}

export async function updateKeyword(localId, updates) {
    console.log(`📝 Оновлення ключового слова ${localId}:`, updates);

    try {
        const entry = keywordsState.keywords.find(e => e.local_id === localId);
        if (!entry) {
            throw new Error(`Ключове слово ${localId} не знайдено`);
        }

        const range = `${SHEET_NAME}!A${entry._rowIndex}:M${entry._rowIndex}`;
        const updatedRow = [
            entry.local_id,
            updates.param_type !== undefined ? updates.param_type : entry.param_type,
            updates.parent_local_id !== undefined ? updates.parent_local_id : entry.parent_local_id,
            updates.characteristics_local_id !== undefined ? updates.characteristics_local_id : entry.characteristics_local_id,
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

        await window.apiClient.sheets.update(range, [updatedRow]);

        Object.assign(entry, updates);

        console.log('✅ Ключове слово оновлено:', entry);
        return entry;
    } catch (error) {
        console.error('❌ Помилка оновлення ключового слова:', error);
        throw error;
    }
}

export async function deleteKeyword(localId) {
    console.log(`🗑️ Видалення ключового слова ${localId}`);

    try {
        const entryIndex = keywordsState.keywords.findIndex(e => e.local_id === localId);
        if (entryIndex === -1) {
            throw new Error(`Ключове слово ${localId} не знайдено`);
        }

        const entry = keywordsState.keywords[entryIndex];

        const range = `${SHEET_NAME}!A${entry._rowIndex}:M${entry._rowIndex}`;
        await window.apiClient.sheets.update(range, [['', '', '', '', '', '', '', '', '', '', '', '', '']]);

        keywordsState.keywords.splice(entryIndex, 1);

        console.log('✅ Ключове слово видалено');
    } catch (error) {
        console.error('❌ Помилка видалення ключового слова:', error);
        throw error;
    }
}
