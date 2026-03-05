// js/pages/redirect-target/redirect-target-data.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   REDIRECT TARGET — DATA                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН (viewless) — Завантаження та збереження даних API             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { redirectTargetState } from './redirect-target-state.js';
import { callSheetsAPI } from '../../utils/api-client.js';
import { MAIN_SPREADSHEET_ID as SPREADSHEET_ID } from '../../config/spreadsheet-config.js';

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
            spreadsheetType: 'main'
        });

        Object.assign(entry, updates);
        return entry;
    } catch (error) {
        console.error('❌ Помилка оновлення редиректу:', error);
        throw error;
    }
}