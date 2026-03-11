// js/pages/entities/entities-polling.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                       ENTITIES POLLING                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  ПЛАГIН — Перiодичне опитування маппiнг-листiв кожнi 20 секунд         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createPolling } from '../../utils/utils-polling.js';
import { callSheetsAPI } from '../../utils/utils-api-client.js';
import {
    getMapCategories, getMapCharacteristics, getMapOptions,
    loadMapCategories, loadMapCharacteristics, loadMapOptions
} from '../../data/mappings-data.js';

let _state = null;

export function init(state) {
    _state = state;
    state.registerHook('onDataLoaded', () => {
        startPolling();
    }, { plugin: 'polling' });
}

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
// NOTE: mappings-data.js manages its own internal state.
// The polling fetches fresh data and compares with current getters.
// On change, it reloads via the official load functions.

const polling = createPolling({
    interval: 20_000,
    sources: [
        {
            name: 'mapCategories',
            fetch: () => fetchSheet('Mapper_Map_Categories'),
            getState: () => getMapCategories(),
            setState: (data) => {
                // Trigger official reload to update internal state in mappings-data.js
                loadMapCategories();
            },
        },
        {
            name: 'mapCharacteristics',
            fetch: () => fetchSheet('Mapper_Map_Characteristics'),
            getState: () => getMapCharacteristics(),
            setState: (data) => {
                loadMapCharacteristics();
            },
        },
        {
            name: 'mapOptions',
            fetch: () => fetchSheet('Mapper_Map_Options'),
            getState: () => getMapOptions(),
            setState: (data) => {
                loadMapOptions();
            },
        },
    ],
    async onChanged() {
        console.log('[Entities] Polling: виявлено змiни в маппiнгах');
        if (_state) {
            _state.runHook('onDataChanged');
        }
    },
});

// ── Re-export пiд старими iменами ──

export const startPolling = polling.start;
export const stopPolling = polling.stop;
export const pausePolling = polling.pause;
export const resumePolling = polling.resume;
export const resetSnapshots = polling.resetSnapshots;
