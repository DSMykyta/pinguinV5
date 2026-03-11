// js/pages/marketplaces/marketplaces-import-epicentr.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              MARKETPLACES - IMPORT ADAPTER: EPICENTR                    ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  ПЛАГІН — Адаптер імпорту довідника Епіцентр                           ║
 * ║                                                                          ║
 * ║  ФОРМАТ ФАЙЛУ:                                                          ║
 * ║  Назва: export-attribute-set_<ATTRIBUTE_SET_ID>.xlsx                    ║
 * ║  Заголовки: рядок 1                                                     ║
 * ║  Колонки:                                                               ║
 * ║    Характеристики: ID | Назва | Тип | Код атрибута | Суфікс | Префікс  ║
 * ║    Опції: ID опції | Назва опції | Код опції                            ║
 * ║                                                                          ║
 * ║  ПОТІК ІМПОРТУ:                                                         ║
 * ║  1. Обирається маркетплейс Епіцентр                                    ║
 * ║  2. З'являється список категорій Епіцентру                              ║
 * ║  3. Обирається категорія → з'являється завантаження файлу              ║
 * ║  4. Імпорт: категорія → характеристики → опції (зв'язані)             ║
 * ║                                                                          ║
 * ║  attribute_set_id з назви файлу зберігається в JSON категорії.          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { showToast } from '../../components/feedback/toast.js';
import { registerImportAdapter } from './marketplaces-import.js';

// ═══════════════════════════════════════════════════════════════════════════
// ДОПОМІЖНІ ФУНКЦІЇ
// ═══════════════════════════════════════════════════════════════════════════

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
 * Парсинг attribute_set_id з назви файлу
 * Файл: export-attribute-set_5346.xlsx → attribute_set_id = "5346"
 */
function parseAttributeSetId(fileName) {
    const match = fileName.match(/export-attribute-set_(\d+)/i);
    return match ? match[1] : null;
}

/**
 * Завантажити категорії Епіцентру
 */
async function loadEpicentrCategories(marketplaceId) {
    const { loadMpCategories, getMpCategories } = await import('../../data/mp-data.js');
    await loadMpCategories();
    return getMpCategories().filter(c => c.marketplace_id === marketplaceId);
}

/**
 * Побудувати UI вибору категорії
 */
function buildCategorySelectUI(categories, importState) {
    const container = document.createElement('div');
    container.id = 'adapter-extra-ui';
    container.className = 'group column';

    const existingOptions = categories.map(cat => {
        let catData = {};
        try {
            catData = typeof cat.data === 'string' ? JSON.parse(cat.data || '{}') : (cat.data || {});
        } catch (e) { /* ignore */ }
        const label = catData.name || catData.nameUa || catData.name_ua || cat.external_id || cat.id;
        return `<option value="${cat.id}">${label} (#${cat.external_id})</option>`;
    }).join('');

    container.innerHTML = `
        <label for="epicentr-category-select">
            Категорія Епіцентру
            <span class="required">*</span>
        </label>
        <select id="epicentr-category-select" data-custom-select placeholder="Оберіть категорію">
            <option value="">-- Оберіть категорію --</option>
            ${existingOptions}
        </select>
    `;

    // Обробник вибору категорії
    const select = container.querySelector('#epicentr-category-select');
    select.addEventListener('change', () => {
        const selectedId = select.value;
        const fileGroup = document.getElementById('import-file-group');

        if (selectedId) {
            const selectedCat = categories.find(c => c.id === selectedId);
            let catData = {};
            try {
                catData = typeof selectedCat.data === 'string' ? JSON.parse(selectedCat.data || '{}') : (selectedCat.data || {});
            } catch (e) { /* ignore */ }

            importState._adapterData = importState._adapterData || {};
            importState._adapterData.category = {
                id: selectedCat.id,
                external_id: selectedCat.external_id,
                name: catData.name || catData.nameUa || catData.name_ua || selectedCat.external_id
            };

            fileGroup?.classList.remove('u-hidden');
        } else {
            importState._adapterData = importState._adapterData || {};
            importState._adapterData.category = null;
            fileGroup?.classList.add('u-hidden');
        }
    });

    return container;
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
            dataType: 'adapter_pack',
            headerRow: 1,
            hideDataTypeSelect: true,
            hideHeaderRowSelect: true,
            hideMappingUI: true,
        };
    },

    /**
     * Після вибору маркетплейсу — показати вибір категорії
     */
    async onMarketplaceSelected(importState, modalBody) {
        const categories = await loadEpicentrCategories(importState.marketplaceId);
        const fileGroup = document.getElementById('import-file-group');

        // Вставляємо UI вибору категорії перед файловою групою
        const categoryUI = buildCategorySelectUI(categories, importState);
        fileGroup.insertAdjacentElement('beforebegin', categoryUI);

        // Ініціалізуємо custom select
        const { initCustomSelects } = await import('../../components/forms/select.js');
        initCustomSelects(categoryUI);
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
        const attributeSetId = parseAttributeSetId(file.name);
        importState._adapterData = importState._adapterData || {};
        importState._adapterData.attributeSetId = attributeSetId;

        // Фільтруємо рядки брендів — ID=5 або Код атрибута=brand
        const originalCount = rawData.length;
        importState.rawData = rawData.filter((row, i) => {
            if (i === 0) return true;
            return String(row[0] || '').trim() !== '5'
                && String(row[5] || '').trim().toLowerCase() !== 'brand';
        });
        const skipped = originalCount - importState.rawData.length;
        if (skipped > 0) {
            console.log(`Епіцентр: пропущено ${skipped} рядків брендів`);
        }

        // Показати інфо про файл
        const filenameEl = document.getElementById('mapper-import-filename');
        if (filenameEl) {
            const existingInfo = document.getElementById('adapter-category-info');
            if (existingInfo) existingInfo.remove();

            const infoEl = document.createElement('div');
            infoEl.id = 'adapter-category-info';
            infoEl.style.textAlign = 'center';
            infoEl.innerHTML = `<h3>${file.name}</h3>`;
            if (attributeSetId) {
                infoEl.innerHTML += `<p>Набір атрибутів: <strong>${attributeSetId}</strong></p>`;
            }

            filenameEl.textContent = '';
            filenameEl.insertAdjacentElement('afterend', infoEl);
        }

        const dataCount = (importState.rawData || rawData).length - 1;
        showToast(`Файл Епіцентр прочитано: ${dataCount} записів`, 'success');
    },

    /**
     * Автомаппінг колонок (fallback)
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
     * Фіксований маппінг колонок Епіцентру
     * Структура файлу завжди однакова:
     * 0: ID | 1: Назва | 2: Тип | 3: ID опції | 4: Назва опції |
     * 5: Код атрибута | 6: Код опції | 7: Суфікс | 8: Префікс
     */
    getFixedMapping() {
        return {
            char_id: 0,
            char_name: 1,
            char_type: 2,
            option_id: 3,
            option_name: 4
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
     * Отримати категорію для зв'язку з характеристиками
     */
    getCategory(importState) {
        const cat = importState._adapterData?.category;
        if (!cat) return null;
        return {
            id: cat.external_id || cat.id,
            name: cat.name || ''
        };
    }
};

// Реєструємо адаптер
registerImportAdapter(epicentrAdapter);
