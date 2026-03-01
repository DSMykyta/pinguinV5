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

import { createPolling } from '../../utils/polling.js';
import { brandsState } from './brands-state.js';
import { loadBrands } from './brands-data.js';
import { loadBrandLines } from './lines-data.js';
import { callSheetsAPI } from '../../utils/api-client.js';
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

function brandFp(b) {
    const alt = Array.isArray(b.names_alt) ? JSON.stringify(b.names_alt) : (b.names_alt || '');
    const links = Array.isArray(b.brand_links) ? JSON.stringify(b.brand_links) : (b.brand_links || '');
    return `${b.brand_id}|${b.name_uk}|${alt}|${b.country_option_id}|${b.brand_status}|${links}|${b.brand_logo_url}`;
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
    if (event.data?.type !== 'brands-changed') return;
    console.log('📡 BroadcastChannel: отримано сповіщення про зміни');
    await refreshData();
    const { refreshBrandModal } = await import('./brands-crud.js');
    const { showToast } = await import('../../components/feedback/toast.js');
    refreshBrandModal();
    showToast('Дані оновлено іншим користувачем', 'info');
    polling.resetSnapshots();
};

/**
 * Сповістити інші вкладки про збереження
 */
export function notifyChange() {
    channel.postMessage({ type: 'brands-changed', timestamp: Date.now() });
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
