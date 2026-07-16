// js/pages/glossary/glossary-data.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                        GLOSSARY DATA                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Завантаження та обробка даних глосарію з Google Sheets     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { MAIN_SPREADSHEET_ID } from '../../config/spreadsheet-config.js';
import {
    getGlossaryData,
    getGlossaryMap,
    getGlossaryTree,
    resetGlossaryState,
    setGlossaryState,
} from './glossary-state.js';

export { getGlossaryData, getGlossaryMap, getGlossaryTree };

export async function fetchGlossaryData() {
    const sheetId = MAIN_SPREADSHEET_ID;
    const sheetGid = '90240383'; // GID для Головна
    const csvUrlBase = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${sheetGid}`;
    const csvUrl = `${csvUrlBase}&_=${Date.now()}`; // Проти кешу

    try {
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error('Помилка завантаження CSV Глосарію');
        const csvText = await response.text();
        const parsedData = Papa.parse(csvText, { header: true, skipEmptyLines: true }).data;


        // Очищаємо перед заповненням
        const glossaryData = [];
        const glossaryTree = {};
        const glossaryMap = {};
        const rootItems = []; // Елементи без батька (основа дерева)

        parsedData.forEach(row => {
            const item = {
                id: (row.local_id || '').trim(),
                parentId: (row.parent_local_id || '').trim(),
                name: (row.name_uk || '').trim(),
                text: (row.glossary_text || '').trim(),
                // Додаткові поля для майбутнього використання
                name_ru: (row.name_ru || '').trim(),
                name_en: (row.name_en || '').trim(),
                keywords_ua: (row.keywords_ua || '').trim(),
                keywords_ru: (row.keywords_ru || '').trim(),
                trigers: (row.trigers || '').trim(),
                param_type: (row.param_type || '').trim(),
                children: [] // Масив для дочірніх елементів
            };

            // Пропускаємо рядки без ID або назви
            if (!item.id || !item.name) {
                console.warn('[ГЛОСАРІЙ]: Пропущено рядок без ID або Name:', row);
                return;
            }

            glossaryData.push(item);
            glossaryMap[item.id] = item; // Зберігаємо для швидкого пошуку

            // Будуємо дерево
            const parentId = item.parentId || 'root'; // Якщо parentId порожній, вважаємо кореневим
            if (!glossaryTree[parentId]) {
                glossaryTree[parentId] = [];
            }
            glossaryTree[parentId].push(item);

            // Зберігаємо посилання на батьківський елемент (для зручності)
            if (item.parentId && glossaryMap[item.parentId]) {
                // Додаємо поточний елемент до дітей батьківського
                if (!glossaryMap[item.parentId].children) {
                    glossaryMap[item.parentId].children = [];
                }
                glossaryMap[item.parentId].children.push(item);
            } else if (!item.parentId) {
                rootItems.push(item); // Додаємо до кореневих елементів
            }
        });

        // Додаємо кореневі елементи в дерево під ключем 'root'
        glossaryTree['root'] = rootItems;

        setGlossaryState({
            data: glossaryData,
            tree: glossaryTree,
            map: glossaryMap,
        });

    } catch (error) {
        resetGlossaryState();
        console.error('Помилка при завантаженні даних Глосарію:', error);
    }
}
