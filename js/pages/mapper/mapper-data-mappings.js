// js/pages/mapper/mapper-data-mappings.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║           MAPPER DATA - MAPPINGS CRUD & AUTOMAP                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * CRUD операції для маппінгів (прив'язка MP сутностей до власних).
 * Перевірки (isMapped), batch операції, автоматичний маппінг.
 */

import { mapperState } from './mapper-state.js';
import { callSheetsAPI } from '../../utils/api-client.js';
import { pausePolling, resumePolling } from './mapper-polling.js';
import {
    SHEETS,
    hardDeleteRow,
    adjustRowIndices,
    generateId,
    getNextRowIndex
} from './mapper-data-helpers.js';
import { getCharacteristics, getOptions } from './mapper-data-own.js';

// ═══════════════════════════════════════════════════════════════════════════
// КАТЕГОРІЇ — MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Перевірити чи MP категорія замаплена
 */
export function isMpCategoryMapped(mpCatId) {
    const mpCat = mapperState.mpCategories.find(c => c.id === mpCatId);
    const externalId = mpCat?.external_id;

    const inMappingTable = mapperState.mapCategories.some(m =>
        m.mp_category_id === mpCatId || m.mp_category_id === externalId
    );
    if (inMappingTable) return true;

    if (mpCat) {
        try {
            const data = typeof mpCat.data === 'string' ? JSON.parse(mpCat.data || '{}') : (mpCat.data || {});
            if (data.our_category_id) return true;
        } catch { /* невалідний JSON — ігноруємо */ }
    }

    return false;
}

/**
 * Отримати всі MP категорії, які замаплені на власну категорію
 */
export function getMappedMpCategories(ownCatId) {
    const result = [];
    const addedIds = new Set();

    const mappings = mapperState.mapCategories.filter(m =>
        m.category_id === ownCatId
    );
    mappings.forEach(mapping => {
        const mpCat = mapperState.mpCategories.find(c =>
            c.id === mapping.mp_category_id || c.external_id === mapping.mp_category_id
        );
        if (mpCat && !addedIds.has(mpCat.id)) {
            result.push({ ...mpCat, _mappingId: mapping.id, _source: 'new' });
            addedIds.add(mpCat.id);
        }
    });

    mapperState.mpCategories.forEach(mpCat => {
        if (addedIds.has(mpCat.id)) return;
        try {
            const data = typeof mpCat.data === 'string' ? JSON.parse(mpCat.data || '{}') : (mpCat.data || {});
            if (data.our_category_id === ownCatId) {
                result.push({ ...mpCat, _source: 'legacy' });
                addedIds.add(mpCat.id);
            }
        } catch { /* невалідний JSON — ігноруємо */ }
    });

    return result;
}

/**
 * Створити маппінг категорії
 */
export async function createCategoryMapping(ownCatId, mpCatId) {
    pausePolling();
    try {
        const existing = mapperState.mapCategories.find(m =>
            m.category_id === ownCatId && m.mp_category_id === mpCatId
        );
        if (existing) {
            return existing;
        }

        const newId = generateId('map-cat', mapperState.mapCategories);
        const timestamp = new Date().toISOString();

        await callSheetsAPI('append', {
            range: `${SHEETS.MAP_CATEGORIES}!A:D`,
            values: [[newId, ownCatId, mpCatId, timestamp]],
            spreadsheetType: 'main'
        });

        const newMapping = {
            id: newId,
            category_id: ownCatId,
            mp_category_id: mpCatId,
            created_at: timestamp,
            _rowIndex: getNextRowIndex(mapperState.mapCategories)
        };
        mapperState.mapCategories.push(newMapping);

        return newMapping;
    } catch (error) {
        console.error('❌ Помилка створення маппінгу категорії:', error);
        throw error;
    } finally {
        resumePolling();
    }
}

/**
 * Видалити маппінг категорії
 */
export async function deleteCategoryMapping(mappingId) {
    pausePolling();
    try {
        const mapping = mapperState.mapCategories.find(m => m.id === mappingId);
        if (!mapping) {
            throw new Error(`Маппінг ${mappingId} не знайдено`);
        }

        const rowIndex = mapping._rowIndex;
        await hardDeleteRow('MAP_CATEGORIES', rowIndex);

        const index = mapperState.mapCategories.findIndex(m => m.id === mappingId);
        if (index !== -1) {
            mapperState.mapCategories.splice(index, 1);
        }
        adjustRowIndices(mapperState.mapCategories, rowIndex);

    } catch (error) {
        console.error('❌ Помилка видалення маппінгу категорії:', error);
        throw error;
    } finally {
        resumePolling();
    }
}

/**
 * Видалити маппінг категорії по ID MP категорії
 */
