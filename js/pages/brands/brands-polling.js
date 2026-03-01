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

// ── Polling instance ──

const polling = createPolling({
    interval: 20_000,
    sources: [
        {
            name: 'brands',
            fetch: fetchBrands,
            getState: () => brandsState.brands,
            setState: () => { /* onChanged робить loadBrands() з правильним парсингом */ },
            fingerprint: (items) => items.map(b => b.brand_id).sort().join(','),
        },
        {
            name: 'brandLines',
            fetch: fetchLines,
            getState: () => brandsState.brandLines,
            setState: () => { /* onChanged робить loadBrandLines() з правильним парсингом */ },
            fingerprint: (items) => items.map(l => l.line_id).sort().join(','),
        },
    ],
    async onChanged() {
        console.log('🔄 Polling: виявлено зміни в брендах/лінійках');

        // Перезавантажити з правильним парсингом JSON полів
        await Promise.allSettled([loadBrands(), loadBrandLines()]);

        const { renderBrandsTable } = await import('./brands-table.js');
        const { runHook } = await import('./brands-plugins.js');
        const { showToast } = await import('../../components/feedback/toast.js');

        renderBrandsTable();
        runHook('onRender');
        showToast('Дані оновлено іншим користувачем', 'info');
    },
});

// ── Re-export ──

export const startPolling = polling.start;
export const stopPolling = polling.stop;
export const pausePolling = polling.pause;
export const resumePolling = polling.resume;
export const resetSnapshots = polling.resetSnapshots;
