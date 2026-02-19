// js/mapper/mapper-import.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - IMPORT PLUGIN                                ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Імпорт даних з файлів (Excel, CSV)                          ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Імпорт категорій, характеристик та опцій з файлів у власний             ║
 * ║  довідник або для конкретного маркетплейсу.                              ║
 * ║                                                                          ║
 * ║  ЕКСПОРТОВАНІ ФУНКЦІЇ:                                                   ║
 * ║  - init() — Ініціалізація плагіна (реєстрація hooks)                     ║
 * ║  - showImportModal() — Модальне вікно імпорту                            ║
 * ║                                                                          ║
 * ║  ПІДТРИМУВАНІ ФОРМАТИ:                                                   ║
 * ║  - Excel (.xlsx, .xls)                                                   ║
 * ║  - CSV (.csv)                                                            ║
 * ║  - Адаптери маркетплейсів (Rozetka, Epicentr, etc.)                       ║
 * ║                                                                          ║
 * ║  ЗАЛЕЖНОСТІ:                                                             ║
 * ║  - mapper-state.js (state, hooks)                                        ║
 * ║  - mapper-data.js (API операції)                                         ║
 * ║  - mapper-table.js (рендеринг)                                           ║
 * ║  - ui-modal.js, ui-toast.js, ui-select.js (UI компоненти)                ║
 * ║  - SheetJS (XLSX) для парсингу Excel                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { mapperState, registerHook, markPluginLoaded, runHook } from './mapper-state.js';
import {
    getCategories, getCharacteristics, getOptions, getMarketplaces,
    getMpCategories, getMpCharacteristics, getMpOptions,
    getMapCategories, getMapCharacteristics, getMapOptions,
    isMpCharacteristicMapped, isMpOptionMapped, isMpCategoryMapped,
    batchCreateCharacteristicMapping, batchCreateOptionMapping, batchCreateCategoryMapping,
    autoMapCharacteristics, autoMapOptions
} from './mapper-data.js';
import { getBatchBar } from '../common/ui-batch-actions.js';
import { renderCurrentTab } from './mapper-table.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { showLoader, hideLoader } from '../common/ui-loading.js';
import { initCustomSelects, reinitializeCustomSelect } from '../common/ui-select.js';
import { escapeHtml } from '../utils/text-utils.js';

export const PLUGIN_NAME = 'mapper-import';

// ═══════════════════════════════════════════════════════════════════════════
// АДАПТЕРИ МАРКЕТПЛЕЙСІВ
// ═══════════════════════════════════════════════════════════════════════════

const importAdapters = [];

/**
 * Реєстрація адаптера імпорту маркетплейса
 */
export function registerImportAdapter(adapter) {
    importAdapters.push(adapter);
}

/**
 * Знайти адаптер для маркетплейса
 */
function findAdapter(marketplace) {
    return importAdapters.find(a => a.match(marketplace)) || null;
}

/**
 * Нормалізує значення is_global до 'TRUE' або 'FALSE'
 * @param {*} value - Будь-яке значення
 * @returns {'TRUE'|'FALSE'} - Нормалізоване значення
 */
function normalizeIsGlobal(value) {
    if (value === true || value === 'TRUE') return 'TRUE';
    const strVal = String(value || '').toLowerCase().trim();
    const trueValues = ['true', '1', 'так', 'yes', '+', 'да'];
    return trueValues.includes(strVal) ? 'TRUE' : 'FALSE';
}

/**
 * Ініціалізація плагіна
 * Реєструє hooks та позначає плагін як завантажений
 */
export function init() {
    // Реєструємо hooks для комунікації з іншими модулями
    registerHook('onDataLoaded', handleDataLoaded);

    markPluginLoaded(PLUGIN_NAME);
}

/**
 * Обробник завантаження даних
 */
function handleDataLoaded() {
    // Оновити залежні дані якщо потрібно
}

// ═══════════════════════════════════════════════════════════════════════════
// ІМПОРТ
// ═══════════════════════════════════════════════════════════════════════════

// Стан імпорту
let importState = {
    file: null,
    rawData: [],
    parsedData: [],
    fileHeaders: [],
    mapping: {},
    marketplaceId: null,
    dataType: null,
    headerRow: 1,
    adapter: null,
    _adapterData: null
};

/**
 * Показати модальне вікно імпорту
 */
export async function showImportModal() {
    importState = {
        file: null, rawData: [], parsedData: [], fileHeaders: [],
        mapping: {}, marketplaceId: null, dataType: null,
        headerRow: 1, adapter: null, _adapterData: null
    };

    await showModal('mapper-import', null);

    const modalEl = document.getElementById('modal-mapper-import');
    if (modalEl) initCustomSelects(modalEl);

    const marketplaceSelect = document.getElementById('mapper-import-marketplace');
    if (marketplaceSelect) {
        populateMarketplaceSelect(marketplaceSelect);
        marketplaceSelect.addEventListener('change', handleMarketplaceChange);
    }

    initFileDropzone();

    const importBtn = document.getElementById('execute-mapper-import');
    if (importBtn) {
        importBtn.addEventListener('click', executeImport);
    }
}

function populateMarketplaceSelect(select) {
    const marketplaces = getMarketplaces();
    select.innerHTML = '<option value="">— Оберіть маркетплейс —</option>';

    // Спеціальна опція "Еталон" — імпорт у власні таблиці
    const etalonOpt = document.createElement('option');
    etalonOpt.value = '__etalon__';
    etalonOpt.textContent = 'Еталон (власний довідник)';
    select.appendChild(etalonOpt);

    marketplaces.forEach(mp => {
        if (mp.is_active === true || String(mp.is_active).toLowerCase() === 'true') {
            const option = document.createElement('option');
            option.value = mp.id;
            option.textContent = mp.name || mp.slug;
            select.appendChild(option);
        }
    });
    reinitializeCustomSelect(select);
}

function handleMarketplaceChange(e) {
    const selectedValue = e.target.value;
    const fileGroup = document.getElementById('import-file-group');

    importState.mapping = {};
    importState._adapterData = null;
    importState.adapter = null;
    document.getElementById('adapter-category-info')?.remove();
    document.getElementById('adapter-extra-ui')?.remove();
    fileGroup?.classList.add('u-hidden');

    if (!selectedValue) return;

    importState.marketplaceId = selectedValue;

    // Еталон — спеціальний "маркетплейс"
    if (selectedValue === '__etalon__') {
        importState.adapter = findAdapter({ slug: 'etalon', name: 'Еталон' });
    } else {
        const marketplaces = getMarketplaces();
        const mp = marketplaces.find(m => m.id === selectedValue);
        importState.adapter = mp ? findAdapter(mp) : null;
    }

    if (importState.adapter) {
        const config = importState.adapter.getConfig();
        importState.dataType = config.dataType || 'characteristics';

        // Адаптер може додати свій UI (напр. вибір категорії) і сам контролювати показ fileGroup
        if (importState.adapter.onMarketplaceSelected) {
            const modalBody = document.querySelector('#modal-mapper-import .modal-body');
            importState.adapter.onMarketplaceSelected(importState, modalBody);
        } else {
            fileGroup?.classList.remove('u-hidden');
        }
    }

    validateImport();
}

