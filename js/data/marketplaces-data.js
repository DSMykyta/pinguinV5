// js/data/marketplaces-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            SHARED DATA — МАРКЕТПЛЕЙСИ (Load + CRUD)                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Спільний data layer для маркетплейсів.
 * Імпортується з будь-якої сторінки: entities, products, brands, marketplaces.
 * Внутрішній стан — module-level масив.
 */

import { callSheetsAPI } from '../utils/utils-api-client.js';
import {
    SHEETS,
    hardDeleteRow,
    adjustRowIndices,
    generateId,
    getNextRowIndex,
    toSheetsBool
} from './data-helpers.js';

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL STATE
// ═══════════════════════════════════════════════════════════════════════════

let _marketplaces = [];

// ═══════════════════════════════════════════════════════════════════════════
// LOAD
// ═══════════════════════════════════════════════════════════════════════════

export async function loadMarketplaces() {
    try {
        const result = await callSheetsAPI('get', {
            range: `${SHEETS.MARKETPLACES}!A:G`,
            spreadsheetType: 'main'
        });

        if (!result || !Array.isArray(result) || result.length <= 1) {
            console.warn('Немає даних маркетплейсів');
            _marketplaces = [];
            return [];
        }

        const headers = result[0];
        const rows = result.slice(1);

        _marketplaces = rows.map((row, index) => {
            const obj = { _rowIndex: index + 2 };
            headers.forEach((header, i) => {
                obj[header] = row[i] || '';
            });

            if (!obj.id && obj.marketplace_id) obj.id = obj.marketplace_id;
            if (!obj.name && obj.display_name) obj.name = obj.display_name;
            if (!obj.slug && obj.marketplace_id) obj.slug = obj.marketplace_id;
            if (!obj.is_active && obj.state !== undefined) {
                obj.is_active = obj.state === 'TRUE' || obj.state === true || obj.state === 'true';
            }

            return obj;
        }).filter(item => item.id);

        return _marketplaces;
    } catch (error) {
        console.error('Помилка завантаження маркетплейсів:', error);
        _marketplaces = [];
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ADD
// ═══════════════════════════════════════════════════════════════════════════

export async function addMarketplace(data) {
    try {
        const newId = generateId('mp', _marketplaces);
        const timestamp = new Date().toISOString();

        const newRow = [
            newId,
            data.name || '',
            data.slug || '',
            toSheetsBool(data.is_active),
            data.field_schema || '{}',
            data.column_mapping || '{}',
            timestamp
        ];

        await callSheetsAPI('append', {
            range: `${SHEETS.MARKETPLACES}!A:G`,
            values: [newRow],
            spreadsheetType: 'main'
        });

        const newMarketplace = {
            _rowIndex: getNextRowIndex(_marketplaces),
            id: newId,
            name: data.name || '',
            slug: data.slug || '',
            is_active: toSheetsBool(data.is_active),
            field_schema: data.field_schema || '{}',
            column_mapping: data.column_mapping || '{}',
            created_at: timestamp
        };

        _marketplaces.push(newMarketplace);
        return newMarketplace;
    } catch (error) {
        console.error('Помилка додавання маркетплейсу:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════════════════

export async function updateMarketplace(id, updates) {
    try {
        const marketplace = _marketplaces.find(m => m.id === id);
        if (!marketplace) {
            throw new Error(`Маркетплейс ${id} не знайдено`);
        }

        const range = `${SHEETS.MARKETPLACES}!A${marketplace._rowIndex}:G${marketplace._rowIndex}`;

        const updatedRow = [
            marketplace.id,
            updates.name !== undefined ? updates.name : marketplace.name,
            updates.slug !== undefined ? updates.slug : marketplace.slug,
            toSheetsBool(updates.is_active !== undefined ? updates.is_active : marketplace.is_active),
            updates.field_schema !== undefined ? updates.field_schema : marketplace.field_schema,
            updates.column_mapping !== undefined ? updates.column_mapping : marketplace.column_mapping,
            marketplace.created_at
        ];

        await callSheetsAPI('update', {
            range: range,
            values: [updatedRow],
            spreadsheetType: 'main'
        });

        Object.assign(marketplace, updates);
        return marketplace;
    } catch (error) {
        console.error('Помилка оновлення маркетплейсу:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════════════════

export async function deleteMarketplace(id) {
    try {
        const index = _marketplaces.findIndex(m => m.id === id);
        if (index === -1) {
            throw new Error(`Маркетплейс ${id} не знайдено`);
        }

        const marketplace = _marketplaces[index];
        const rowIndex = marketplace._rowIndex;

        await hardDeleteRow('MARKETPLACES', rowIndex);
        _marketplaces.splice(index, 1);
        adjustRowIndices(_marketplaces, rowIndex);
    } catch (error) {
        console.error('Помилка видалення маркетплейсу:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// GETTER
// ═══════════════════════════════════════════════════════════════════════════

export function getMarketplaces() {
    return _marketplaces;
}

// ═══════════════════════════════════════════════════════════════════════════
// ЗАЛЕЖНОСТІ (для каскадних попереджень при видаленні)
// ═══════════════════════════════════════════════════════════════════════════

export function getMarketplaceDependencies(marketplaceId, { mpCategories, mpCharacteristics, mpOptions, mapCategories, mapCharacteristics, mapOptions }) {
    const cats = mpCategories.filter(c => c.marketplace_id === marketplaceId);
    const chars = mpCharacteristics.filter(c => c.marketplace_id === marketplaceId);
    const opts = mpOptions.filter(o => o.marketplace_id === marketplaceId);

    const catMappings = mapCategories.filter(m =>
        cats.some(c => c.id === m.mp_category_id || c.external_id === m.mp_category_id)
    );
    const charMappings = mapCharacteristics.filter(m =>
        chars.some(c => c.id === m.mp_characteristic_id || c.external_id === m.mp_characteristic_id)
    );
    const optMappings = mapOptions.filter(m =>
        opts.some(o => o.id === m.mp_option_id || o.external_id === m.mp_option_id)
    );

    return {
        mpCategories: cats.length,
        mpCharacteristics: chars.length,
        mpOptions: opts.length,
        catMappings: catMappings.length,
        charMappings: charMappings.length,
        optMappings: optMappings.length,
        totalMappings: catMappings.length + charMappings.length + optMappings.length
    };
}
