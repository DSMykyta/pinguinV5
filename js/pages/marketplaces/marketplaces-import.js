// js/pages/marketplaces/marketplaces-import.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MARKETPLACES - IMPORT PLUGIN                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  ПЛАГІН — Імпорт даних з файлів (Excel, CSV)                           ║
 * ║                                                                          ║
 * ║  ЗАЛЕЖНОСТІ:                                                             ║
 * ║  - marketplaces-state.js (state, hooks)                                  ║
 * ║  - ../../data/ (API операції)                                           ║
 * ║  - marketplaces-table.js (рендеринг)                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

let _state = null;
import { registerHook, runHook } from './marketplaces-plugins.js';
import {
    getCategories, getCharacteristics, getOptions
} from '../../data/entities-data.js';
import { getMarketplaces } from '../../data/marketplaces-data.js';
import {
    getMpCategories, getMpCharacteristics, getMpOptions,
    loadMpCharacteristics, loadMpOptions
} from '../../data/mp-data.js';
import {
    getMapCategories, getMapCharacteristics, getMapOptions,
    isMpCharacteristicMapped, isMpOptionMapped, isMpCategoryMapped,
    batchCreateCharacteristicMapping, batchCreateOptionMapping, batchCreateCategoryMapping,
    autoMapCharacteristics, autoMapOptions
} from '../../data/mappings-data.js';
import { getBatchBar } from '../../components/actions/actions-batch.js';
import { showModal, closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { showLoader, hideLoader } from '../../components/feedback/loading.js';
import { initCustomSelects, reinitializeCustomSelect } from '../../components/forms/select.js';
import { escapeHtml } from '../../utils/utils-text.js';

export const PLUGIN_NAME = 'marketplaces-import';

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
 */
function normalizeIsGlobal(value) {
    if (value === true || value === 'TRUE') return 'TRUE';
    const strVal = String(value || '').toLowerCase().trim();
    const trueValues = ['true', '1', 'так', 'yes', '+', 'да'];
    return trueValues.includes(strVal) ? 'TRUE' : 'FALSE';
}

/**
 * Ініціалізація плагіна
 */
export function init(state) {
    _state = state;
    registerHook('onDataLoaded', handleDataLoaded);
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

    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

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
            handleFilesSelect([...files]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFilesSelect([...e.target.files]);
        }
    });
}

async function handleFilesSelect(files) {
    if (files.length === 1) {
        await handleSingleFile(files[0]);
        return;
    }

    // Масовий імпорт
    const importBtn = document.getElementById('execute-mapper-import');
    const fileNameEl = document.getElementById('mapper-import-filename');
    const modalContent = document.querySelector('#modal-mapper-import .modal-body');

    if (importBtn) importBtn.disabled = true;

    const total = files.length;
    let success = 0;
    let failed = 0;

    const loader = showLoader(modalContent, {
        type: 'progress',
        message: `Масовий імпорт: 0/${total}...`,
        overlay: true
    });

    for (let i = 0; i < total; i++) {
        const file = files[i];
        const pct = Math.round((i / total) * 100);
        loader.updateProgress(pct, `Файл ${i + 1}/${total}: ${file.name}`);

        try {
            await handleSingleFile(file);
            applyHeaderRowSilent();
            await executeSingleFileImport();
            success++;
        } catch (err) {
            console.error(`Помилка імпорту файлу ${file.name}:`, err);
            failed++;
        }
    }

    loader.updateProgress(100, 'Масовий імпорт завершено!');
    setTimeout(() => {
        loader.hide();
        const msg = `Імпорт завершено: ${success} успішно` + (failed ? `, ${failed} з помилками` : '');
        showToast(msg, failed ? 'warning' : 'success');
        if (fileNameEl) fileNameEl.textContent = `${success}/${total} файлів імпортовано`;
        if (importBtn) importBtn.disabled = false;
        runHook('onDataChanged');
    }, 500);
}

async function handleSingleFile(file) {
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
        console.error('Помилка парсингу файлу:', error);
        showToast('Помилка читання файлу', 'error');
        throw error;
    }
}

async function executeSingleFileImport() {
    if (importState.adapter?.onBeforeImport) {
        await importState.adapter.onBeforeImport(importState, () => {});
    }

    if (importState.adapter?.executeImport) {
        await importState.adapter.executeImport(importState, () => {});
    } else {
        await importCharacteristicsAndOptions(() => {});
    }

    if (importState.file && importState.marketplaceId) {
        try {
            await saveReferenceFileToDrive(importState);
        } catch (err) {
            console.warn('Не вдалося зберегти довідник на Drive:', err);
        }
    }
}

