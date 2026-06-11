// js/data/public-options-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                 PUBLIC OPTIONS — READ-ONLY DATA                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Публічне читання підписів опцій без JWT для відкритих генераторів.      ║
 * ║  Модуль не виконує CRUD і не використовує приватний Sheets endpoint.     ║
 * ║                                                                          ║
 * ║  ЕКСПОРТИ:                                                               ║
 * ║  └── loadPublicOptionLabels() — Map<optionId, українська назва>          ║
 * ║                                                                          ║
 * ║  ВІДМОВОСТІЙКІСТЬ:                                                      ║
 * ║  ├── один запит кешується та перевикористовується між модулями           ║
 * ║  └── після помилки кеш скидається, тому наступний виклик може повторити  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { MAIN_SPREADSHEET_ID } from '../config/spreadsheet-config.js';

const OPTIONS_SHEET_GID = '1060760105';

let optionLabelsPromise = null;

/**
 * Завантажити публічну відповідність ID опції до української назви.
 * @returns {Promise<Map<string, string>>}
 */
export function loadPublicOptionLabels() {
    if (!optionLabelsPromise) {
        optionLabelsPromise = fetchPublicOptionLabels().catch(error => {
            optionLabelsPromise = null;
            throw error;
        });
    }

    return optionLabelsPromise;
}

async function fetchPublicOptionLabels() {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${MAIN_SPREADSHEET_ID}/export?format=csv&gid=${OPTIONS_SHEET_GID}`;
    const response = await fetch(csvUrl);

    if (!response.ok) {
        throw new Error(`Помилка завантаження публічних опцій: HTTP ${response.status}`);
    }

    const csvText = await response.text();
    const rows = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true
    }).data;
    const labels = new Map();

    rows.forEach(row => {
        const id = (row.id || '').trim();
        const label = (row.value_ua || row.name_uk || '').trim();

        if (id && label) {
            labels.set(id, label);
        }
    });

    return labels;
}
