// js/mapper/mapper-import-epicentr.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              MAPPER - IMPORT ADAPTER: EPICENTR                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Адаптер імпорту довідника Епіцентр                         ║
 * ║                                                                          ║
 * ║  ФОРМАТ ФАЙЛУ:                                                          ║
 * ║  Назва: export-attribute-set_<CATEGORY_ID>.xlsx                         ║
 * ║  Заголовки: рядок 1                                                     ║
 * ║  Колонки: ID | Назва | Тип | ID опції | Назва опції |                   ║
 * ║           Код атрибута | Код опції | Суфікс | Префікс                   ║
 * ║                                                                          ║
 * ║  Реалізує стандартний інтерфейс адаптера імпорту:                        ║
 * ║  - match(marketplace) — чи підходить цей адаптер для МП                 ║
 * ║  - getConfig() — конфігурація імпорту                                    ║
 * ║  - onFileLoaded(file, rawData, importState) — обробка файлу             ║
 * ║  - normalizeData(data, entityType) — нормалізація даних                 ║
 * ║  - getSystemFields() — поля для маппінгу                                ║
 * ║  - onBeforeImport(importState) — перед імпортом                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { showToast } from '../common/ui-toast.js';
import { registerImportAdapter } from './mapper-import.js';

/**
 * Нормалізація ключів Epicentr з українських назв колонок у стандартні
 */
function normalizeEpicentrData(data) {
    const keyMap = {
        'ID': null,                  // char_id — вже замаплено
        'Назва': 'char_name',
        'Тип': 'type',
        'ID опції': null,            // option_id — вже замаплено
        'Назва опції': null,         // option_name — вже замаплено
        'Код атрибута': 'attribute_code',
        'Код опції': 'option_code',
        'Суфікс': 'suffix',
        'Префікс': 'prefix',
    };

    for (const [origKey, newKey] of Object.entries(keyMap)) {
        if (!(origKey in data)) continue;
        if (newKey) {
            data[newKey] = data[origKey];
        }
        delete data[origKey];
    }

    // char_name дублює name — видаляємо дублікат
    if (data.char_name && data.name && data.char_name === data.name) {
        delete data.char_name;
    }
}

/**
 * Парсинг категорії з назви файлу
 * Файл: export-attribute-set_5346.xlsx → category ID = 5346
 */
function parseCategory(fileName) {
    const match = fileName.match(/export-attribute-set_(\d+)/i);
    return {
        id: match ? match[1] : null,
        name: ''  // Назва категорії не міститься у файлі
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

    if (category?.id) {
        infoEl.innerHTML += `<h2>Набір атрибутів: ${category.id}</h2>`;
    }

    filenameEl.insertAdjacentElement('afterend', infoEl);
}

/**
 * Імпорт категорії з файлу (якщо ще не існує)
 */
async function importCategory(category, marketplaceId) {
    if (!category?.id) return;

    const { callSheetsAPI } = await import('../utils/api-client.js');
    const { loadMpCategories, getMpCategories } = await import('./mapper-data.js');
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
            JSON.stringify({ id: category.id, name: category.name || '' }),
            timestamp,
            timestamp
        ]],
        spreadsheetType: 'main'
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// АДАПТЕР
// ═══════════════════════════════════════════════════════════════════════════

const epicentrAdapter = {
    /**
     * Перевірка чи цей адаптер підходить для маркетплейсу
     */
    match(marketplace) {
        return marketplace.slug?.toLowerCase() === 'epicentrm' ||
            marketplace.name?.toLowerCase().includes('епіцентр') ||
            marketplace.name?.toLowerCase().includes('epicentr');
    },

    /**
     * Конфігурація імпорту
     */
    getConfig() {
        return {
            dataType: 'adapter_pack',       // Спеціальний тип — адаптер керує всім
            headerRow: 1,                    // Заголовки в рядку 1
            hideDataTypeSelect: true,        // Ховаємо вибір типу даних
            hideHeaderRowSelect: true,       // Ховаємо вибір рядка заголовків
            hideMappingUI: true,             // Ховаємо UI маппінгу — все автоматично
        };
    },

    /**
     * Поля для маппінгу
     */
    getSystemFields() {
        return [
            { key: 'char_id', label: 'ID характеристики', required: true },
            { key: 'char_name', label: 'Назва характеристики', required: true },
            { key: 'char_type', label: 'Тип', required: false },
            { key: 'option_id', label: 'ID опції', required: false },
            { key: 'option_name', label: 'Назва опції', required: false }
        ];
    },

    /**
     * Обробка завантаженого файлу
     */
    onFileLoaded(file, rawData, importState) {
        const category = parseCategory(file.name);
        importState._adapterData = { category };

        showCategoryInfo(category, file.name);
        showToast(`Файл Епіцентр прочитано: ${rawData.length - 1} записів`, 'success');
    },

    /**
     * Автомаппінг колонок
     */
    getColumnPatterns() {
        return {
            char_id: ['id', 'id характеристики', 'characteristic_id', 'attr_id'],
            char_name: ['назва', 'назва характеристики', 'attribute', 'name'],
            char_type: ['тип', 'тип параметра', 'type'],
            option_id: ['id опції', 'option_id', 'value_id'],
            option_name: ['назва опції', 'option', 'value']
        };
    },

    /**
     * Нормалізація даних характеристики перед збереженням
     */
    normalizeCharacteristicData(data) {
        normalizeEpicentrData(data);
        // Видаляємо поля опцій — вони не належать характеристиці
        delete data.option_code;
    },

    /**
     * Нормалізація даних опції перед збереженням
     */
    normalizeOptionData(data) {
        normalizeEpicentrData(data);
        // Видаляємо поля характеристики — вони не належать опції
        delete data.type;
        delete data.attribute_code;
        delete data.suffix;
        delete data.prefix;
    },

    /**
     * Перед імпортом — створити категорію з файлу
     */
    async onBeforeImport(importState, onProgress) {
        const category = importState._adapterData?.category;
        if (category?.id) {
            onProgress(15, 'Створення категорії...');
            await importCategory(category, importState.marketplaceId);
        }
    },

    /**
     * Отримати категорію для характеристик (замість маппінгу колонок)
     */
    getCategory(importState) {
        return importState._adapterData?.category || null;
    }
};

// Реєструємо адаптер
registerImportAdapter(epicentrAdapter);
