// js/pages/banners/banners-data.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      BANNERS — DATA                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН (viewless) — Завантаження та CRUD через Google Sheets API     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { bannersState } from './banners-state.js';
import { callSheetsAPI } from '../../utils/utils-api-client.js';
import { PRODUCTS_SPREADSHEET_ID as SPREADSHEET_ID } from '../../config/spreadsheet-config.js';
import { generateNextId } from '../../utils/utils-id.js';

const SHEET_NAME = 'Banners';
const SHEET_GID = '1208466784';
const SHEET_RANGE = `${SHEET_NAME}!A:P`;
const COLUMN_IDS = [
    'banner_id',
    'banner_target',
    'banner_group',
    'banner_type',
    'banner_sort_order',
    'status',
    'banner_name_ua',
    'banner_name_ru',
    'url_ua',
    'url_ru',
    'url',
    'banner_text_ua',
    'banner_text_ru',
    'image_url',
    'created_at',
    'created_by'
];

function nowDateTime() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function inferIdPrefix(existingIds, fallback) {
    const existing = (existingIds || []).find(id => typeof id === 'string' && id.includes('-'));
    const match = existing?.match(/^([a-zA-Z]+-)/);
    return match ? match[1] : fallback;
}

function normalizeRecord(record = {}) {
    const normalized = {};
    COLUMN_IDS.forEach((key) => {
        normalized[key] = record[key] != null ? String(record[key]).trim() : '';
    });
    return normalized;
}

function buildBannerRow(record) {
    return COLUMN_IDS.map(key => record[key] ?? '');
}

export async function loadBanners() {
    try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
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

        bannersState.banners = rows.map((row, index) => ({
            ...normalizeRecord(row),
            _rowIndex: index + 2
        }));

        bannersState._dataLoaded = true;
        return bannersState.banners;
    } catch (error) {
        console.error('❌ Помилка завантаження банерів:', error);
        throw error;
    }
}

export function getBanners() {
    return bannersState.banners || [];
}

export async function addBanner(bannerData = {}) {
    try {
        const prefix = inferIdPrefix(
            bannersState.banners.map(item => item.banner_id),
            'banner-'
        );

        const normalized = normalizeRecord({
            ...bannerData,
            banner_id: bannerData.banner_id || generateNextId(prefix, bannersState.banners.map(item => item.banner_id)),
            created_at: bannerData.created_at || nowDateTime(),
            created_by: bannerData.created_by || ''
        });

        await callSheetsAPI('append', {
            range: SHEET_RANGE,
            values: [buildBannerRow(normalized)],
            spreadsheetType: 'products'
        });

        const newEntry = {
            ...normalized,
            _rowIndex: bannersState.banners.length + 2
        };
        bannersState.banners.push(newEntry);
        return newEntry;
    } catch (error) {
        console.error('❌ Помилка додавання банера:', error);
        throw error;
    }
}

export async function updateBanner(bannerId, updates = {}) {
    try {
        const entry = bannersState.banners.find(item => item.banner_id === bannerId);
        if (!entry) {
            throw new Error(`Банер ${bannerId} не знайдено`);
        }

        const merged = normalizeRecord({ ...entry, ...updates });
        await callSheetsAPI('update', {
            range: `${SHEET_NAME}!A${entry._rowIndex}:P${entry._rowIndex}`,
            values: [buildBannerRow(merged)],
            spreadsheetType: 'products'
        });

        Object.assign(entry, merged);
        return entry;
    } catch (error) {
        console.error('❌ Помилка оновлення банера:', error);
        throw error;
    }
}

export async function deleteBanner(bannerId) {
    try {
        const index = bannersState.banners.findIndex(item => item.banner_id === bannerId);
        if (index === -1) {
            throw new Error(`Банер ${bannerId} не знайдено`);
        }

        const entry = bannersState.banners[index];
        const rowIndex = entry._rowIndex;

        await callSheetsAPI('batchUpdateSpreadsheet', {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId: parseInt(SHEET_GID, 10),
                        dimension: 'ROWS',
                        startIndex: rowIndex - 1,
                        endIndex: rowIndex
                    }
                }
            }],
            spreadsheetType: 'products'
        });

        bannersState.banners.splice(index, 1);
        bannersState.banners.forEach(item => {
            if (item._rowIndex > rowIndex) item._rowIndex -= 1;
        });

        return true;
    } catch (error) {
        console.error('❌ Помилка видалення банера:', error);
        throw error;
    }
}
