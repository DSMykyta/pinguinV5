// js/pages/brands/brands-polling.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                       BRANDS POLLING                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Періодичне опитування Brands та BrandLines кожні 20 сек   ║
 * ║                                                                          ║
 * ║  Виявляє зміни зроблені іншими користувачами:                           ║
 * ║  ├── Оновлює стейт (brandsState.brands / brandLines)                   ║
 * ║  ├── Перерендерює таблиці                                               ║
 * ║  └── Показує toast повідомлення                                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createPolling } from '../../utils/utils-polling.js';
import { brandsState } from './brands-state.js';
import { loadBrands } from './brands-data.js';
import { loadBrandLines } from './lines-data.js';
import { callSheetsAPI } from '../../utils/utils-api-client.js';
import { MAIN_SPREADSHEET_ID } from '../../config/spreadsheet-config.js';

// ── Fetch helpers (без побічних ефектів — тільки повертають дані) ──

const BRANDS_GID = '653695455';
const LINES_SHEET = 'BrandLines';

async function fetchBrands() {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${MAIN_SPREADSHEET_ID}/export?format=csv&gid=${BRANDS_GID}`;
    const response = await fetch(csvUrl);
    if (!response.ok) return [];

    const csvText = await response.text();
    if (typeof Papa === 'undefined') return [];

    const { data } = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    if (!data || data.length === 0) return [];

    return data.map((row, i) => ({
        brand_id: row.brand_id || '',
        name_uk: row.name_uk || '',
        names_alt: row.names_alt || '',
        country_option_id: row.country_option_id || '',
        brand_text: row.brand_text || '',
        brand_status: row.brand_status || 'active',
        brand_links: row.brand_links || '',
        mapper_option_id: row.mapper_option_id || '',
        brand_logo_url: row.brand_logo_url || '',
        _rowIndex: i + 2,
    }));
}

async function fetchLines() {
    const result = await callSheetsAPI('get', {
        range: `${LINES_SHEET}!A:D`,
        spreadsheetType: 'main',
    });

    if (!result || !Array.isArray(result) || result.length <= 1) return [];

    return result.slice(1).map((row, i) => ({
        line_id: row[0] || '',
        brand_id: row[1] || '',
        name_uk: row[2] || '',
        line_logo_url: row[3] || '',
        _rowIndex: i + 2,
    }));
}

// ── Fingerprint helpers ──
// Серіалізує всі поля запису в один рядок для порівняння.
// Працює і з raw strings (з fetch), і з парсеними масивами (зі стейту).

function normalizeJson(val) {
    if (Array.isArray(val)) return JSON.stringify(val);
    if (typeof val === 'string' && val.trim().startsWith('[')) {
        try { return JSON.stringify(JSON.parse(val)); } catch { /* ignore */ }
    }
    return val || '';
}

function brandFp(b) {
    return `${b.brand_id}|${b.name_uk}|${normalizeJson(b.names_alt)}|${b.country_option_id}|${b.brand_status}|${normalizeJson(b.brand_links)}|${b.brand_logo_url}`;
}

function lineFp(l) {
    return `${l.line_id}|${l.brand_id}|${l.name_uk}|${l.line_logo_url}`;
}

function contentFingerprint(items, itemFp) {
    return items.map(itemFp).sort().join('\n');
}

// ── Refresh helpers ──

async function refreshData() {
    await Promise.allSettled([loadBrands(), loadBrandLines()]);
    const { renderBrandsTable } = await import('./brands-table.js');
    const { runHook } = await import('./brands-plugins.js');
    renderBrandsTable();
    runHook('onRender');
}

// ── BroadcastChannel — миттєве сповіщення інших вкладок (тільки після збереження) ──

const channel = new BroadcastChannel('brands-changes');

channel.onmessage = async (event) => {
    const type = event.data?.type;

    // Видалення бренду — закрити модал якщо відкритий
    if (type === 'brand-deleted') {
        await refreshData();
        const { getCurrentBrandId } = await import('./brands-crud.js');
        const { closeModal } = await import('../../components/modal/modal-main.js');
        const { showToast } = await import('../../components/feedback/toast.js');
        const openBrandId = getCurrentBrandId();
        if (openBrandId && openBrandId === event.data.brandId) {
            closeModal();
            showToast('Бренд видалено іншим користувачем', 'info');
        }
        polling.resetSnapshots();
        return;
    }

    // Оновлення бренду
    if (type !== 'brands-changed') return;
    console.log('📡 BroadcastChannel: отримано сповіщення про зміни');
    await refreshData();

    const { refreshBrandModal, getCurrentBrandId } = await import('./brands-crud.js');
    const changedBrandId = event.data.brandId;
    const openBrandId = getCurrentBrandId();

    // Оновити модал тільки якщо відкритий той самий бренд
    // (тост + undo показується всередині refreshBrandModal)
    if (openBrandId && changedBrandId && openBrandId === changedBrandId) {
        refreshBrandModal();
    }

    polling.resetSnapshots();
};

/**
 * Сповістити інші вкладки про збереження
 * @param {string} [brandId] — ID бренду що змінився
 */
export function notifyChange(brandId) {
    channel.postMessage({ type: 'brands-changed', brandId, timestamp: Date.now() });
}

/**
 * Сповістити інші вкладки про видалення бренду
 * @param {string} brandId — ID видаленого бренду
 */
export function notifyDelete(brandId) {
    channel.postMessage({ type: 'brand-deleted', brandId, timestamp: Date.now() });
}

// ── Polling instance ──

const polling = createPolling({
    interval: 20_000,
    sources: [
        {
            name: 'brands',
            fetch: fetchBrands,
            getState: () => brandsState.brands,
            setState: () => { /* onChanged робить loadBrands() з правильним парсингом */ },
            fingerprint: (items) => contentFingerprint(items, brandFp),
        },
        {
            name: 'brandLines',
            fetch: fetchLines,
            getState: () => brandsState.brandLines,
            setState: () => { /* onChanged робить loadBrandLines() з правильним парсингом */ },
            fingerprint: (items) => contentFingerprint(items, lineFp),
        },
    ],
    async onChanged() {
        console.log('🔄 Polling: виявлено зміни в брендах/лінійках');
        await refreshData();
    },
});

// ── Re-export ──

export const startPolling = polling.start;
export const stopPolling = polling.stop;
export const pausePolling = polling.pause;
export const resumePolling = polling.resume;
export const resetSnapshots = polling.resetSnapshots;