export async function deleteCategoryMappingByMpId(mpCatId) {
    const mapping = mapperState.mapCategories.find(m => m.mp_category_id === mpCatId);
    if (mapping) {
        await deleteCategoryMapping(mapping.id);
    }
}

/**
 * Batch створення маппінгів для кількох MP категорій
 */
export async function batchCreateCategoryMapping(mpCatIds, ownCatId) {
    pausePolling();
    try {
        const results = { success: [], failed: [] };

        for (const mpCatId of mpCatIds) {
            try {
                await createCategoryMapping(ownCatId, mpCatId);
                results.success.push(mpCatId);
            } catch (error) {
                console.error(`❌ Помилка маппінгу ${mpCatId}:`, error);
                results.failed.push({ id: mpCatId, error: error.message });
            }
        }

        return results;
    } finally {
        resumePolling();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ХАРАКТЕРИСТИКИ — MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Перевірити чи MP характеристика замаплена
 */
export function isMpCharacteristicMapped(mpCharId) {
    const mpChar = mapperState.mpCharacteristics.find(c => c.id === mpCharId);
    const externalId = mpChar?.external_id;

    const inNewTable = mapperState.mapCharacteristics.some(m =>
        m.mp_characteristic_id === mpCharId || m.mp_characteristic_id === externalId
    );
    if (inNewTable) return true;

    if (mpChar) {
        try {
            const data = typeof mpChar.data === 'string' ? JSON.parse(mpChar.data || '{}') : (mpChar.data || {});
            if (data.our_char_id) return true;
        } catch { /* невалідний JSON — ігноруємо */ }
    }

    return false;
}

/**
 * Отримати всі MP характеристики замаплені до власної
 */
export function getMappedMpCharacteristics(ownCharId) {
    const result = [];
    const addedIds = new Set();

    const mappings = mapperState.mapCharacteristics.filter(m =>
        m.characteristic_id === ownCharId
    );
    mappings.forEach(mapping => {
        const mpChar = mapperState.mpCharacteristics.find(c =>
            c.id === mapping.mp_characteristic_id || c.external_id === mapping.mp_characteristic_id
        );
        if (mpChar && !addedIds.has(mpChar.id)) {
            result.push({ ...mpChar, _mappingId: mapping.id, _source: 'new' });
            addedIds.add(mpChar.id);
        }
    });

    mapperState.mpCharacteristics.forEach(mpChar => {
        if (addedIds.has(mpChar.id)) return;
        try {
            const data = typeof mpChar.data === 'string' ? JSON.parse(mpChar.data || '{}') : (mpChar.data || {});
            if (data.our_char_id === ownCharId) {
                result.push({ ...mpChar, _source: 'legacy' });
                addedIds.add(mpChar.id);
            }
        } catch { /* невалідний JSON — ігноруємо */ }
    });

    return result;
}

/**
 * Отримати маппінг для MP характеристики
 */
export function getCharacteristicMappingByMpId(mpCharId) {
    return mapperState.mapCharacteristics.find(m => m.mp_characteristic_id === mpCharId);
}

/**
 * Створити маппінг характеристики
 */
export async function createCharacteristicMapping(ownCharId, mpCharId) {
    pausePolling();
    try {
        const existing = mapperState.mapCharacteristics.find(m =>
            m.characteristic_id === ownCharId && m.mp_characteristic_id === mpCharId
        );
        if (existing) {
            return existing;
        }

        const newId = generateId('map-char', mapperState.mapCharacteristics);
        const timestamp = new Date().toISOString();

        await callSheetsAPI('append', {
            range: `${SHEETS.MAP_CHARACTERISTICS}!A:D`,
            values: [[newId, ownCharId, mpCharId, timestamp]],
            spreadsheetType: 'main'
        });

        const newMapping = {
            id: newId,
            characteristic_id: ownCharId,
            mp_characteristic_id: mpCharId,
            created_at: timestamp,
            _rowIndex: getNextRowIndex(mapperState.mapCharacteristics)
        };
        mapperState.mapCharacteristics.push(newMapping);

        return newMapping;
    } catch (error) {
        console.error('❌ Помилка створення маппінгу:', error);
        throw error;
    } finally {
        resumePolling();
    }
}

/**
 * Видалити маппінг характеристики
 */
export async function deleteCharacteristicMapping(mappingId) {
    pausePolling();
    try {
        const mapping = mapperState.mapCharacteristics.find(m => m.id === mappingId);
        if (!mapping) {
            throw new Error(`Маппінг ${mappingId} не знайдено`);
        }

        const rowIndex = mapping._rowIndex;
        await hardDeleteRow('MAP_CHARACTERISTICS', rowIndex);

        const index = mapperState.mapCharacteristics.findIndex(m => m.id === mappingId);
        if (index !== -1) {
            mapperState.mapCharacteristics.splice(index, 1);
        }
        adjustRowIndices(mapperState.mapCharacteristics, rowIndex);

    } catch (error) {
        console.error('❌ Помилка видалення маппінгу:', error);
        throw error;
    } finally {
        resumePolling();
    }
}

/**
 * Видалити маппінг характеристики за MP ID
 */
export async function deleteCharacteristicMappingByMpId(mpCharId) {
    const mapping = mapperState.mapCharacteristics.find(m => m.mp_characteristic_id === mpCharId);
    if (mapping) {
        await deleteCharacteristicMapping(mapping.id);
    }
}

/**
 * Batch створення маппінгів для кількох MP характеристик
 */
export async function batchCreateCharacteristicMapping(mpCharIds, ownCharId) {
    pausePolling();
    try {
        const results = { success: [], failed: [] };

        for (const mpCharId of mpCharIds) {
            try {
                await createCharacteristicMapping(ownCharId, mpCharId);
                results.success.push(mpCharId);
            } catch (error) {
                console.error(`❌ Помилка маппінгу ${mpCharId}:`, error);
                results.failed.push({ id: mpCharId, error: error.message });
            }
        }

        return results;
    } finally {
        resumePolling();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ОПЦІЇ — MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Перевірити чи MP опція замаплена
 */
export function isMpOptionMapped(mpOptionId) {
    const mpOption = mapperState.mpOptions.find(o => o.id === mpOptionId);
    const externalId = mpOption?.external_id;

    const inNewTable = mapperState.mapOptions.some(m =>
        m.mp_option_id === mpOptionId || m.mp_option_id === externalId
    );
    if (inNewTable) return true;

    if (mpOption) {
        try {
            const data = typeof mpOption.data === 'string' ? JSON.parse(mpOption.data || '{}') : (mpOption.data || {});
            if (data.our_option_id) return true;
        } catch { /* невалідний JSON — ігноруємо */ }
    }

    return false;
}

/**
 * Отримати всі MP опції замаплені до власної
 */
export function getMappedMpOptions(ownOptionId) {
    const result = [];
    const addedIds = new Set();

    const mappings = mapperState.mapOptions.filter(m =>
        m.option_id === ownOptionId
    );
    mappings.forEach(mapping => {
        const mpOption = mapperState.mpOptions.find(o =>
            o.id === mapping.mp_option_id || o.external_id === mapping.mp_option_id
        );
        if (mpOption && !addedIds.has(mpOption.id)) {
            result.push({ ...mpOption, _mappingId: mapping.id, _source: 'new' });
            addedIds.add(mpOption.id);
        }
    });

    mapperState.mpOptions.forEach(mpOption => {
        if (addedIds.has(mpOption.id)) return;
        try {
            const data = typeof mpOption.data === 'string' ? JSON.parse(mpOption.data || '{}') : (mpOption.data || {});
            if (data.our_option_id === ownOptionId) {
                result.push({ ...mpOption, _source: 'legacy' });
                addedIds.add(mpOption.id);
            }
        } catch { /* невалідний JSON — ігноруємо */ }
    });

    return result;
}

/**
 * Отримати маппінг для MP опції
 */
export function getOptionMappingByMpId(mpOptionId) {
    return mapperState.mapOptions.find(m => m.mp_option_id === mpOptionId);
}

/**
 * Створити маппінг опції
 */
export async function createOptionMapping(ownOptionId, mpOptionId) {
    pausePolling();
    try {
        const existing = mapperState.mapOptions.find(m =>
            m.option_id === ownOptionId && m.mp_option_id === mpOptionId
        );
        if (existing) {
            return existing;
        }

        const newId = generateId('map-opt', mapperState.mapOptions);
        const timestamp = new Date().toISOString();

        await callSheetsAPI('append', {
            range: `${SHEETS.MAP_OPTIONS}!A:D`,
            values: [[newId, ownOptionId, mpOptionId, timestamp]],
            spreadsheetType: 'main'
        });

        const newMapping = {
            id: newId,
            option_id: ownOptionId,
            mp_option_id: mpOptionId,
            created_at: timestamp,
            _rowIndex: getNextRowIndex(mapperState.mapOptions)
        };
        mapperState.mapOptions.push(newMapping);

        return newMapping;
    } catch (error) {
        console.error('❌ Помилка створення маппінгу опції:', error);
        throw error;
    } finally {
        resumePolling();
    }
}

/**
 * Видалити маппінг опції
 */
export async function deleteOptionMapping(mappingId) {
    pausePolling();
    try {
        const mapping = mapperState.mapOptions.find(m => m.id === mappingId);
        if (!mapping) {
            throw new Error(`Маппінг ${mappingId} не знайдено`);
        }

        const rowIndex = mapping._rowIndex;
        await hardDeleteRow('MAP_OPTIONS', rowIndex);

        const index = mapperState.mapOptions.findIndex(m => m.id === mappingId);
        if (index !== -1) {
            mapperState.mapOptions.splice(index, 1);
        }
        adjustRowIndices(mapperState.mapOptions, rowIndex);

    } catch (error) {
        console.error('❌ Помилка видалення маппінгу опції:', error);
        throw error;
    } finally {
        resumePolling();
    }
}

/**
 * Видалити маппінг опції за MP ID
 */
export async function deleteOptionMappingByMpId(mpOptionId) {
    const mapping = mapperState.mapOptions.find(m => m.mp_option_id === mpOptionId);
    if (mapping) {
        await deleteOptionMapping(mapping.id);
    }
}

/**
 * Batch створення маппінгів для кількох MP опцій
 */
export async function batchCreateOptionMapping(mpOptionIds, ownOptionId) {
    pausePolling();
    try {
        const results = { success: [], failed: [] };

        for (const mpOptionId of mpOptionIds) {
            try {
                await createOptionMapping(ownOptionId, mpOptionId);
                results.success.push(mpOptionId);
            } catch (error) {
                console.error(`❌ Помилка маппінгу ${mpOptionId}:`, error);
                results.failed.push({ id: mpOptionId, error: error.message });
            }
        }

        return results;
    } finally {
        resumePolling();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTOMAP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Автоматичний маппінг MP характеристик за назвою
 */
export async function autoMapCharacteristics(mpCharIds) {
    pausePolling();
    try {
        const results = {
            mapped: [],
            notFound: [],
            failed: []
        };

        const ownCharacteristics = getCharacteristics();

        for (const mpCharId of mpCharIds) {
            try {
                const mpChar = mapperState.mpCharacteristics.find(c => c.id === mpCharId);
                if (!mpChar) {
                    results.failed.push({ id: mpCharId, error: 'MP характеристику не знайдено' });
                    continue;
                }

                const mpData = typeof mpChar.data === 'string' ? JSON.parse(mpChar.data) : (mpChar.data || {});
                const mpName = (mpData.name || '').toLowerCase().trim();

                if (!mpName) {
                    results.notFound.push({ id: mpCharId, name: '(пусто)' });
                    continue;
                }

                const ownChar = ownCharacteristics.find(c => {
                    const ownName = (c.name_ua || '').toLowerCase().trim();
                    return ownName === mpName;
                });

                if (ownChar) {
                    await createCharacteristicMapping(ownChar.id, mpCharId);
                    results.mapped.push({ mpId: mpCharId, ownId: ownChar.id, name: mpName });
                } else {
                    results.notFound.push({ id: mpCharId, name: mpName });
                }
            } catch (error) {
                console.error(`❌ Помилка автомаппінгу ${mpCharId}:`, error);
                results.failed.push({ id: mpCharId, error: error.message });
            }
        }

        return results;
    } finally {
        resumePolling();
    }
}

/**
 * Автоматичний маппінг MP опцій за назвою
 */
export async function autoMapOptions(mpOptionIds) {
    pausePolling();
    try {
        const results = {
            mapped: [],
            notFound: [],
            failed: []
        };

        const ownOptions = getOptions();

        for (const mpOptionId of mpOptionIds) {
            try {
                const mpOption = mapperState.mpOptions.find(o => o.id === mpOptionId);
                if (!mpOption) {
                    results.failed.push({ id: mpOptionId, error: 'MP опцію не знайдено' });
                    continue;
                }

                const mpData = typeof mpOption.data === 'string' ? JSON.parse(mpOption.data) : (mpOption.data || {});
                const mpName = (mpData.name || '').toLowerCase().trim();

                if (!mpName) {
                    results.notFound.push({ id: mpOptionId, name: '(пусто)' });
                    continue;
                }

                const ownOption = ownOptions.find(o => {
                    const ownName = (o.value_ua || '').toLowerCase().trim();
                    return ownName === mpName;
                });

                if (ownOption) {
                    await createOptionMapping(ownOption.id, mpOptionId);
                    results.mapped.push({ mpId: mpOptionId, ownId: ownOption.id, name: mpName });
                } else {
                    results.notFound.push({ id: mpOptionId, name: mpName });
                }
            } catch (error) {
                console.error(`❌ Помилка автомаппінгу ${mpOptionId}:`, error);
                results.failed.push({ id: mpOptionId, error: error.message });
            }
        }

        return results;
    } finally {
        resumePolling();
    }
}
