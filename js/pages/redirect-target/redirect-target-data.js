// js/pages/redirect-target/redirect-target-data.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   REDIRECT TARGET — DATA                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН (viewless) — Завантаження та збереження даних API             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { redirectTargetState } from './redirect-target-state.js';
import { callSheetsAPI } from '../../utils/utils-api-client.js';
import { PRODUCTS_SPREADSHEET_ID as SPREADSHEET_ID } from '../../config/spreadsheet-config.js';

const SHEET_NAME = 'RedirectTarget';
const SHEET_GID = '1641646787';

export async function loadRedirects() {
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

        const parsedData = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        const rows = parsedData.data;

        if (!rows || rows.length === 0) {
            console.warn('⚠️ Немає даних в RedirectTarget');
            redirectTargetState.redirects = [];
            return redirectTargetState.redirects;
        }

        redirectTargetState.redirects = rows.map((row, index) => ({
            ...row,
            _rowIndex: index + 2
        }));

        redirectTargetState._dataLoaded = true;
        return redirectTargetState.redirects;
    } catch (error) {
        console.error('❌ Помилка завантаження редиректів:', error);
        throw error;
    }
}

export function getRedirects() {
    return redirectTargetState.redirects || [];
}

export async function updateRedirect(redirectId, updates) {
    try {
        const entry = redirectTargetState.redirects.find(e => e.redirect_id === redirectId);
        if (!entry) {
            throw new Error(`Редирект ${redirectId} не знайдено`);
        }

        const range = `${SHEET_NAME}!A${entry._rowIndex}:E${entry._rowIndex}`;
        const updatedRow = [
            entry.redirect_id,
            updates.redirect_in !== undefined ? updates.redirect_in : entry.redirect_in,
            updates.redirect_out !== undefined ? updates.redirect_out : entry.redirect_out,
            updates.redirect_target !== undefined ? updates.redirect_target : entry.redirect_target,
            updates.redirect_entity !== undefined ? updates.redirect_entity : entry.redirect_entity
        ];

        await callSheetsAPI('update', {
            range: range,
            values: [updatedRow],
            spreadsheetType: 'products'
        });

        Object.assign(entry, updates);
        return entry;
    } catch (error) {
        console.error('❌ Помилка оновлення редиректу:', error);
        throw error;
    }
}

export async function deleteRedirect(redirectId) {
    try {
        const redirectIndex = redirectTargetState.redirects.findIndex(e => e.redirect_id === redirectId);
        if (redirectIndex === -1) {
            throw new Error(`Редирект ${redirectId} не знайдено`);
        }

        const redirect = redirectTargetState.redirects[redirectIndex];
        const rowIndex = redirect._rowIndex;

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

        redirectTargetState.redirects.splice(redirectIndex, 1);
        redirectTargetState.redirects.forEach(item => {
            if (item._rowIndex > rowIndex) item._rowIndex -= 1;
        });

        return true;
    } catch (error) {
        console.error('❌ Помилка видалення редиректу:', error);
        throw error;
    }
}
