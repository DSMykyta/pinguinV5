// js/pages/marketplaces/marketplaces-import-wizard-data.js

/**
 * Data preparation for import-as-own wizard.
 */

import { getMpCategories, getMpCharacteristics, getMpOptions } from '../../data/mp-data.js';
import { wizardState } from './marketplaces-import-wizard-state.js';

export function getMpStats(mpId) {
    const cats = getMpCategories().filter(c => c.mp_id?.startsWith(`mp-${mpId}`) || c.marketplace_id === mpId);
    const chars = getMpCharacteristics().filter(c => c.mp_id?.startsWith(`mp-${mpId}`) || c.marketplace_id === mpId);
    return `${cats.length} категорій, ${chars.length} характеристик`;
}

export function loadMpData() {
    const mpId = wizardState.selectedMp?.id;
    if (!mpId) return;

    // Завантажуємо категорії MP
    wizardState.mpData.categories = getMpCategories().filter(cat => {
        // Фільтруємо по marketplace_id
        return cat.marketplace_id === mpId;
    }).map(cat => {
        let data = cat.data;
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) { data = {}; }
        }
        return {
            id: cat.id,
            mp_id: cat.mp_id,
            name: data?.name || cat.mp_id,
            parent_id: data?.parent_id || null
        };
    });

    // Завантажуємо характеристики MP
    wizardState.mpData.characteristics = getMpCharacteristics().filter(char => {
        return char.marketplace_id === mpId;
    }).map(char => {
        let data = char.data;
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) { data = {}; }
        }
        // category_id може бути списком через кому
        const categoryIds = (data?.category_id || '').split(',').map(id => id.trim()).filter(Boolean);
        return {
            id: char.id,
            mp_id: char.mp_id,
            name: data?.name || char.mp_id,
            type: data?.type || 'text',
            category_ids: categoryIds,
            is_global: data?.is_global === true || String(data?.is_global).toLowerCase() === 'true'
        };
    });

    // Завантажуємо опції MP
    wizardState.mpData.options = getMpOptions().filter(opt => {
        return opt.marketplace_id === mpId;
    }).map(opt => {
        let data = opt.data;
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) { data = {}; }
        }
        return {
            id: opt.id,
            mp_id: opt.mp_id,
            name: data?.name || data?.value || opt.mp_id,
            characteristic_id: data?.characteristic_id
        };
    });
}
