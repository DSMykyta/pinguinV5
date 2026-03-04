// js/pages/mapper/mapper-polling.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                       MAPPER POLLING                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Періодичне опитування маппінг-листів кожні 20 секунд      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createPolling } from '../../_utils/polling.js';
import { mapperState } from './mapper-state.js';
import { callSheetsAPI } from '../../_utils/api-client.js';

// ── Fetch helper ──

async function fetchSheet(sheetName) {
    const result = await callSheetsAPI('get', {
        range: `${sheetName}!A:D`,
        spreadsheetType: 'main'
    });

    if (!result || !Array.isArray(result) || result.length <= 1) return [];

    const headers = result[0];
    return result.slice(1).map((row, index) => {
        const obj = { _rowIndex: index + 2 };
        headers.forEach((header, i) => { obj[header] = row[i] || ''; });
        return obj;
    }).filter(item => item.id);
}

// ── Polling instance ──

const polling = createPolling({
    interval: 20_000,
    sources: [
        {
            name: 'mapCategories',
            fetch: () => fetchSheet('Mapper_Map_Categories'),
            getState: () => mapperState.mapCategories,
            setState: (data) => { mapperState.mapCategories = data; },
        },
        {
            name: 'mapCharacteristics',
            fetch: () => fetchSheet('Mapper_Map_Characteristics'),
            getState: () => mapperState.mapCharacteristics,
            setState: (data) => { mapperState.mapCharacteristics = data; },
        },
        {
            name: 'mapOptions',
            fetch: () => fetchSheet('Mapper_Map_Options'),
            getState: () => mapperState.mapOptions,
            setState: (data) => { mapperState.mapOptions = data; },
        },
    ],
    async onChanged() {
        console.log('🔄 Polling: виявлено зміни в маппінгах');
        const { renderCurrentTab, invalidateLookupCaches } = await import('./mapper-table.js');
        invalidateLookupCaches();
        renderCurrentTab();
    },
});

// ── Re-export під старими іменами ──

export const startPolling = polling.start;
export const stopPolling = polling.stop;
export const pausePolling = polling.pause;
export const resumePolling = polling.resume;
export const resetSnapshots = polling.resetSnapshots;