function initFileDropzone() {
    const dropzone = document.getElementById('mapper-import-dropzone');
    const fileInput = document.getElementById('mapper-import-file');

    if (!dropzone || !fileInput) return;

    // Клік на dropzone
    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag & Drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    // Вибір файлу
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
}

async function handleFileSelect(file) {
    const fileNameEl = document.getElementById('mapper-import-filename');
    if (fileNameEl) fileNameEl.textContent = file.name;

    importState.file = file;

    try {
        const rawData = await parseFileRaw(file);
        importState.rawData = rawData;

        if (importState.adapter) {
            const config = importState.adapter.getConfig();
            importState.headerRow = config.headerRow || 1;
            importState.adapter.onFileLoaded(file, rawData, importState);
            applyHeaderRowSilent();
        } else {
            showToast('Для цього маркетплейсу немає адаптера імпорту', 'warning');
        }
    } catch (error) {
        console.error('❌ Помилка парсингу файлу:', error);
        showToast('Помилка читання файлу', 'error');
    }
}

/**
 * Застосувати рядок заголовків без показу UI (для адаптерів)
 * Формат з фіксованою структурою, маппінг виконується автоматично
 */
function applyHeaderRowSilent() {
    const headerRow = importState.headerRow || 2;

    importState.mapping = {}; // Скидаємо маппінг

    // Заголовки - це рядок headerRow (1-based), дані - всі рядки після нього
    const headerRowData = importState.rawData[headerRow - 1];
    const headers = headerRowData.map((h, i) => ({
        index: i,
        name: String(h || `Колонка ${i + 1}`).trim()
    }));

    const rows = importState.rawData.slice(headerRow).map(row =>
        headers.map((_, i) => String(row[i] || '').trim())
    );

    importState.fileHeaders = headers;
    importState.parsedData = rows;

    // Автоматично визначаємо маппінг без показу UI
    autoDetectMappingSilent(headers);

    // Адаптер може надати фіксований маппінг (надійніше за pattern-matching)
    if (importState.adapter?.getFixedMapping) {
        const fixedMapping = importState.adapter.getFixedMapping(headers);
        if (fixedMapping) {
            Object.assign(importState.mapping, fixedMapping);
        }
    }

    // Валідуємо імпорт (активує кнопку якщо все OK)
    validateImport();
}

/**
 * Автоматичне визначення маппінгу без UI (для адаптерів)
 */
function autoDetectMappingSilent(headers) {
    // Отримуємо паттерни від адаптера або загальні
    const patterns = importState.adapter?.getColumnPatterns?.() || {
        char_id: ['id параметра', 'id характеристики', 'attr_id', 'attribute_id', 'characteristic_id', 'param_id'],
        char_name: ['назва параметра', 'назва характеристики', 'attribute', 'param_name', 'attribute_name'],
        char_type: ['тип параметра', 'param_type', 'attribute_type'],
        char_filter_type: ['тип фільтра', 'filter_type'],
        char_unit: ['одиниця', 'одиниця виміру', 'unit'],
        char_is_global: ['наскрізний', 'глобальний', 'is_global', 'global'],
        option_id: ['id значення', 'id опції', 'option_id', 'value_id'],
        option_name: ['назва значення', 'назва опції', 'option', 'value', 'значення'],
        category_id: ['id категорії', 'category_id', 'cat_id'],
        category_name: ['назва категорії', 'category', 'cat_name']
    };

    const availableFields = getSystemFields().map(f => f.key);
    const detectedMapping = {};

    headers.forEach(header => {
        const headerLower = header.name.toLowerCase().trim();

        for (const field of availableFields) {
            if (detectedMapping[field] !== undefined) continue;

            const fieldPatterns = patterns[field] || [];

            for (const pattern of fieldPatterns) {
                if (headerLower.includes(pattern.toLowerCase()) ||
                    pattern.toLowerCase().includes(headerLower)) {
                    detectedMapping[field] = header.index;
                    break;
                }
            }

            if (detectedMapping[field] !== undefined) break;
        }
    });

    importState.mapping = detectedMapping;
}

/**
 * Парсинг файлу (CSV, XLSX, XLS) - повертає сирі дані
 */
async function parseFileRaw(file) {
    const extension = file.name.split('.').pop().toLowerCase();

    if (extension === 'csv') {
        return parseCSVRaw(file);
    } else if (extension === 'xlsx' || extension === 'xls') {
        return parseExcelRaw(file);
    } else {
        throw new Error('Непідтримуваний формат файлу');
    }
}

/**
 * Парсинг CSV файлу - повертає всі рядки як масив
 */
function parseCSVRaw(file) {
    return new Promise((resolve, reject) => {
        if (typeof Papa === 'undefined') {
            reject(new Error('PapaParse library not loaded'));
            return;
        }

        Papa.parse(file, {
            header: false,
            skipEmptyLines: false, // Не пропускаємо порожні рядки для правильної нумерації
            complete: (results) => {
                if (results.data.length === 0) {
                    reject(new Error('Файл порожній'));
                    return;
                }

                // Повертаємо сирі дані як масив масивів
                const rows = results.data.map(row =>
                    row.map(cell => cell || '')
                );

                resolve(rows);
            },
            error: (error) => {
                reject(error);
            }
        });
    });
}

/**
 * Парсинг Excel файлу - повертає всі рядки як масив
 */
