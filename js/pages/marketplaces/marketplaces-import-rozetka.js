// js/pages/marketplaces/marketplaces-import-rozetka.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              MARKETPLACES - IMPORT ADAPTER: ROZETKA                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { showToast } from '../../components/feedback/toast.js';
import { registerImportAdapter } from './marketplaces-import.js';

/**
 * Нормалізує значення is_global до 'TRUE' або 'FALSE'
 */
function normalizeIsGlobal(value) {
    if (value === true || value === 'TRUE') return 'TRUE';
    const strVal = String(value || '').toLowerCase().trim();
    const trueValues = ['true', '1', 'так', 'yes', '+', 'да'];
    return trueValues.includes(strVal) ? 'TRUE' : 'FALSE';
}

/**
 * Нормалізація ключів Rozetka з українських назв колонок CSV у стандартні англійські
 */
function normalizeRozetkaData(data) {
    const keyMap = {
        'ID параметра': null,
        'Назва параметра': 'char_name',
        'Тип параметра': 'type',
        'Тип фільтра': 'filter_type',
        'Одиниця вимірювання': 'unit',
        'Одиниця виміру': 'unit',
        'Наскрізниий параметр': 'is_global',
        'Наскрізний параметр': 'is_global',
        'ID значення': null,
        'Назва значення': null,
    };

    for (const [origKey, newKey] of Object.entries(keyMap)) {
        if (!(origKey in data)) continue;
        if (newKey) {
            data[newKey] = data[origKey];
        }
        delete data[origKey];
    }

    if (data.char_name && data.name && data.char_name === data.name) {
        delete data.char_name;
    }

    if (data.is_global !== undefined) {
        data.is_global = normalizeIsGlobal(data.is_global);
    }
}

/**
 * Парсинг категорії з назви файлу та першого рядка
 */
function parseCategory(fileName, rawData) {
    const match = fileName.match(/category_report_(\d+)/i);
    const categoryId = match ? match[1] : null;
    const categoryName = rawData[0]?.[0] || '';

    return {
        id: categoryId,
        name: categoryName.trim()
    };
}

/**
 * Показати інформацію про категорію
 */
function showCategoryInfo(category, fileName) {
    const filenameEl = document.getElementById('mapper-import-filename');
    if (!filenameEl) return;

    const existingInfo = document.getElementById('adapter-category-info');
    if (existingInfo) existingInfo.remove();

    const infoEl = document.createElement('div');
    infoEl.id = 'adapter-category-info';
    infoEl.style.textAlign = 'center';

    if (fileName) {
        filenameEl.textContent = '';
        infoEl.innerHTML += `<h3>${fileName}</h3>`;
    }

    if (category) {
        const { id, name } = category;
        infoEl.innerHTML += `<h2>Категорія: ${name || 'Не визначено'} ${id ? `(ID: ${id})` : ''}</h2>`;
    }

    filenameEl.insertAdjacentElement('afterend', infoEl);
}

/**
 * Імпорт категорії з файлу (якщо ще не існує)
 */
async function importCategory(category, marketplaceId) {
    if (!category?.id || !category?.name) return;

    const { callSheetsAPI } = await import('../../utils/utils-api-client.js');
    const { loadMpCategories, getMpCategories } = await import('../../data/mp-data.js');
    await loadMpCategories();

    const existingCats = getMpCategories();
    const alreadyExists = existingCats.some(c =>
        c.marketplace_id === marketplaceId && c.external_id === category.id
    );

    if (alreadyExists) return;

    const timestamp = new Date().toISOString();
    const uniqueId = `mpc-${marketplaceId}-cat-${category.id}`;

    await callSheetsAPI('append', {
        range: 'Mapper_MP_Categories!A:G',
        values: [[
            uniqueId,
            marketplaceId,
            category.id,
            'import',
            JSON.stringify({ id: category.id, name: category.name }),
            timestamp,
            timestamp
        ]],
        spreadsheetType: 'main'
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// АДАПТЕР
// ═══════════════════════════════════════════════════════════════════════════

const rozetkaAdapter = {
    match(marketplace) {
        return marketplace.slug?.toLowerCase() === 'rozetka' ||
            marketplace.name?.toLowerCase().includes('rozetka');
    },

    getConfig() {
        return {
            dataType: 'adapter_pack',
            headerRow: 2,
            hideDataTypeSelect: true,
            hideHeaderRowSelect: true,
            hideMappingUI: true,
        };
    },

    getSystemFields() {
        return [
            { key: 'char_id', label: 'ID характеристики', required: true },
            { key: 'char_name', label: 'Назва характеристики', required: true },
            { key: 'char_type', label: 'Тип параметра', required: false },
            { key: 'char_filter_type', label: 'Тип фільтра', required: false },
            { key: 'char_unit', label: 'Одиниця виміру', required: false },
            { key: 'char_is_global', label: 'Наскрізний параметр', required: false },
            { key: 'option_id', label: 'ID опції/значення', required: false },
            { key: 'option_name', label: 'Назва опції/значення', required: false }
        ];
    },

    onFileLoaded(file, rawData, importState) {
        const category = parseCategory(file.name, rawData);
        importState._adapterData = { category };

        const headerRow = 2;
        importState.rawData = rawData.map((row, i) => {
            if (i < headerRow) return row;
            const optId = String(row[5] || '').trim();
            const optName = String(row[6] || '').trim();
            if (optId === 'N/D' || optName === 'N/D') {
                const cleaned = [...row];
                cleaned[5] = '';
                cleaned[6] = '';
                return cleaned;
            }
            return row;
        });

        showCategoryInfo(category, file.name);
        showToast(`Файл Rozetka прочитано: ${rawData.length - 2} записів`, 'success');
    },

    getFixedMapping() {
        return {
            char_id: 0,
            char_name: 1,
            char_type: 2,
            char_filter_type: 3,
            char_unit: 4,
            option_id: 5,
            option_name: 6,
            char_is_global: 7
        };
    },

    getColumnPatterns() {
        return {
            char_id: ['id параметра', 'id характеристики', 'характеристика id', 'attr_id', 'attribute_id', 'characteristic_id', 'param_id', 'ідентифікатор параметра'],
            char_name: ['назва параметра', 'назва характеристики', 'характеристика', 'attribute', 'param_name', 'attribute_name', 'параметр'],
            char_type: ['тип параметра', 'тип характеристики', 'param_type', 'attribute_type'],
            char_filter_type: ['тип фільтра', 'filter_type', 'фільтр'],
            char_unit: ['одиниця', 'одиниця виміру', 'unit', 'од.'],
            char_is_global: ['наскрізний', 'глобальний', 'is_global', 'global'],
            option_id: ['id значення', 'id опції', 'опція id', 'option_id', 'value_id'],
            option_name: ['назва значення', 'назва опції', 'опція', 'option', 'value', 'значення']
        };
    },

    normalizeCharacteristicData(data) {
        normalizeRozetkaData(data);
    },

    normalizeOptionData(data) {
        normalizeRozetkaData(data);
        delete data.type;
        delete data.filter_type;
        delete data.unit;
        delete data.is_global;
    },

    async onBeforeImport(importState, onProgress) {
        const category = importState._adapterData?.category;
        if (category?.id) {
            onProgress(15, 'Створення категорії...');
            await importCategory(category, importState.marketplaceId);
        }
    },

    getCategory(importState) {
        return importState._adapterData?.category || null;
    }
};

// Реєструємо адаптер
registerImportAdapter(rozetkaAdapter);