function applyHeaderRowSilent() {
    const headerRow = importState.headerRow || 2;

    importState.mapping = {};

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

    autoDetectMappingSilent(headers);

    if (importState.adapter?.getFixedMapping) {
        const fixedMapping = importState.adapter.getFixedMapping(headers);
        if (fixedMapping) {
            Object.assign(importState.mapping, fixedMapping);
        }
    }

    validateImport();
}

function autoDetectMappingSilent(headers) {
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

function parseCSVRaw(file) {
    return new Promise((resolve, reject) => {
        if (typeof Papa === 'undefined') {
            reject(new Error('PapaParse library not loaded'));
            return;
        }

        Papa.parse(file, {
            header: false,
            skipEmptyLines: false,
            complete: (results) => {
                if (results.data.length === 0) {
                    reject(new Error('Файл порожній'));
                    return;
                }

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

                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

                if (jsonData.length === 0) {
                    reject(new Error('Файл порожній'));
                    return;
                }

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

async function saveReferenceFileToDrive(state) {
    const { uploadReferenceFile, callSheetsAPI } = await import('../../utils/utils-api-client.js');
    const { loadMpCategories, getMpCategories } = await import('../../data/mp-data.js');

    const marketplace = getMarketplaces().find(m => m.id === state.marketplaceId);
    if (!marketplace?.slug) return;

    const result = await uploadReferenceFile(state.file, marketplace.slug);
    if (!result?.fileId) return;

    const adapterCategory = state.adapter?.getCategory?.(state) || null;
    if (!adapterCategory?.id) return;

    await loadMpCategories();
    const mpCats = getMpCategories();
    const mpCat = mpCats.find(c =>
        c.marketplace_id === state.marketplaceId &&
        c.external_id === adapterCategory.id
    );

    if (!mpCat?._rowIndex) return;

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

        if (importState.adapter?.executeImport) {
            await importState.adapter.executeImport(importState, (p, m) => loader.updateProgress(p, m));
        } else {
            await importCharacteristicsAndOptions((percent, msg) => {
                loader.updateProgress(20 + percent * 0.75, msg);
            });
        }

        if (importState.file && importState.marketplaceId) {
            loader.updateProgress(95, 'Збереження довідника на Google Drive...');
            try {
                await saveReferenceFileToDrive(importState);
            } catch (err) {
                console.warn('Не вдалося зберегти довідник на Drive:', err);
            }
        }

        loader.updateProgress(100, 'Імпорт завершено!');

        setTimeout(() => {
            loader.hide();
            showToast('Імпорт завершено успішно!', 'success');
            closeModal();
            runHook('onDataChanged');
        }, 500);
    } catch (error) {
        console.error('Помилка імпорту:', error);
        loader.hide();
        showToast(`Помилка імпорту: ${error.message}`, 'error');
    } finally {
        if (importBtn) {
            importBtn.disabled = false;
            importBtn.textContent = 'Імпортувати';
        }
    }
}

async function importCharacteristicsAndOptions(onProgress = () => { }) {
    const { callSheetsAPI } = await import('../../utils/utils-api-client.js');

    onProgress(10, 'Обробка даних файлу...');

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

    const adapterCategory = importState.adapter?.getCategory?.(importState) || null;

    const mpCharacteristics = new Map();
    const mpOptions = [];

    importState.parsedData.forEach(row => {
        const charId = charIdCol !== undefined ? String(row[charIdCol] || '').trim() : '';
        const charName = charNameCol !== undefined ? String(row[charNameCol] || '').trim() : '';

        if (charId && charName) {
            if (!mpCharacteristics.has(charId)) {
                const catId = adapterCategory
                    ? adapterCategory.id
                    : (categoryIdCol !== undefined ? String(row[categoryIdCol] || '').trim() : '');
                const catName = adapterCategory
                    ? adapterCategory.name
                    : (categoryNameCol !== undefined ? String(row[categoryNameCol] || '').trim() : '');

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

        const optionId = optionIdCol !== undefined ? String(row[optionIdCol] || '').trim() : '';
        const optionName = optionNameCol !== undefined ? String(row[optionNameCol] || '').trim() : '';

        if (optionId && optionName && charId) {
            const exists = mpOptions.some(o =>
                o.mp_char_id === charId && o.mp_option_id === optionId
            );
            if (!exists) {
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

    const { loadMpCharacteristics: reloadMpChars, loadMpOptions: reloadMpOpts, getMpCharacteristics: freshMpChars, getMpOptions: freshMpOpts } = await import('../../data/mp-data.js');
    await reloadMpChars();
    await reloadMpOpts();

    const existingChars = freshMpChars();
    const existingOpts = freshMpOpts();

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

    const newCharacteristics = characteristicsList.filter(c => !existingCharIds.has(c.mp_char_id));
    const newOptions = mpOptions.filter(o => !existingOptIds.has(`${o.mp_char_id}-${o.mp_option_id}`));

    const charsToMergeCategories = characteristicsList.filter(c => {
        if (!existingCharIds.has(c.mp_char_id)) return false;
        if (!c.mp_category_id) return false;

        const existingChar = existingChars.find(ec =>
            ec.marketplace_id === importState.marketplaceId &&
            ec.external_id === c.mp_char_id
        );
        if (!existingChar) return false;

        const existingCatIds = (existingChar.category_id || '').split(',').map(id => id.trim()).filter(id => id);
        return !existingCatIds.includes(c.mp_category_id);
    });

    if (charsToMergeCategories.length > 0) {
        onProgress(40, `Оновлення ${charsToMergeCategories.length} існуючих характеристик з новими категоріями...`);

        const timestamp = new Date().toISOString();

        for (const newChar of charsToMergeCategories) {
            const existingChar = existingChars.find(ec =>
                ec.marketplace_id === importState.marketplaceId &&
                ec.external_id === newChar.mp_char_id
            );
            if (!existingChar || !existingChar._rowIndex) continue;

            const existingCatIds = (existingChar.category_id || '').split(',').map(id => id.trim()).filter(id => id);
            const existingCatNames = (existingChar.category_name || '').split(',').map(n => n.trim()).filter(n => n);

            if (!existingCatIds.includes(newChar.mp_category_id)) {
                existingCatIds.push(newChar.mp_category_id);
                if (newChar.mp_category_name) {
                    existingCatNames.push(newChar.mp_category_name);
                }
            }

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
        }
    }

    onProgress(50, `Запис ${newCharacteristics.length} нових характеристик...`);

    if (newCharacteristics.length > 0) {
        const timestamp = new Date().toISOString();
        const charRows = newCharacteristics.map((c) => {
            const uniqueId = `mpc-${importState.marketplaceId}-${c.mp_char_id}`;

            const data = {
                id: c.mp_char_id,
                name: c.mp_char_name || '',
                ...(c._rawData || {}),
                category_id: c.mp_category_id || '',
                category_name: c.mp_category_name || ''
            };

            if (c.mp_char_is_global) {
                data.is_global = normalizeIsGlobal(c.mp_char_is_global);
            }

            if (importState.adapter?.normalizeCharacteristicData) {
                importState.adapter.normalizeCharacteristicData(data);
            }

            const dataJson = JSON.stringify(data);

            return [
                uniqueId,
                importState.marketplaceId,
                c.mp_char_id,
                'import',
                dataJson,
                timestamp,
                timestamp
            ];
        });

        await callSheetsAPI('append', {
            range: 'Mapper_MP_Characteristics!A:G',
            values: charRows,
            spreadsheetType: 'main'
        });
    }

    onProgress(75, `Запис ${newOptions.length} нових опцій...`);

    if (newOptions.length > 0) {
        const timestamp = new Date().toISOString();
        const optRows = newOptions.map(o => {
            const uniqueId = `mpo-${importState.marketplaceId}-${o.mp_char_id}-${o.mp_option_id}`;

            const data = {
                id: o.mp_option_id,
                char_id: o.mp_char_id || '',
                name: o.mp_option_name || '',
                ...(o._rawData || {})
            };

            if (importState.adapter?.normalizeOptionData) {
                importState.adapter.normalizeOptionData(data);
            }

            const dataJson = JSON.stringify(data);

            return [
                uniqueId,
                importState.marketplaceId,
                o.mp_option_id,
                'import',
                dataJson,
                timestamp,
                timestamp
            ];
        });

        await callSheetsAPI('append', {
            range: 'Mapper_MP_Options!A:G',
            values: optRows,
            spreadsheetType: 'main'
        });
    }

    onProgress(100, 'Готово!');
}

// ═══════════════════════════════════════════════════════════════════════════
// HEADLESS IMPORT
// ═══════════════════════════════════════════════════════════════════════════

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
        const rawData = await parseFileRaw(file);
        importState.rawData = rawData;

        adapter.onFileLoaded(file, rawData, importState);

        importState._adapterData = importState._adapterData || {};
        importState._adapterData.category = {
            id: mpCategory.external_id,
            name: mpCategory.name || mpCategory.external_id
        };

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

        autoDetectMappingSilent(headers);

        if (adapter.getFixedMapping) {
            const fixed = adapter.getFixedMapping(headers);
            if (fixed) Object.assign(importState.mapping, fixed);
        }

        if (adapter.onBeforeImport) {
            await adapter.onBeforeImport(importState, () => {});
        }

        await importCharacteristicsAndOptions(() => {});

        const { loadMpCharacteristics: reloadChars, loadMpOptions: reloadOpts } = await import('../../data/mp-data.js');
        await reloadChars();
        await reloadOpts();

    } finally {
        importState = savedState;
    }
}