function parseExcelRaw(file) {
    return new Promise((resolve, reject) => {
        if (typeof XLSX === 'undefined') {
            reject(new Error('XLSX library not loaded'));
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Беремо перший лист
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

                if (jsonData.length === 0) {
                    reject(new Error('Файл порожній'));
                    return;
                }

                // Нормалізуємо кількість колонок (робимо однаковою для всіх рядків)
                const maxCols = Math.max(...jsonData.map(row => row.length));
                const rows = jsonData.map(row => {
                    const normalized = [];
                    for (let i = 0; i < maxCols; i++) {
                        normalized.push(row[i] !== undefined ? row[i] : '');
                    }
                    return normalized;
                });

                resolve(rows);

            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error('Помилка читання файлу'));
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * Отримати доступні поля системи в залежності від типу імпорту
 */
function getSystemFields() {
    if (importState.adapter?.getSystemFields) {
        return importState.adapter.getSystemFields();
    }
    return [
        { key: 'char_id', label: 'ID характеристики', required: true },
        { key: 'char_name', label: 'Назва характеристики', required: true },
        { key: 'char_type', label: 'Тип параметра', required: false },
        { key: 'char_filter_type', label: 'Тип фільтра', required: false },
        { key: 'char_unit', label: 'Одиниця виміру', required: false },
        { key: 'char_is_global', label: 'Наскрізний параметр', required: false },
        { key: 'option_id', label: 'ID опції/значення', required: false },
        { key: 'option_name', label: 'Назва опції/значення', required: false },
        { key: 'category_id', label: 'ID категорії', required: false },
        { key: 'category_name', label: 'Назва категорії', required: false }
    ];
}

/**
 * Перевірити валідність імпорту
 */
function validateImport() {
    const importBtn = document.getElementById('execute-mapper-import');
    if (!importBtn) return;

    let isValid = true;

    if (!importState.dataType) isValid = false;
    if (!importState.marketplaceId) isValid = false;

    const systemFields = getSystemFields();
    const requiredFields = systemFields.filter(f => f.required).map(f => f.key);
    requiredFields.forEach(field => {
        if (importState.mapping[field] === undefined) isValid = false;
    });

    if (importState.parsedData.length === 0) isValid = false;

    importBtn.disabled = !isValid;
}

/**
 * Виконати імпорт
 */
/**
 * Зберегти оригінальний файл довідника на Google Drive
 * та записати file_id у відповідну MP категорію.
 */
async function saveReferenceFileToDrive(state) {
    const { uploadReferenceFile, callSheetsAPI } = await import('../utils/api-client.js');
    const { loadMpCategories, getMpCategories } = await import('./mapper-data.js');

    const marketplace = getMarketplaces().find(m => m.id === state.marketplaceId);
    if (!marketplace?.slug) return;

    // Завантажуємо файл на Drive
    const result = await uploadReferenceFile(state.file, marketplace.slug);
    if (!result?.fileId) return;

    // Визначаємо MP категорію для цього імпорту (через адаптер)
    const adapterCategory = state.adapter?.getCategory?.(state) || null;
    if (!adapterCategory?.id) return;

    // Завантажуємо свіжі MP категорії
    await loadMpCategories();
    const mpCats = getMpCategories();
    const mpCat = mpCats.find(c =>
        c.marketplace_id === state.marketplaceId &&
        c.external_id === adapterCategory.id
    );

    if (!mpCat?._rowIndex) return;

    // Оновлюємо стовпець H (file_id) для цієї MP категорії
    await callSheetsAPI('update', {
        range: `Mapper_MP_Categories!H${mpCat._rowIndex}`,
        values: [[result.fileId]],
        spreadsheetType: 'main'
    });
}

async function executeImport() {
    const importBtn = document.getElementById('execute-mapper-import');
    const modalContent = document.querySelector('#modal-mapper-import .modal-body');

    if (importBtn) {
        importBtn.disabled = true;
        importBtn.textContent = 'Імпортую...';
    }

    const loader = showLoader(modalContent, {
        type: 'progress',
        message: 'Підготовка до імпорту...',
        overlay: true
    });

    try {
        loader.updateProgress(5, 'Підготовка даних...');
        loader.updateProgress(15, 'Імпортую дані...');

        if (importState.adapter?.onBeforeImport) {
            await importState.adapter.onBeforeImport(importState, (p, m) => loader.updateProgress(p, m));
        }

        // Адаптер може повністю замінити стандартний імпорт (напр. еталон)
        if (importState.adapter?.executeImport) {
            await importState.adapter.executeImport(importState, (p, m) => loader.updateProgress(p, m));
        } else {
            await importCharacteristicsAndOptions((percent, msg) => {
                loader.updateProgress(20 + percent * 0.75, msg);
            });
        }

        // Зберігаємо оригінальний файл на Google Drive
        if (importState.file && importState.marketplaceId) {
            loader.updateProgress(95, 'Збереження довідника на Google Drive...');
            try {
                await saveReferenceFileToDrive(importState);
            } catch (err) {
                console.warn('⚠️ Не вдалося зберегти довідник на Drive:', err);
            }
        }

        loader.updateProgress(100, 'Імпорт завершено!');

        setTimeout(() => {
            loader.hide();
            showToast('Імпорт завершено успішно!', 'success');
            closeModal();
            renderCurrentTab();
        }, 500);
    } catch (error) {
        console.error('❌ Помилка імпорту:', error);
        loader.hide();
        showToast(`Помилка імпорту: ${error.message}`, 'error');
    } finally {
        if (importBtn) {
            importBtn.disabled = false;
            importBtn.textContent = 'Імпортувати';
        }
    }
}

/**
 * Імпорт характеристик та опцій маркетплейса
 * @param {Function} onProgress - Callback для оновлення прогресу (percent, message)
 */
async function importCharacteristicsAndOptions(onProgress = () => { }) {
    const { callSheetsAPI } = await import('../utils/api-client.js');

    onProgress(10, 'Обробка даних файлу...');

    // DEBUG: Виводимо стан імпорту
    if (importState.parsedData.length > 0) {
    }

    // Отримуємо індекси колонок з маппінгу
    const m = importState.mapping;
    const charIdCol = m.char_id;
    const charNameCol = m.char_name;

    const charTypeCol = m.char_type;
    const charFilterTypeCol = m.char_filter_type;
    const charUnitCol = m.char_unit;
    const charIsGlobalCol = m.char_is_global;
    const optionIdCol = m.option_id;
    const optionNameCol = m.option_name;
    const categoryIdCol = m.category_id;
    const categoryNameCol = m.category_name;

    // Адаптер може надати категорію (напр. з назви файлу)
    const adapterCategory = importState.adapter?.getCategory?.(importState) || null;

    const mpCharacteristics = new Map(); // mp_char_id -> характеристика
    const mpOptions = [];

    importState.parsedData.forEach(row => {
        const charId = charIdCol !== undefined ? String(row[charIdCol] || '').trim() : '';
        const charName = charNameCol !== undefined ? String(row[charNameCol] || '').trim() : '';

        if (charId && charName) {
            // Додаємо/оновлюємо характеристику
            if (!mpCharacteristics.has(charId)) {
                // Адаптер може надати категорію, інакше з маппінгу
                const catId = adapterCategory
                    ? adapterCategory.id
                    : (categoryIdCol !== undefined ? String(row[categoryIdCol] || '').trim() : '');
                const catName = adapterCategory
                    ? adapterCategory.name
                    : (categoryNameCol !== undefined ? String(row[categoryNameCol] || '').trim() : '');

                // Збираємо всі замапплені поля характеристики з рядка
                const rawData = {};
                const headers = importState.fileHeaders || [];
                headers.forEach(h => {
                    const val = String(row[h.index] || '').trim();
                    if (val) rawData[h.name] = val;
                });

                mpCharacteristics.set(charId, {
                    mp_char_id: charId,
                    mp_char_name: charName,
                    mp_char_type: charTypeCol !== undefined ? String(row[charTypeCol] || '').trim() : '',
                    mp_char_filter_type: charFilterTypeCol !== undefined ? String(row[charFilterTypeCol] || '').trim() : '',
                    mp_char_unit: charUnitCol !== undefined ? String(row[charUnitCol] || '').trim() : '',
                    mp_char_is_global: charIsGlobalCol !== undefined ? String(row[charIsGlobalCol] || '').trim() : '',
                    mp_category_id: catId,
                    mp_category_name: catName,
                    _rawData: rawData
                });
            }
        }

        // Опції
        const optionId = optionIdCol !== undefined ? String(row[optionIdCol] || '').trim() : '';
        const optionName = optionNameCol !== undefined ? String(row[optionNameCol] || '').trim() : '';

        if (optionId && optionName && charId) {
            // Перевіряємо чи така опція вже є
            const exists = mpOptions.some(o =>
                o.mp_char_id === charId && o.mp_option_id === optionId
            );
            if (!exists) {
                // Збираємо всі дані опції з рядка
                const rawData = {};
                const headers = importState.fileHeaders || [];
                headers.forEach(h => {
                    const val = String(row[h.index] || '').trim();
                    if (val) rawData[h.name] = val;
                });

                mpOptions.push({
                    mp_char_id: charId,
                    mp_option_id: optionId,
                    mp_option_name: optionName,
                    _rawData: rawData
                });
            }
        }
    });

    const characteristicsList = Array.from(mpCharacteristics.values());

    onProgress(30, 'Перевірка існуючих даних...');

    // Завантажуємо існуючі дані для перевірки дублікатів
    const { loadMpCharacteristics, loadMpOptions, getMpCharacteristics, getMpOptions } = await import('./mapper-data.js');
    await loadMpCharacteristics();
    await loadMpOptions();

    const existingChars = getMpCharacteristics();
    const existingOpts = getMpOptions();

    // Створюємо Set існуючих ID для швидкої перевірки
    const existingCharIds = new Set(
        existingChars
            .filter(c => c.marketplace_id === importState.marketplaceId)
            .map(c => c.external_id)
    );
    const existingOptIds = new Set(
        existingOpts
            .filter(o => o.marketplace_id === importState.marketplaceId)
            .map(o => `${o.char_id || ''}-${o.external_id}`)
    );

    // Фільтруємо тільки нові характеристики
    const newCharacteristics = characteristicsList.filter(c => !existingCharIds.has(c.mp_char_id));
    const newOptions = mpOptions.filter(o => !existingOptIds.has(`${o.mp_char_id}-${o.mp_option_id}`));

    // Знаходимо існуючі характеристики, яким потрібно додати нову категорію
    const charsToMergeCategories = characteristicsList.filter(c => {
        if (!existingCharIds.has(c.mp_char_id)) return false; // нові - пропускаємо
        if (!c.mp_category_id) return false; // немає категорії в імпорті - пропускаємо

        const existingChar = existingChars.find(ec =>
            ec.marketplace_id === importState.marketplaceId &&
            ec.external_id === c.mp_char_id
        );
        if (!existingChar) return false;

        // Перевіряємо чи нова категорія вже є в існуючому записі
        const existingCatIds = (existingChar.category_id || '').split(',').map(id => id.trim()).filter(id => id);
        return !existingCatIds.includes(c.mp_category_id);
    });

    // Оновлюємо існуючі характеристики з новою категорією
    if (charsToMergeCategories.length > 0) {
        onProgress(40, `Оновлення ${charsToMergeCategories.length} існуючих характеристик з новими категоріями...`);

        const timestamp = new Date().toISOString();

        for (const newChar of charsToMergeCategories) {
            const existingChar = existingChars.find(ec =>
                ec.marketplace_id === importState.marketplaceId &&
                ec.external_id === newChar.mp_char_id
            );
            if (!existingChar || !existingChar._rowIndex) continue;

            // Мержимо категорії
            const existingCatIds = (existingChar.category_id || '').split(',').map(id => id.trim()).filter(id => id);
            const existingCatNames = (existingChar.category_name || '').split(',').map(n => n.trim()).filter(n => n);

            if (!existingCatIds.includes(newChar.mp_category_id)) {
                existingCatIds.push(newChar.mp_category_id);
                if (newChar.mp_category_name) {
                    existingCatNames.push(newChar.mp_category_name);
                }
            }

            // Оновлюємо JSON data — зберігаємо існуючі поля + оновлюємо категорії
            let existingData = {};
            try {
                existingData = JSON.parse(existingChar.data || '{}');
            } catch (e) {
                existingData = {};
            }
            const updatedData = JSON.stringify({
                ...existingData,
                category_id: existingCatIds.join(','),
                category_name: existingCatNames.join(',')
            });

            // Оновлюємо рядок в таблиці
            const range = `Mapper_MP_Characteristics!A${existingChar._rowIndex}:G${existingChar._rowIndex}`;
            await callSheetsAPI('update', {
                range: range,
                values: [[
                    existingChar.id,
                    existingChar.marketplace_id,
                    existingChar.external_id,
                    existingChar.source || 'import',
                    updatedData,
                    existingChar.created_at,
                    timestamp
                ]],
                spreadsheetType: 'main'
            });

            console.log(`✅ Додано категорію ${newChar.mp_category_id} до характеристики ${existingChar.external_id}`);
        }
    }

    onProgress(50, `Запис ${newCharacteristics.length} нових характеристик...`);

    // Записуємо характеристики маркетплейса
    // Структура таблиці: id | marketplace_id | external_id | source | data | created_at | updated_at
    // data - JSON з усіма полями характеристики (різні для кожного маркетплейсу)
    if (newCharacteristics.length > 0) {
        const timestamp = new Date().toISOString();
        const charRows = newCharacteristics.map((c) => {
            const uniqueId = `mpc-${importState.marketplaceId}-${c.mp_char_id}`;

            // Зберігаємо всі оригінальні дані з рядка + нормалізовані поля
            const data = {
                id: c.mp_char_id,
                name: c.mp_char_name || '',
                ...(c._rawData || {}),
                category_id: c.mp_category_id || '',
                category_name: c.mp_category_name || ''
            };

            // Нормалізуємо is_global якщо є
            if (c.mp_char_is_global) {
                data.is_global = normalizeIsGlobal(c.mp_char_is_global);
            }

            // Нормалізація через адаптер
            if (importState.adapter?.normalizeCharacteristicData) {
                importState.adapter.normalizeCharacteristicData(data);
            }

            const dataJson = JSON.stringify(data);

            return [
                uniqueId,
                importState.marketplaceId,
                c.mp_char_id,           // external_id
                'import',               // source
                dataJson,               // data (JSON)
                timestamp,              // created_at
                timestamp               // updated_at
            ];
        });


        const charResult = await callSheetsAPI('append', {
            range: 'Mapper_MP_Characteristics!A:G',
            values: charRows,
            spreadsheetType: 'main'
        });

    } else {
    }

    onProgress(75, `Запис ${newOptions.length} нових опцій...`);

    // Записуємо опції маркетплейса
    // Структура: id | marketplace_id | external_id | source | data | created_at | updated_at
    if (newOptions.length > 0) {
        const timestamp = new Date().toISOString();
        const optRows = newOptions.map(o => {
            const uniqueId = `mpo-${importState.marketplaceId}-${o.mp_char_id}-${o.mp_option_id}`;

            // Зберігаємо всі оригінальні дані з рядка
            const data = {
                id: o.mp_option_id,
                char_id: o.mp_char_id || '',
                name: o.mp_option_name || '',
                ...(o._rawData || {})
            };

            // Нормалізація через адаптер
            if (importState.adapter?.normalizeOptionData) {
                importState.adapter.normalizeOptionData(data);
            }

            const dataJson = JSON.stringify(data);

            return [
                uniqueId,
                importState.marketplaceId,
                o.mp_option_id,         // external_id
                'import',               // source
                dataJson,               // data (JSON)
                timestamp,              // created_at
                timestamp               // updated_at
            ];
        });

        await callSheetsAPI('append', {
            range: 'Mapper_MP_Options!A:G',
            values: optRows,
            spreadsheetType: 'main'
        });
    } else {
    }

    onProgress(100, 'Готово!');
}

// ═══════════════════════════════════════════════════════════════════════════
// HEADLESS IMPORT (для upload довідника з дерева категорій)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Імпорт довідника без UI — викликається при upload файлу до категорії МП.
 * Парсить файл через адаптер, створює MP характеристики/опції.
 *
 * @param {File} file — файл довідника
 * @param {Object} marketplace — { id, slug, name }
 * @param {Object} mpCategory — { external_id, name }
 * @returns {Promise<{chars: number, opts: number}>} — кількість створених записів
 */
export async function importReferenceForCategory(file, marketplace, mpCategory) {
    const savedState = importState;

    const adapter = findAdapter(marketplace);
    if (!adapter) throw new Error('Немає адаптера для цього маркетплейсу');

    const config = adapter.getConfig();

    importState = {
        file,
        rawData: [],
        parsedData: [],
        fileHeaders: [],
        mapping: {},
        marketplaceId: marketplace.id,
        dataType: config.dataType || 'adapter_pack',
        headerRow: config.headerRow || 1,
        adapter,
        _adapterData: null
    };

    try {
        // 1. Парсинг файлу (Excel/CSV)
        const rawData = await parseFileRaw(file);
        importState.rawData = rawData;

        // 2. Адаптер обробляє файл (встановлює _adapterData, фільтрує рядки тощо)
        adapter.onFileLoaded(file, rawData, importState);

        // 3. Перевизначаємо категорію — вона вже відома з дерева
        importState._adapterData = importState._adapterData || {};
        importState._adapterData.category = {
            id: mpCategory.external_id,
            name: mpCategory.name || mpCategory.external_id
        };

        // 4. Заголовки + маппінг колонок (headless — без DOM)
        const headerRow = importState.headerRow || 1;
        const headerRowData = importState.rawData[headerRow - 1];
        if (!headerRowData) throw new Error('Файл не містить заголовків');

        const headers = headerRowData.map((h, i) => ({
            index: i,
            name: String(h || `Колонка ${i + 1}`).trim()
        }));

        importState.fileHeaders = headers;
        importState.parsedData = importState.rawData.slice(headerRow).map(row =>
            headers.map((_, i) => String(row[i] || '').trim())
        );

        // Auto-detect mapping
        autoDetectMappingSilent(headers);

        // Fixed mapping від адаптера (перезаписує auto-detect)
        if (adapter.getFixedMapping) {
            const fixed = adapter.getFixedMapping(headers);
            if (fixed) Object.assign(importState.mapping, fixed);
        }

        // 5. onBeforeImport (створює категорію якщо ще не існує)
        if (adapter.onBeforeImport) {
            await adapter.onBeforeImport(importState, () => {});
        }

        // 6. Імпорт характеристик та опцій
        await importCharacteristicsAndOptions(() => {});

        // 7. Перезавантажити дані в стейт
        const { loadMpCharacteristics, loadMpOptions } = await import('./mapper-data.js');
        await loadMpCharacteristics();
        await loadMpOptions();

    } finally {
        importState = savedState;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH МАППІНГ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модалку вибору власної характеристики для batch маппінгу
 * @param {Array<string>} selectedIds - Масив ID вибраних характеристик (власних + MP)
 */
export async function showSelectOwnCharacteristicModal(selectedIds) {

    const mpChars = getMpCharacteristics();
    const ownChars = getCharacteristics();

    // Розділяємо вибрані на власні та MP
    const selectedOwnIds = selectedIds.filter(id => ownChars.some(c => c.id === id));
    const selectedMpIds = selectedIds.filter(id => mpChars.some(c => c.id === id));


    // Якщо немає MP характеристик для маппінгу
    if (selectedMpIds.length === 0) {
        showToast('Оберіть хоча б одну характеристику маркетплейсу', 'warning');
        return;
    }

    // Визначаємо цільову власну характеристику
    let targetOwnCharId = null;
    let needSelectTarget = true;

    // Якщо вибрана рівно 1 власна - використовуємо її як ціль
    if (selectedOwnIds.length === 1) {
        targetOwnCharId = selectedOwnIds[0];
        needSelectTarget = false;
    } else if (selectedOwnIds.length > 1) {
        showToast('Оберіть тільки одну власну характеристику як ціль', 'warning');
        return;
    }

    // Якщо не потрібно вибирати - одразу мапимо
    if (!needSelectTarget) {
        try {
            const result = await batchCreateCharacteristicMapping(selectedMpIds, targetOwnCharId);

            // Очищуємо вибір
            if (mapperState.selectedRows.characteristics) {
                mapperState.selectedRows.characteristics.clear();
            }
            const batchBar = getBatchBar('mapper-characteristics');
            if (batchBar) batchBar.deselectAll();

            await renderCurrentTab();

            const targetChar = ownChars.find(c => c.id === targetOwnCharId);
            showToast(`Замаплено ${result.success.length} характеристик до "${targetChar?.name_ua || targetOwnCharId}"`, 'success');
        } catch (error) {
            console.error('❌ Помилка batch маппінгу:', error);
            showToast('Помилка при маппінгу', 'error');
        }
        return;
    }

    // Інакше показуємо модалку вибору цілі
    const modalHtml = `
        <div class="modal-overlay">
            <div class="modal-container modal-medium">
                <div class="modal-header">
                    <h2 class="modal-title">Замапити до власної характеристики</h2>
                    <div class="group">
                        <button class="btn-icon modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <p class="u-mb-16">Обрано <strong>${selectedMpIds.length}</strong> характеристик маркетплейсу.</p>
                    <p class="u-mb-16">Оберіть власну характеристику для прив'язки:</p>

                    <div class="group column">
                        <label for="select-own-char">Власна характеристика</label>
                        <select id="select-own-char" class="input-main">
                            <option value="">— Оберіть характеристику —</option>
                            ${ownChars.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name_ua || c.id)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="btn-apply-char-mapping" class="btn-main">
                        <span class="material-symbols-outlined">link</span>
                        Замапити
                    </button>
                </div>
            </div>
        </div>
    `;

    // Показуємо модалку
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = modalHtml;
    const modalOverlay = tempContainer.firstElementChild;
    document.body.appendChild(modalOverlay);

    // Обробники
    const closeBtn = modalOverlay.querySelector('.modal-close-btn');
    const applyBtn = modalOverlay.querySelector('#btn-apply-char-mapping');
    const selectEl = modalOverlay.querySelector('#select-own-char');

    const closeThisModal = () => {
        modalOverlay.remove();
    };

    closeBtn.addEventListener('click', closeThisModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeThisModal();
    });

    applyBtn.addEventListener('click', async () => {
        const ownCharId = selectEl.value;
        if (!ownCharId) {
            showToast('Оберіть характеристику', 'warning');
            return;
        }

        applyBtn.disabled = true;
        applyBtn.innerHTML = '<span class="material-symbols-outlined spinning">sync</span> Обробка...';

        try {
            const result = await batchCreateCharacteristicMapping(selectedMpIds, ownCharId);

            closeThisModal();

            // Очищуємо вибір
            if (mapperState.selectedRows.characteristics) {
                mapperState.selectedRows.characteristics.clear();
            }
            const batchBar = getBatchBar('mapper-characteristics');
            if (batchBar) batchBar.deselectAll();

            // Оновлюємо таблицю
            await renderCurrentTab();

            showToast(`Замаплено ${result.success.length} характеристик`, 'success');
        } catch (error) {
            console.error('❌ Помилка batch маппінгу:', error);
            showToast('Помилка при маппінгу', 'error');
            applyBtn.disabled = false;
            applyBtn.innerHTML = '<span class="material-symbols-outlined">link</span> Замапити';
        }
    });
}

/**
 * Показати модалку вибору власної опції для batch маппінгу
 * @param {Array<string>} selectedIds - Масив ID вибраних MP опцій
 */
export async function showSelectOwnOptionModal(selectedIds) {

    // Фільтруємо тільки MP опції (не власні)
    const mpIds = selectedIds.filter(id => {
        const mpOpts = getMpOptions();
        return mpOpts.some(o => o.id === id);
    });

    if (mpIds.length === 0) {
        showToast('Оберіть опції маркетплейсу для маппінгу', 'warning');
        return;
    }

    // Створюємо просту модалку зі списком опцій
    const ownOptions = getOptions();

    const modalHtml = `
        <div class="modal-overlay">
            <div class="modal-container modal-medium">
                <div class="modal-header">
                    <h2 class="modal-title">Замапити до власної опції</h2>
                    <div class="group">
                        <button class="btn-icon modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <p class="u-mb-16">Обрано <strong>${mpIds.length}</strong> опцій маркетплейсу.</p>
                    <p class="u-mb-16">Оберіть власну опцію для прив'язки:</p>

                    <div class="group column">
                        <label for="select-own-option">Власна опція</label>
                        <select id="select-own-option" class="input-main">
                            <option value="">— Оберіть опцію —</option>
                            ${ownOptions.map(o => `<option value="${escapeHtml(o.id)}">${escapeHtml(o.value_ua || o.id)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="btn-apply-option-mapping" class="btn-main">
                        <span class="material-symbols-outlined">link</span>
                        Замапити
                    </button>
                </div>
            </div>
        </div>
    `;

    // Показуємо модалку
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = modalHtml;
    const modalOverlay = tempContainer.firstElementChild;
    document.body.appendChild(modalOverlay);

    // Обробники
    const closeBtn = modalOverlay.querySelector('.modal-close-btn');
    const applyBtn = modalOverlay.querySelector('#btn-apply-option-mapping');
    const selectEl = modalOverlay.querySelector('#select-own-option');

    const closeThisModal = () => {
        modalOverlay.remove();
    };

    closeBtn.addEventListener('click', closeThisModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeThisModal();
    });

    applyBtn.addEventListener('click', async () => {
        const ownOptionId = selectEl.value;
        if (!ownOptionId) {
            showToast('Оберіть опцію', 'warning');
            return;
        }

        applyBtn.disabled = true;
        applyBtn.innerHTML = '<span class="material-symbols-outlined spinning">sync</span> Обробка...';

        try {
            const result = await batchCreateOptionMapping(mpIds, ownOptionId);

            closeThisModal();

            // Очищуємо вибір
            if (mapperState.selectedRows.options) {
                mapperState.selectedRows.options.clear();
            }
            const batchBar = getBatchBar('mapper-options');
            if (batchBar) batchBar.deselectAll();

            // Оновлюємо таблицю
            await renderCurrentTab();

            showToast(`Замаплено ${result.success.length} опцій`, 'success');
        } catch (error) {
            console.error('❌ Помилка batch маппінгу:', error);
            showToast('Помилка при маппінгу', 'error');
            applyBtn.disabled = false;
            applyBtn.innerHTML = '<span class="material-symbols-outlined">link</span> Замапити';
        }
    });
}

/**
 * Авто-маппінг характеристик за назвою
 * @param {Array<string>} selectedIds - Масив ID вибраних MP характеристик
 */
export async function handleAutoMapCharacteristics(selectedIds) {

    // Фільтруємо тільки MP характеристики
    const mpIds = selectedIds.filter(id => {
        const mpChars = getMpCharacteristics();
        return mpChars.some(c => c.id === id);
    });

    if (mpIds.length === 0) {
        showToast('Оберіть характеристики маркетплейсу для авто-маппінгу', 'warning');
        return;
    }

    showToast('Авто-маппінг...', 'info');

    try {
        const result = await autoMapCharacteristics(mpIds);

        // Очищуємо вибір
        if (mapperState.selectedRows.characteristics) {
            mapperState.selectedRows.characteristics.clear();
        }
        const batchBar = getBatchBar('mapper-characteristics');
        if (batchBar) batchBar.deselectAll();

        // Оновлюємо таблицю
        await renderCurrentTab();

        if (result.mapped.length > 0) {
            showToast(`Авто-замаплено ${result.mapped.length} з ${mpIds.length} характеристик`, 'success');
        } else {
            showToast(`Не знайдено відповідностей серед ${mpIds.length} характеристик`, 'warning');
        }
    } catch (error) {
        console.error('❌ Помилка авто-маппінгу:', error);
        showToast('Помилка при авто-маппінгу', 'error');
    }
}

/**
 * Авто-маппінг опцій за назвою
 * @param {Array<string>} selectedIds - Масив ID вибраних MP опцій
 */
export async function handleAutoMapOptions(selectedIds) {

    // Фільтруємо тільки MP опції
    const mpIds = selectedIds.filter(id => {
        const mpOpts = getMpOptions();
        return mpOpts.some(o => o.id === id);
    });

    if (mpIds.length === 0) {
        showToast('Оберіть опції маркетплейсу для авто-маппінгу', 'warning');
        return;
    }

    showToast('Авто-маппінг...', 'info');

    try {
        const result = await autoMapOptions(mpIds);

        // Очищуємо вибір
        if (mapperState.selectedRows.options) {
            mapperState.selectedRows.options.clear();
        }
        const batchBar = getBatchBar('mapper-options');
        if (batchBar) batchBar.deselectAll();

        // Оновлюємо таблицю
        await renderCurrentTab();

        if (result.mapped.length > 0) {
            showToast(`Авто-замаплено ${result.mapped.length} з ${mpIds.length} опцій`, 'success');
        } else {
            showToast(`Не знайдено відповідностей серед ${mpIds.length} опцій`, 'warning');
        }
    } catch (error) {
        console.error('❌ Помилка авто-маппінгу:', error);
        showToast('Помилка при авто-маппінгу', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПЕРЕГЛЯД MP ДАНИХ (READ-ONLY)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати read-only модалку для MP характеристики
 * @param {string|Object} mpCharIdOrData - ID MP характеристики або об'єкт з даними
 */
export async function showViewMpCharacteristicModal(mpCharIdOrData) {

    let mpChar;

    // Приймаємо як ID (string), так і об'єкт
    if (typeof mpCharIdOrData === 'object' && mpCharIdOrData !== null) {
        mpChar = mpCharIdOrData;
    } else {
        const mpChars = getMpCharacteristics();
        mpChar = mpChars.find(c => c.id === mpCharIdOrData);

        if (!mpChar) {
            // Спробуємо пошук за external_id
            mpChar = mpChars.find(c => c.external_id === mpCharIdOrData);
            if (mpChar) {
            }
        }
    }

    if (!mpChar) {
        showToast('MP характеристику не знайдено', 'error');
        console.error(`❌ MP характеристику не знайдено: ${mpCharIdOrData}`);
        return;
    }

    // Парсимо data якщо потрібно
    let charData = mpChar;
    if (mpChar.data && typeof mpChar.data === 'string') {
        try {
            charData = { ...mpChar, ...JSON.parse(mpChar.data) };
        } catch (e) {
            // Залишаємо як є
        }
    }

    // Знаходимо назву маркетплейсу
    const marketplaces = getMarketplaces();
    const marketplace = marketplaces.find(m => m.id === mpChar.marketplace_id);
    const mpName = marketplace ? marketplace.name : mpChar.marketplace_id;

    // Знаходимо назву прив'язаної характеристики
    let mappedToName = '';
    if (charData.our_char_id) {
        const ownChars = getCharacteristics();
        const ownChar = ownChars.find(c => c.id === charData.our_char_id);
        mappedToName = ownChar ? (ownChar.name_ua || ownChar.id) : charData.our_char_id;
    }

    const modalHtml = `
        <div class="modal-overlay">
            <div class="modal-container modal-medium">
                <div class="modal-header">
                    <h2 class="modal-title">Характеристика маркетплейсу</h2>
                    <div class="group">
                        <button class="btn-icon modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <fieldset class="form-fieldset" disabled>
                        <div class="group column">
                            <label>Джерело</label>
                            <input type="text" class="input-main" value="${escapeHtml(mpName)}" readonly>
                        </div>
                        <div class="grid2">
                            <div class="group column">
                                <label>ID</label>
                                <input type="text" class="input-main" value="${escapeHtml(mpChar.id)}" readonly>
                            </div>
                            <div class="group column">
                                <label>External ID</label>
                                <input type="text" class="input-main" value="${escapeHtml(mpChar.external_id || '')}" readonly>
                            </div>
                        </div>
                        <div class="group column">
                            <label>Назва</label>
                            <input type="text" class="input-main" value="${escapeHtml(charData.name || '')}" readonly>
                        </div>
                        <div class="grid2">
                            <div class="group column">
                                <label>Тип</label>
                                <input type="text" class="input-main" value="${escapeHtml(charData.type || '')}" readonly>
                            </div>
                            <div class="group column">
                                <label>Одиниця виміру</label>
                                <input type="text" class="input-main" value="${escapeHtml(charData.unit || '')}" readonly>
                            </div>
                        </div>
                        <div class="group column">
                            <label>Глобальна</label>
                            <input type="text" class="input-main" value="${charData.is_global === 'TRUE' || charData.is_global === true ? 'TRUE' : 'FALSE'}" readonly>
                        </div>
                    </fieldset>

                    <div class="form-fieldset u-mt-16">
                        <div class="group column">
                            <label>Замаплено до</label>
                            ${mappedToName
                                ? `<div class="chip chip-success">${escapeHtml(mappedToName)}</div>`
                                : `<div class="chip">Не замаплено</div>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Показуємо модалку
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = modalHtml;
    const modalOverlay = tempContainer.firstElementChild;
    document.body.appendChild(modalOverlay);

    // Обробники
    const closeBtn = modalOverlay.querySelector('.modal-close-btn');
    const closeThisModal = () => modalOverlay.remove();

    closeBtn.addEventListener('click', closeThisModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeThisModal();
    });
}

/**
 * Показати read-only модалку для MP опції
 * @param {string|Object} mpOptionIdOrData - ID MP опції або об'єкт з даними
 */
export async function showViewMpOptionModal(mpOptionIdOrData) {

    let mpOption;

    // Приймаємо як ID (string), так і об'єкт
    if (typeof mpOptionIdOrData === 'object' && mpOptionIdOrData !== null) {
        mpOption = mpOptionIdOrData;
    } else {
        const mpOpts = getMpOptions();
        mpOption = mpOpts.find(o => o.id === mpOptionIdOrData);

        if (!mpOption) {
            // Спробуємо пошук за external_id
            mpOption = mpOpts.find(o => o.external_id === mpOptionIdOrData);
            if (mpOption) {
            }
        }
    }

    if (!mpOption) {
        showToast('MP опцію не знайдено', 'error');
        console.error(`❌ MP опцію не знайдено: ${mpOptionIdOrData}`);
        return;
    }

    // Парсимо data якщо потрібно
    let optData = mpOption;
    if (mpOption.data && typeof mpOption.data === 'string') {
        try {
            optData = { ...mpOption, ...JSON.parse(mpOption.data) };
        } catch (e) {
            // Залишаємо як є
        }
    }

    // Знаходимо назву маркетплейсу
    const marketplaces = getMarketplaces();
    const marketplace = marketplaces.find(m => m.id === mpOption.marketplace_id);
    const mpName = marketplace ? marketplace.name : mpOption.marketplace_id;

    // Знаходимо назву прив'язаної опції
    let mappedToName = '';
    if (optData.our_option_id) {
        const ownOpts = getOptions();
        const ownOpt = ownOpts.find(o => o.id === optData.our_option_id);
        mappedToName = ownOpt ? (ownOpt.value_ua || ownOpt.id) : optData.our_option_id;
    }

    const modalHtml = `
        <div class="modal-overlay">
            <div class="modal-container modal-medium">
                <div class="modal-header">
                    <h2 class="modal-title">Опція маркетплейсу</h2>
                    <div class="group">
                        <button class="btn-icon modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <fieldset class="form-fieldset" disabled>
                        <div class="group column">
                            <label>Джерело</label>
                            <input type="text" class="input-main" value="${escapeHtml(mpName)}" readonly>
                        </div>
                        <div class="grid2">
                            <div class="group column">
                                <label>ID</label>
                                <input type="text" class="input-main" value="${escapeHtml(mpOption.id)}" readonly>
                            </div>
                            <div class="group column">
                                <label>External ID</label>
                                <input type="text" class="input-main" value="${escapeHtml(mpOption.external_id || '')}" readonly>
                            </div>
                        </div>
                        <div class="group column">
                            <label>Значення</label>
                            <input type="text" class="input-main" value="${escapeHtml(optData.name || '')}" readonly>
                        </div>
                    </fieldset>

                    <div class="form-fieldset u-mt-16">
                        <div class="group column">
                            <label>Замаплено до</label>
                            ${mappedToName
                                ? `<div class="chip chip-success">${escapeHtml(mappedToName)}</div>`
                                : `<div class="chip">Не замаплено</div>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Показуємо модалку
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = modalHtml;
    const modalOverlay = tempContainer.firstElementChild;
    document.body.appendChild(modalOverlay);

    // Обробники
    const closeBtn = modalOverlay.querySelector('.modal-close-btn');
    const closeThisModal = () => modalOverlay.remove();

    closeBtn.addEventListener('click', closeThisModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeThisModal();
    });
}

/**
 * Показати модалку вибору власної категорії для маппінгу MP категорій
 * @param {string[]} selectedMpCatIds - Масив ID вибраних MP категорій
 */
export async function showSelectOwnCategoryModal(selectedMpCatIds) {

    const ownCategories = getCategories();

    if (ownCategories.length === 0) {
        showToast('Немає власних категорій для маппінгу', 'warning');
        return;
    }

    // Групуємо по рівнях вкладеності
    const buildTree = (categories, parentId = '') => {
        return categories
            .filter(c => (c.parent_id || '') === parentId)
            .map(cat => ({
                ...cat,
                children: buildTree(categories, cat.id)
            }));
    };

    const renderTreeOptions = (tree, level = 0) => {
        let html = '';
        tree.forEach(cat => {
            const indent = '—'.repeat(level);
            const prefix = level > 0 ? `${indent} ` : '';
            html += `<option value="${escapeHtml(cat.id)}">${prefix}${escapeHtml(cat.name_ua || cat.id)}</option>`;
            if (cat.children.length > 0) {
                html += renderTreeOptions(cat.children, level + 1);
            }
        });
        return html;
    };

    const categoryTree = buildTree(ownCategories);
    const optionsHtml = renderTreeOptions(categoryTree);

    const modalHtml = `
        <div class="modal-overlay is-open">
            <div class="modal-container modal-small">
                <div class="modal-header">
                    <h2 class="modal-title">Замапити до категорії</h2>
                    <div class="group">
                        <button class="btn-icon modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <p class="u-mb-16">Вибрано ${selectedMpCatIds.length} MP категорій для маппінгу</p>
                    <div class="group column">
                        <label>Власна категорія</label>
                        <select id="select-own-category" class="input-main">
                            <option value="">Оберіть категорію...</option>
                            ${optionsHtml}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary modal-close-btn">Скасувати</button>
                    <button class="btn-primary" id="btn-confirm-category-mapping">
                        <span class="material-symbols-outlined">link</span>
                        <span>Замапити</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = modalHtml;
    const modalOverlay = tempContainer.firstElementChild;
    document.body.appendChild(modalOverlay);

    const closeThisModal = () => modalOverlay.remove();

    modalOverlay.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', closeThisModal);
    });
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeThisModal();
    });

    const confirmBtn = document.getElementById('btn-confirm-category-mapping');
    const selectEl = document.getElementById('select-own-category');

    confirmBtn.addEventListener('click', async () => {
        const ownCatId = selectEl.value;
        if (!ownCatId) {
            showToast('Оберіть категорію', 'warning');
            return;
        }

        try {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="material-symbols-outlined spinning">progress_activity</span><span>Маппінг...</span>';

            await batchCreateCategoryMapping(selectedMpCatIds, ownCatId);

            closeThisModal();

            // Очистити виділення
            mapperState.selectedRows.categories.clear();
            const batchBar = getBatchBar('mapper-categories');
            if (batchBar) batchBar.deselectAll();

            showToast(`Замаплено ${selectedMpCatIds.length} категорій`, 'success');
            renderCurrentTab();
        } catch (error) {
            console.error('❌ Помилка маппінгу:', error);
            showToast('Помилка маппінгу категорій', 'error');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<span class="material-symbols-outlined">link</span><span>Замапити</span>';
        }
    });
}

/**
 * Показати read-only модалку для MP категорії
 * @param {string|Object} mpCatIdOrData - ID MP категорії або об'єкт з даними
 */
export async function showViewMpCategoryModal(mpCatIdOrData) {

    let mpCat;

    // Приймаємо як ID (string), так і об'єкт
    if (typeof mpCatIdOrData === 'object' && mpCatIdOrData !== null) {
        mpCat = mpCatIdOrData;
    } else {
        const mpCats = getMpCategories();
        mpCat = mpCats.find(c => c.id === mpCatIdOrData);

        if (!mpCat) {
            // Спробуємо пошук за external_id
            mpCat = mpCats.find(c => c.external_id === mpCatIdOrData);
            if (mpCat) {
            }
        }

        if (!mpCat) {
            // Спробуємо пошук за частковим співпаданням ID (для випадків mpc-mp-000001-cat-274390 -> mpc-mp-000001)
            mpCat = mpCats.find(c => mpCatIdOrData.startsWith(c.id));
            if (mpCat) {
            }
        }
    }

    if (!mpCat) {
        showToast('MP категорію не знайдено', 'error');
        console.error(`❌ MP категорію не знайдено: ${mpCatIdOrData}`);
        return;
    }

    // Парсимо data якщо потрібно
    let catData = mpCat;
    if (mpCat.data && typeof mpCat.data === 'string') {
        try {
            catData = { ...mpCat, ...JSON.parse(mpCat.data) };
        } catch (e) {
            // Залишаємо як є
        }
    }

    // Знаходимо назву маркетплейсу
    const marketplaces = getMarketplaces();
    const marketplace = marketplaces.find(m => m.id === mpCat.marketplace_id);
    const mpName = marketplace ? marketplace.name : mpCat.marketplace_id;

    // Знаходимо назву прив'язаної категорії
    let mappedToName = '';
    if (catData.our_category_id) {
        const ownCats = getCategories();
        const ownCat = ownCats.find(c => c.id === catData.our_category_id);
        mappedToName = ownCat ? (ownCat.name_ua || ownCat.id) : catData.our_category_id;
    }

    // Знаходимо батьківську категорію (якщо є)
    let parentName = '';
    if (catData.parent_id) {
        const mpCats = getMpCategories();
        const parent = mpCats.find(c => c.external_id === catData.parent_id && c.marketplace_id === mpCat.marketplace_id);
        if (parent) {
            const parentData = typeof parent.data === 'string' ? JSON.parse(parent.data || '{}') : (parent.data || {});
            parentName = parentData.name || catData.parent_id;
        } else {
            parentName = catData.parent_id;
        }
    }

    const modalHtml = `
        <div class="modal-overlay is-open">
            <div class="modal-container modal-medium">
                <div class="modal-header">
                    <h2 class="modal-title">Категорія маркетплейсу</h2>
                    <div class="group">
                        <button class="btn-icon modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <fieldset class="form-fieldset" disabled>
                        <div class="group column">
                            <label>Джерело</label>
                            <input type="text" class="input-main" value="${escapeHtml(mpName)}" readonly>
                        </div>
                        <div class="grid2">
                            <div class="group column">
                                <label>ID</label>
                                <input type="text" class="input-main" value="${escapeHtml(mpCat.id)}" readonly>
                            </div>
                            <div class="group column">
                                <label>External ID</label>
                                <input type="text" class="input-main" value="${escapeHtml(mpCat.external_id || '')}" readonly>
                            </div>
                        </div>
                        <div class="group column">
                            <label>Назва</label>
                            <input type="text" class="input-main" value="${escapeHtml(catData.name || '')}" readonly>
                        </div>
                        ${parentName ? `
                        <div class="group column">
                            <label>Батьківська категорія</label>
                            <input type="text" class="input-main" value="${escapeHtml(parentName)}" readonly>
                        </div>
                        ` : ''}
                    </fieldset>

                    <div class="form-fieldset u-mt-16">
                        <div class="group column">
                            <label>Замаплено до</label>
                            ${mappedToName
                                ? `<div class="chip chip-success">${escapeHtml(mappedToName)}</div>`
                                : `<div class="chip">Не замаплено</div>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Показуємо модалку
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = modalHtml;
    const modalOverlay = tempContainer.firstElementChild;
    document.body.appendChild(modalOverlay);

    // Обробники
    const closeBtn = modalOverlay.querySelector('.modal-close-btn');
    const closeThisModal = () => modalOverlay.remove();

    closeBtn.addEventListener('click', closeThisModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeThisModal();
    });
}
