// js/generators/generator-glossary/ggl-data.js

let glossaryData = []; // Масив усіх рядків з таблиці
let glossaryTree = {}; // Об'єкт для побудови дерева { parentId: [child1, child2] }
let glossaryMap = {};  // Об'єкт для швидкого доступу до елемента по ID { id: itemData }

export function getGlossaryData() { return glossaryData; }
export function getGlossaryTree() { return glossaryTree; }
export function getGlossaryMap() { return glossaryMap; }

export async function fetchGlossaryData() {
    const sheetId = '1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk';
    const sheetGid = '90240383'; // GID для Головна
    const csvUrlBase = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${sheetGid}`;
    const csvUrl = `${csvUrlBase}&_=${Date.now()}`; // Проти кешу

    try {
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error('Помилка завантаження CSV Глосарію');
        const csvText = await response.text();
        const parsedData = Papa.parse(csvText, { header: true, skipEmptyLines: true }).data;

        console.log('[ГЛОСАРІЙ]: Перший рядок з таблиці:', parsedData[0]);

        // Очищаємо перед заповненням
        glossaryData = [];
        glossaryTree = {};
        glossaryMap = {};
        const rootItems = []; // Елементи без батька (основа дерева)

        parsedData.forEach(row => {
            const item = {
                id: (row.local_id || '').trim(),
                parentId: (row.parent_local_id || '').trim(),
                name: (row.name_uk || '').trim(),
                text: (row.glossary_text || '').trim(),
                // Додай інші потрібні поля: name_ru, name_en, keywords_ru і т.д.
                // name_ru: (row.name_ru || '').trim(),
                // keywords_ru: (row.keywords_ru || '').split(',').map(k => k.trim()).filter(Boolean),
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

        console.log('[ГЛОСАРІЙ]: Дані завантажено та оброблено. Карта:', glossaryMap);
        console.log('[ГЛОСАРІЙ]: Структура дерева:', glossaryTree);

    } catch (error) {
        console.error('Помилка при завантаженні даних Глосарію:', error);
    }
}