// js/components/page/page-entity-data.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    PAGE ENTITY DATA — Універсальний data layer           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Замінює всі *-data.js файли для простих сутностей.            ║
 * ║  Надає: load (CSV), getAll, getById, add, update, remove.               ║
 * ║                                                                          ║
 * ║  🎯 Використання:                                                        ║
 * ║  const data = createEntityData(dataSource, state);                      ║
 * ║  await data.load();                                                     ║
 * ║  const all = data.getAll();                                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { callSheetsAPI } from '../../utils/utils-api-client.js';
import { generateNextId } from '../../utils/utils-id.js';
import {
    MAIN_SPREADSHEET_ID,
    PRODUCTS_SPREADSHEET_ID,
    TEXTS_SPREADSHEET_ID,
    PRICE_SPREADSHEET_ID
} from '../../config/spreadsheet-config.js';

const SPREADSHEET_IDS = {
    main: MAIN_SPREADSHEET_ID,
    products: PRODUCTS_SPREADSHEET_ID,
    texts: TEXTS_SPREADSHEET_ID,
    price: PRICE_SPREADSHEET_ID,
};

function columnLetter(index) {
    let letter = '';
    let i = index;
    while (i > 0) {
        i--;
        letter = String.fromCharCode(65 + (i % 26)) + letter;
        i = Math.floor(i / 26);
    }
    return letter;
}

/**
 * Створити універсальний data layer для сутності
 *
 * @param {Object} dataSource
 * @param {string} dataSource.spreadsheetType — 'main' | 'products' | 'texts' | 'price'
 * @param {string} dataSource.sheetName — Назва аркуша (напр. 'Banners')
 * @param {string} dataSource.sheetGid — GID аркуша для CSV export
 * @param {string} dataSource.idField — Поле первинного ключа (напр. 'banner_id')
 * @param {string} dataSource.idPrefix — Префікс для генерації ID (напр. 'banner-')
 * @param {string[]} dataSource.columns — Назви колонок по порядку
 * @param {string} dataSource.stateKey — Ключ в state для збереження даних
 * @param {Object} [dataSource.autoFields] — Автозаповнення при створенні { field: () => value }
 * @param {Object} state — State об'єкт сторінки
 * @returns {{ load, getAll, getById, add, update, remove }}
 */
export function createEntityData(dataSource, state) {
    const {
        spreadsheetType,
        sheetName,
        sheetGid,
        idField,
        idPrefix,
        columns,
        stateKey,
        autoFields = {},
    } = dataSource;

    const spreadsheetId = SPREADSHEET_IDS[spreadsheetType] || SPREADSHEET_IDS.main;
    const lastCol = columnLetter(columns.length);
    const sheetRange = `${sheetName}!A:${lastCol}`;

    function normalizeRecord(record = {}) {
        const normalized = {};
        columns.forEach((key) => {
            normalized[key] = record[key] != null ? String(record[key]).trim() : '';
        });
        return normalized;
    }

    function buildRow(record) {
        return columns.map(key => record[key] ?? '');
    }

    // ── Load (CSV) ──────────────────────────────────────────────────────
    async function load() {
        try {
            const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${sheetGid}`;
            const response = await fetch(csvUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const csvText = await response.text();
            if (typeof Papa === 'undefined') {
                throw new Error('PapaParse library is not loaded');
            }

            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
            const rows = parsed.data || [];

            state[stateKey] = rows.map((row, index) => ({
                ...normalizeRecord(row),
                _rowIndex: index + 2
            }));

            state._dataLoaded = true;
            return state[stateKey];
        } catch (error) {
            console.error(`[${sheetName}] Помилка завантаження:`, error);
            throw error;
        }
    }

    // ── Getters ─────────────────────────────────────────────────────────
    function getAll() {
        return state[stateKey] || [];
    }

    function getById(id) {
        return getAll().find(e => e[idField] === id) || null;
    }

    // ── Add ─────────────────────────────────────────────────────────────
    async function add(entityData = {}) {
        try {
            const existingIds = getAll().map(item => item[idField]);

            const autoPopulated = {};
            if (!entityData[idField]) {
                autoPopulated[idField] = generateNextId(idPrefix, existingIds);
            }
            for (const [field, fn] of Object.entries(autoFields)) {
                if (!entityData[field]) {
                    autoPopulated[field] = typeof fn === 'function' ? fn() : fn;
                }
            }

            const normalized = normalizeRecord({
                ...entityData,
                ...autoPopulated,
            });

            await callSheetsAPI('append', {
                range: sheetRange,
                values: [buildRow(normalized)],
                spreadsheetType
            });

            const newEntry = {
                ...normalized,
                _rowIndex: getAll().length + 2
            };
            getAll().push(newEntry);
            return newEntry;
        } catch (error) {
            console.error(`[${sheetName}] Помилка додавання:`, error);
            throw error;
        }
    }

    // ── Update ──────────────────────────────────────────────────────────
    async function update(entityId, updates = {}) {
        try {
            const entry = getById(entityId);
            if (!entry) {
                throw new Error(`${sheetName}: ${entityId} не знайдено`);
            }

            const merged = normalizeRecord({ ...entry, ...updates });
            await callSheetsAPI('update', {
                range: `${sheetName}!A${entry._rowIndex}:${lastCol}${entry._rowIndex}`,
                values: [buildRow(merged)],
                spreadsheetType
            });

            Object.assign(entry, merged);
            return entry;
        } catch (error) {
            console.error(`[${sheetName}] Помилка оновлення:`, error);
            throw error;
        }
    }

    // ── Remove ──────────────────────────────────────────────────────────
    async function remove(entityId) {
        try {
            const items = getAll();
            const index = items.findIndex(item => item[idField] === entityId);
            if (index === -1) {
                throw new Error(`${sheetName}: ${entityId} не знайдено`);
            }

            const entry = items[index];
            const rowIndex = entry._rowIndex;

            await callSheetsAPI('batchUpdateSpreadsheet', {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: parseInt(sheetGid, 10),
                            dimension: 'ROWS',
                            startIndex: rowIndex - 1,
                            endIndex: rowIndex
                        }
                    }
                }],
                spreadsheetType
            });

            items.splice(index, 1);
            items.forEach(item => {
                if (item._rowIndex > rowIndex) item._rowIndex -= 1;
            });

            return true;
        } catch (error) {
            console.error(`[${sheetName}] Помилка видалення:`, error);
            throw error;
        }
    }

    return { load, getAll, getById, add, update, remove };
}
