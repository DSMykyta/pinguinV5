// js/data/mappings-automap.js

/**
 * Automatic mapping by names.
 */

import { getCharacteristics, getOptions } from './entities-data.js';
import { getMpCharacteristics, getMpOptions } from './mp-data.js';
import { createCharacteristicMapping } from './mappings-characteristics.js';
import { createOptionMapping } from './mappings-options.js';

export async function autoMapCharacteristics(mpCharIds) {
    const results = {
        mapped: [],
        notFound: [],
        failed: []
    };

    const ownCharacteristics = getCharacteristics();
    const mpCharacteristics = getMpCharacteristics();

    for (const mpCharId of mpCharIds) {
        try {
            const mpChar = mpCharacteristics.find(c => c.id === mpCharId);
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
            console.error(`Помилка автомаппінгу ${mpCharId}:`, error);
            results.failed.push({ id: mpCharId, error: error.message });
        }
    }

    return results;
}

/**
 * Автоматичний маппінг MP опцій за назвою
 */
export async function autoMapOptions(mpOptionIds) {
    const results = {
        mapped: [],
        notFound: [],
        failed: []
    };

    const ownOptions = getOptions();
    const mpOptions = getMpOptions();

    for (const mpOptionId of mpOptionIds) {
        try {
            const mpOption = mpOptions.find(o => o.id === mpOptionId);
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
            console.error(`Помилка автомаппінгу ${mpOptionId}:`, error);
            results.failed.push({ id: mpOptionId, error: error.message });
        }
    }

    return results;
}
