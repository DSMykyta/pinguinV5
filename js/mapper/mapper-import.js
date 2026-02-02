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
 * ║  - Rozetka XML (спеціальний формат)                                      ║
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
    addCategory, addCharacteristic, addOption,
    getCategories, getCharacteristics, getOptions, getMarketplaces,
    getMpCategories, getMpCharacteristics, getMpOptions,
    updateMarketplace
} from './mapper-data.js';
import { renderCurrentTab } from './mapper-table.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { initCustomSelects, reinitializeCustomSelect } from '../common/ui-select.js';
import { escapeHtml } from '../utils/text-utils.js';

export const PLUGIN_NAME = 'mapper-import';

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
    rawData: [],        // Сирі дані з файлу (всі рядки)
    parsedData: [],     // Дані після визначення заголовків
    fileHeaders: [],
    mapping: {},
    marketplaceId: null,
    dataType: 'characteristics',
    importTarget: 'marketplace',  // 'marketplace' або 'own'
    headerRow: 1,       // Номер рядка із заголовками (1-based)
    // Rozetka-специфічні поля
    isRozetkaFormat: false,
    rozetkaCategory: null  // { id, name } - категорія з файлу Rozetka
};

/**
 * Показати модальне вікно імпорту
 */
export async function showImportModal() {

    // Скинути стан
    importState = {
        file: null,
        rawData: [],
        parsedData: [],
        fileHeaders: [],
        mapping: {},
        marketplaceId: null,
        dataType: null,  // Користувач має обрати: categories, characteristics, options
        importTarget: 'marketplace',
        headerRow: 1,
        isRozetkaFormat: false,
        rozetkaCategory: null
    };

    await showModal('mapper-import', null);

    // Ініціалізувати кастомні селекти в модальному вікні
    const modalEl = document.getElementById('modal-mapper-import');
    if (modalEl) initCustomSelects(modalEl);

    const marketplaceSelect = document.getElementById('mapper-import-marketplace');
    if (marketplaceSelect) {
        populateMarketplaceSelect(marketplaceSelect);
        // Слухаємо зміну призначення (маркетплейс або свій довідник)
        marketplaceSelect.addEventListener('change', handleMarketplaceChange);
    }

    // Селектор типу даних
    const dataTypeSelect = document.getElementById('mapper-import-datatype');
    if (dataTypeSelect) {
        dataTypeSelect.addEventListener('change', (e) => {
            importState.dataType = e.target.value;
            importState.mapping = {}; // Скидаємо маппінг при зміні типу
            updateMappingSections();
            validateImport();
        });
    }

    // Ініціалізувати drag & drop для файлу
    initFileDropzone();

    // Кнопка імпорту
    const importBtn = document.getElementById('execute-mapper-import');
    if (importBtn) {
        importBtn.addEventListener('click', executeImport);
    }

    // Кнопка застосування рядка заголовків
    const applyHeaderBtn = document.getElementById('apply-header-row');
    if (applyHeaderBtn) {
        applyHeaderBtn.addEventListener('click', applyHeaderRow);
    }
}

function populateMarketplaceSelect(select) {
    const marketplaces = getMarketplaces();

    // Спочатку базові опції
    select.innerHTML = `
        <option value="">— Оберіть призначення —</option>
        <option value="own">📁 Свій довідник</option>
    `;

    // Додаємо активні маркетплейси
    marketplaces.forEach(mp => {
        if (mp.is_active === true || String(mp.is_active).toLowerCase() === 'true') {
            const option = document.createElement('option');
            option.value = mp.id;
            option.textContent = mp.name || mp.slug;
            select.appendChild(option);
        }
    });

    // Оновити кастомний селект після заповнення
    reinitializeCustomSelect(select);
}

function handleMarketplaceChange(e) {
    const selectedValue = e.target.value;
    const dataTypeGroup = document.getElementById('mapper-import-datatype')?.closest('.form-group');

    if (selectedValue === 'own') {
        // Обрано "Свій довідник"
        importState.importTarget = 'own';
        importState.marketplaceId = 'own';
        importState.isRozetkaFormat = false;
        // Для власного довідника показуємо вибір типу даних
        if (dataTypeGroup) dataTypeGroup.classList.remove('u-hidden');
    } else {
        // Обрано маркетплейс
        importState.importTarget = 'marketplace';
        importState.marketplaceId = selectedValue;

        // Перевіряємо чи це Rozetka
        const marketplaces = getMarketplaces();
        const mp = marketplaces.find(m => m.id === selectedValue);
        const isRozetka = mp && (
            mp.slug?.toLowerCase() === 'rozetka' ||
            mp.name?.toLowerCase().includes('rozetka')
        );

        importState.isRozetkaFormat = isRozetka;

        if (isRozetka) {
            // Для Rozetka ховаємо вибір типу - все визначається автоматично
            if (dataTypeGroup) dataTypeGroup.classList.add('u-hidden');
            importState.dataType = 'rozetka_pack'; // Спеціальний тип для Rozetka
        } else {
            // Для інших маркетплейсів показуємо вибір типу
            if (dataTypeGroup) dataTypeGroup.classList.remove('u-hidden');
        }

    }

    // Скидаємо маппінг при зміні призначення
    importState.mapping = {};
    importState.rozetkaCategory = null;

    // Перевіряємо чи є збережений маппінг для цього маркетплейса
    const hasSavedMapping = selectedValue && selectedValue !== 'own' && checkHasSavedMapping(selectedValue);

    // Оновлюємо секції (створює селекти), пропускаємо автодетект якщо є збережений маппінг
    updateMappingSections(hasSavedMapping);

    // Завантажуємо збережений маппінг (якщо є) і застосовуємо до селектів
    if (hasSavedMapping) {
        loadSavedMapping(selectedValue);
    }

    validateImport();
    updatePreviewTable();
}

function handleDataTypeChange(e) {
    importState.dataType = e.target.value;
    importState.mapping = {}; // Скидаємо маппінг при зміні типу
    updateMappingSections();
}

function handleTargetChange(e) {
    importState.importTarget = e.target.value;
    importState.mapping = {}; // Скидаємо маппінг при зміні призначення

    // Якщо обрано свій довідник - вимкнути вибір маркетплейса
    const mpSelect = document.getElementById('mapper-import-marketplace');
    const mpGroup = document.getElementById('marketplace-select-group');

    if (importState.importTarget === 'own') {
        mpGroup?.classList.add('u-hidden');
        importState.marketplaceId = 'own'; // Псевдо ID для валідації
    } else {
        mpGroup?.classList.remove('u-hidden');
        importState.marketplaceId = mpSelect?.value || null;
    }

    // Перегенеровуємо маппінг з новими полями
    updateMappingSections();
}

function updateMappingSections(skipAutoDetect = false) {
    // При зміні типу імпорту перегенеровуємо маппінг якщо є дані
    if (importState.fileHeaders.length > 0) {
        populateColumnSelects(importState.fileHeaders);
        // Автодетект тільки якщо не буде завантажуватись збережений маппінг
        if (!skipAutoDetect) {
            autoDetectMapping(importState.fileHeaders);
        }
    }
}

function checkHasSavedMapping(marketplaceId) {
    const marketplaces = getMarketplaces();
    const mp = marketplaces.find(m => m.id === marketplaceId);

    if (mp && mp.column_mapping) {
        try {
            const savedMapping = JSON.parse(mp.column_mapping);
            return savedMapping[importState.dataType] && Object.keys(savedMapping[importState.dataType]).length > 0;
        } catch (e) {
            return false;
        }
    }
    return false;
}

function loadSavedMapping(marketplaceId) {
    const marketplaces = getMarketplaces();
    const mp = marketplaces.find(m => m.id === marketplaceId);

    if (mp && mp.column_mapping) {
        try {
            const savedMapping = JSON.parse(mp.column_mapping);
            if (savedMapping[importState.dataType]) {
                importState.mapping = savedMapping[importState.dataType];
                applyMappingToSelects();
            }
        } catch (e) {
            console.warn('⚠️ Помилка парсингу збереженого маппінгу:', e);
        }
    }
}

function applyMappingToSelects() {
    // Використовуємо нову функцію для динамічних селектів
    applyDynamicMappingToSelects();
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
    if (fileNameEl) {
        fileNameEl.textContent = file.name;
    }

    importState.file = file;

    try {
        // Парсимо файл і зберігаємо сирі дані
        const rawData = await parseFileRaw(file);
        importState.rawData = rawData;

        // Для Rozetka - парсимо категорію з файлу і пропускаємо налаштування
        if (importState.isRozetkaFormat) {
            parseRozetkaCategory(file.name, rawData);
            // Для Rozetka заголовки в рядку 2
            importState.headerRow = 2;

            // Приховуємо елементи налаштування - не потрібні для Rozetka
            document.getElementById('header-row-group')?.classList.add('u-hidden');
            document.getElementById('import-step-2')?.classList.add('u-hidden');

            // Застосовуємо рядок заголовків (це також виконає autoDetectMapping)
            applyHeaderRowSilent();

            showToast(`Файл Rozetka прочитано: ${rawData.length - 2} записів`, 'success');
        } else {
            // Показуємо вибір рядка заголовків для інших форматів
            document.getElementById('header-row-group')?.classList.remove('u-hidden');

            // Скидаємо до рядка 1
            const headerRowInput = document.getElementById('mapper-import-header-row');
            if (headerRowInput) {
                headerRowInput.value = 1;
                headerRowInput.max = rawData.length;
            }
            importState.headerRow = 1;

            // Застосовуємо рядок заголовків
            applyHeaderRow();

            showToast(`Файл прочитано: ${rawData.length} рядків`, 'success');
        }

    } catch (error) {
        console.error('❌ Помилка парсингу файлу:', error);
        showToast('Помилка читання файлу', 'error');
    }
}

/**
 * Парсинг категорії Rozetka з назви файлу та першого рядка
 * Файл: category_report_274390.xlsx
 * Рядок 1: "Натуральные добавки и экстракты"
 */
function parseRozetkaCategory(fileName, rawData) {
    // Витягуємо ID категорії з назви файлу
    // Формат: category_report_274390.xlsx або category_report_274390
    const match = fileName.match(/category_report_(\d+)/i);
    const categoryId = match ? match[1] : null;

    // Назва категорії - перший рядок, перша колонка
    const categoryName = rawData[0]?.[0] || '';

    importState.rozetkaCategory = {
        id: categoryId,
        name: categoryName.trim()
    };


    // Показуємо інформацію про категорію
    showRozetkaCategoryInfo();
}

/**
 * Показати інформацію про категорію Rozetka
 */
function showRozetkaCategoryInfo() {
    const filenameEl = document.getElementById('mapper-import-filename');
    if (!filenameEl || !importState.rozetkaCategory) return;

    // Видаляємо попередню інформацію про категорію
    const existingInfo = document.getElementById('rozetka-category-info');
    if (existingInfo) existingInfo.remove();

    const { id, name } = importState.rozetkaCategory;

    const infoEl = document.createElement('div');
    infoEl.id = 'rozetka-category-info';
    infoEl.className = 'rozetka-category-info u-mt-8';
    infoEl.innerHTML = `
        <div class="info-badge info-badge-primary">
            <span class="material-symbols-outlined">category</span>
            <span><strong>Категорія:</strong> ${name || 'Не визначено'} ${id ? `(ID: ${id})` : ''}</span>
        </div>
    `;

    filenameEl.insertAdjacentElement('afterend', infoEl);
}

/**
 * Застосувати вибраний рядок заголовків
 */
function applyHeaderRow() {
    const headerRowInput = document.getElementById('mapper-import-header-row');
    const headerRow = parseInt(headerRowInput?.value || '1', 10);

    if (headerRow < 1 || headerRow > importState.rawData.length) {
        showToast('Невірний номер рядка', 'error');
        return;
    }

    importState.headerRow = headerRow;
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


    // Показуємо крок 2 (маппінг)
    document.getElementById('import-step-2')?.classList.remove('u-hidden');

    // Заповнюємо селекти колонок
    populateColumnSelects(headers);

    // Спробуємо автоматично визначити маппінг
    autoDetectMapping(headers);
}

/**
 * Застосувати рядок заголовків без показу UI (для Rozetka формату)
 * Rozetka формат має фіксовану структуру, тому маппінг виконується автоматично
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

    // Валідуємо імпорт (активує кнопку якщо все OK)
    validateImport();
}

/**
 * Автоматичне визначення маппінгу без UI (для Rozetka формату)
 */
function autoDetectMappingSilent(headers) {
    const patterns = {
        char_id: ['id параметра', 'id характеристики', 'характеристика id', 'attr_id', 'attribute_id', 'characteristic_id', 'param_id', 'ідентифікатор параметра'],
        char_name: ['назва параметра', 'назва характеристики', 'характеристика', 'attribute', 'param_name', 'attribute_name', 'параметр'],
        char_type: ['тип параметра', 'тип характеристики', 'param_type', 'attribute_type'],
        char_filter_type: ['тип фільтра', 'filter_type', 'фільтр'],
        char_unit: ['одиниця', 'одиниця виміру', 'unit', 'од.'],
        char_is_global: ['наскрізний', 'глобальний', 'is_global', 'global'],
        option_id: ['id значення', 'id опції', 'опція id', 'option_id', 'value_id'],
        option_name: ['назва значення', 'назва опції', 'опція', 'option', 'value', 'значення'],
        category_id: ['id категорії', 'категорія id', 'category_id', 'cat_id'],
        category_name: ['назва категорії', 'категорія', 'category', 'cat_name']
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
    console.log('🔄 Rozetka auto-mapping:', detectedMapping);
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
    const fields = {
        // Дані маркетплейса - характеристики + опції
        marketplace_characteristics: [
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
        ],
        // Дані маркетплейса - категорії
        marketplace_categories: [
            { key: 'cat_id', label: 'ID категорії', required: true },
            { key: 'cat_name', label: 'Назва категорії', required: true },
            { key: 'parent_id', label: 'ID батьківської категорії', required: false },
            { key: 'parent_name', label: 'Назва батьківської категорії', required: false }
        ],
        // Свій довідник - характеристики + опції
        // Поля БД: id, name_ua, name_ru, type, unit, filter_type, is_global, category_ids, parent_option_id, created_at
        // id та created_at генеруються автоматично
        own_characteristics: [
            { key: 'own_char_name_ua', label: 'name_ua (Назва UA)', required: true },
            { key: 'own_char_name_ru', label: 'name_ru (Назва RU)', required: false },
            { key: 'own_char_type', label: 'type (Тип параметра)', required: false },
            { key: 'own_char_unit', label: 'unit (Одиниця виміру)', required: false },
            { key: 'own_char_filter_type', label: 'filter_type (Тип фільтра)', required: false },
            { key: 'own_char_is_global', label: 'is_global (Наскрізний)', required: false },
            { key: 'own_char_category_ids', label: 'category_ids (ID категорій)', required: false },
            { key: 'own_option_value_ua', label: 'Опція: value_ua', required: false },
            { key: 'own_option_value_ru', label: 'Опція: value_ru', required: false },
            { key: 'own_option_parent_id', label: 'Опція: parent_option_id', required: false }
        ],
        // Свій довідник - категорії
        // id та created_at генеруються автоматично
        own_categories: [
            { key: 'own_cat_name_ua', label: 'Назва категорії (UA)', required: true },
            { key: 'own_cat_name_ru', label: 'Назва категорії (RU)', required: false },
            { key: 'own_cat_parent', label: 'Батьківська категорія', required: false }
        ],
        // Rozetka пакет - характеристики + опції (категорія береться з файлу автоматично)
        marketplace_rozetka_pack: [
            { key: 'char_id', label: 'ID характеристики', required: true },
            { key: 'char_name', label: 'Назва характеристики', required: true },
            { key: 'char_type', label: 'Тип параметра', required: false },
            { key: 'char_filter_type', label: 'Тип фільтра', required: false },
            { key: 'char_unit', label: 'Одиниця виміру', required: false },
            { key: 'char_is_global', label: 'Наскрізний параметр', required: false },
            { key: 'option_id', label: 'ID опції/значення', required: false },
            { key: 'option_name', label: 'Назва опції/значення', required: false }
        ]
    };

    const key = `${importState.importTarget}_${importState.dataType}`;
    return fields[key] || [];
}

/**
 * Генерувати динамічний маппінг для колонок файлу
 */
function populateColumnSelects(headers) {
    const container = document.getElementById('dynamic-mapping-container');
    if (!container) return;

    // Отримуємо доступні поля системи
    const systemFields = getSystemFields();

    // Очищаємо контейнер (залишаємо заголовок)
    const headerRow = container.querySelector('.mapping-header');
    container.innerHTML = '';
    if (headerRow) container.appendChild(headerRow);

    // Генеруємо рядок для кожної колонки з файлу
    headers.forEach((header, idx) => {
        // Отримуємо приклад даних (перші 3 значення)
        const sampleValues = importState.parsedData
            .slice(0, 3)
            .map(row => row[header.index] || '')
            .filter(v => v)
            .join(', ');

        const row = document.createElement('div');
        row.className = 'mapping-row';
        row.innerHTML = `
            <div class="mapping-label">
                <strong>${header.name}</strong>
            </div>
            <div class="mapping-select">
                <select data-column-index="${header.index}" data-custom-select>
                    <option value="">— Пропустити —</option>
                    ${systemFields.map(f => `
                        <option value="${f.key}"${f.required ? ' data-required="true"' : ''}>
                            ${f.label}${f.required ? ' *' : ''}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="mapping-preview">${sampleValues || '—'}</div>
        `;

        container.appendChild(row);

        // Ініціалізуємо кастомний селект
        const select = row.querySelector('select');
        if (select) {
            reinitializeCustomSelect(select);
            select.addEventListener('change', handleDynamicMappingChange);
        }
    });
}

/**
 * Обробник зміни динамічного маппінгу
 */
function handleDynamicMappingChange(e) {
    const columnIndex = parseInt(e.target.dataset.columnIndex, 10);
    const systemField = e.target.value;

    // Видаляємо старе призначення цього поля (якщо було)
    Object.keys(importState.mapping).forEach(field => {
        if (importState.mapping[field] === columnIndex) {
            delete importState.mapping[field];
        }
    });

    // Додаємо нове призначення
    if (systemField) {
        // Видаляємо це поле з іншої колонки (якщо було)
        Object.keys(importState.mapping).forEach(field => {
            if (field === systemField) {
                // Скидаємо селект іншої колонки
                const oldSelect = document.querySelector(`select[data-column-index="${importState.mapping[field]}"]`);
                if (oldSelect && oldSelect !== e.target) {
                    oldSelect.value = '';
                    reinitializeCustomSelect(oldSelect);
                }
            }
        });

        importState.mapping[systemField] = columnIndex;
    }

    validateImport();
    updatePreviewTable();
}

/**
 * Автоматичне визначення маппінгу
 */
function autoDetectMapping(headers) {
    // Ключові слова для автодетекту - розширений список
    const patterns = {
        // Маркетплейс - характеристики
        char_id: ['id параметра', 'id характеристики', 'характеристика id', 'attr_id', 'attribute_id', 'characteristic_id', 'param_id', 'ідентифікатор параметра'],
        char_name: ['назва параметра', 'назва характеристики', 'характеристика', 'attribute', 'param_name', 'attribute_name', 'параметр'],
        char_type: ['тип параметра', 'тип характеристики', 'param_type', 'attribute_type'],
        char_filter_type: ['тип фільтра', 'filter_type', 'фільтр'],
        char_unit: ['одиниця', 'одиниця виміру', 'unit', 'од.'],
        char_is_global: ['наскрізний', 'глобальний', 'is_global', 'global'],
        option_id: ['id значення', 'id опції', 'опція id', 'option_id', 'value_id'],
        option_name: ['назва значення', 'назва опції', 'опція', 'option', 'value', 'значення'],
        category_id: ['id категорії', 'категорія id', 'category_id', 'cat_id'],
        category_name: ['назва категорії', 'категорія', 'category', 'cat_name'],

        // Маркетплейс - категорії
        cat_id: ['id категорії', 'категорія id', 'category_id', 'cat_id'],
        cat_name: ['назва категорії', 'категорія', 'category', 'cat_name', 'назва'],
        parent_id: ['id батьківської', 'parent_id', 'parent', 'батьківська id'],
        parent_name: ['батьківська категорія', 'parent_name', 'parent category', 'батьківська'],

        // Свій довідник - характеристики (поля БД)
        own_char_name_ua: ['name_ua', 'назва ua', 'назва укр', 'назва'],
        own_char_name_ru: ['name_ru', 'назва ru', 'назва рус'],
        own_char_type: ['type', 'тип параметра', 'тип'],
        own_char_unit: ['unit', 'одиниця', 'од.'],
        own_char_filter_type: ['filter_type', 'тип фільтра', 'filter'],
        own_char_is_global: ['is_global', 'наскрізний', 'глобальний', 'global'],
        own_char_category_ids: ['category_ids', 'id категорій', 'категорії'],
        own_option_value_ua: ['value_ua', 'значення ua', 'значення', 'опція'],
        own_option_value_ru: ['value_ru', 'значення ru'],
        own_option_parent_id: ['parent_option_id', 'parent_id', 'батьківська опція'],

        // Свій довідник - категорії (id генерується автоматично)
        own_cat_name_ua: ['назва ua', 'назва укр', 'name_ua', 'назва'],
        own_cat_name_ru: ['назва ru', 'назва рус', 'name_ru'],
        own_cat_parent: ['батьківська', 'parent', 'parent_id']
    };

    // Отримуємо доступні поля для поточного типу імпорту
    const availableFields = getSystemFields().map(f => f.key);

    const detectedMapping = {};

    // Для кожного заголовка шукаємо відповідне поле
    headers.forEach(header => {
        const headerLower = header.name.toLowerCase().trim();

        // Шукаємо серед доступних полів
        for (const field of availableFields) {
            if (detectedMapping[field] !== undefined) continue; // вже призначено

            const fieldPatterns = patterns[field] || [];

            // Перевіряємо чи заголовок містить один з паттернів
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

    // Застосувати автодетект якщо немає збереженого маппінгу
    if (Object.keys(importState.mapping).length === 0) {
        importState.mapping = detectedMapping;
        applyDynamicMappingToSelects();
    }

    validateImport();
    updatePreviewTable();
}

/**
 * Застосувати маппінг до динамічних селектів
 */
function applyDynamicMappingToSelects() {
    Object.entries(importState.mapping).forEach(([systemField, columnIndex]) => {
        const select = document.querySelector(`select[data-column-index="${columnIndex}"]`);
        if (select) {
            select.value = systemField;
            reinitializeCustomSelect(select);
        }
    });
}

/**
 * Обробник зміни маппінгу (старий - для сумісності)
 */
function handleMappingChange(e) {
    const field = e.target.dataset.mappingField;
    const columnIndex = e.target.value;

    if (columnIndex === '') {
        delete importState.mapping[field];
    } else {
        importState.mapping[field] = parseInt(columnIndex, 10);
    }

    validateImport();
    updatePreviewTable();
}

/**
 * Перевірити валідність імпорту
 */
function validateImport() {
    const importBtn = document.getElementById('execute-mapper-import');
    if (!importBtn) return;

    let isValid = true;

    // Перевіряємо чи обрано тип даних
    if (!importState.dataType) {
        isValid = false;
    }

    // Отримуємо обов'язкові поля з системних полів
    const systemFields = getSystemFields();
    const requiredFields = systemFields.filter(f => f.required).map(f => f.key);

    // Перевіряємо чи обрано маркетплейс (якщо імпортуємо для маркетплейса)
    if (importState.importTarget === 'marketplace' && !importState.marketplaceId) {
        isValid = false;
    }

    // Перевіряємо обов'язкові поля
    requiredFields.forEach(field => {
        if (importState.mapping[field] === undefined) {
            isValid = false;
        }
    });

    // Перевіряємо чи є дані
    if (importState.parsedData.length === 0) {
        isValid = false;
    }

    importBtn.disabled = !isValid;

    // Оновлюємо візуальну індикацію обов'язкових полів
    updateRequiredFieldsIndicator(requiredFields);
}

/**
 * Оновити індикатор заповнення обов'язкових полів
 */
function updateRequiredFieldsIndicator(requiredFields) {
    const container = document.getElementById('dynamic-mapping-container');
    if (!container) return;

    // Скидаємо всі попередні підсвітки
    container.querySelectorAll('.mapping-row').forEach(row => {
        row.classList.remove('mapping-row-missing', 'mapping-row-filled');
    });

    // Підсвічуємо заповнені/незаповнені обов'язкові поля
    requiredFields.forEach(field => {
        const columnIndex = importState.mapping[field];
        if (columnIndex !== undefined) {
            const select = container.querySelector(`select[data-column-index="${columnIndex}"]`);
            if (select) {
                select.closest('.mapping-row')?.classList.add('mapping-row-filled');
            }
        }
    });

    // Показуємо які обов'язкові поля ще не призначені
    const missingFields = requiredFields.filter(f => importState.mapping[f] === undefined);
    if (missingFields.length > 0) {
        const systemFields = getSystemFields();
        const missingLabels = missingFields.map(f => {
            const sf = systemFields.find(s => s.key === f);
            return sf ? sf.label : f;
        });
    }
}

/**
 * Оновити таблицю попереднього перегляду
 */
function updatePreviewTable() {
    const previewContainer = document.getElementById('mapper-import-preview');
    const thead = document.getElementById('preview-table-head');
    const tbody = document.getElementById('preview-table-body');

    if (!thead || !tbody) return;

    // Отримуємо активні маппінги (тільки ті поля, які призначені)
    const systemFields = getSystemFields();
    const activeMapping = Object.entries(importState.mapping)
        .filter(([field]) => systemFields.some(sf => sf.key === field))
        .map(([field, colIndex]) => {
            const sf = systemFields.find(s => s.key === field);
            return {
                field,
                colIndex,
                label: sf ? sf.label : field,
                required: sf ? sf.required : false
            };
        });

    if (activeMapping.length === 0 || importState.parsedData.length === 0) {
        previewContainer?.classList.add('u-hidden');
        return;
    }

    previewContainer?.classList.remove('u-hidden');

    thead.innerHTML = `
        <tr>
            <th>#</th>
            ${activeMapping.map(m => `<th>${m.label}</th>`).join('')}
            <th>Статус</th>
        </tr>
    `;

    // Показуємо перші 50 рядків
    const previewRows = importState.parsedData.slice(0, 50);
    let newCount = 0, updateCount = 0, sameCount = 0;

    tbody.innerHTML = previewRows.map((row, i) => {
        const status = 'new'; // TODO: Порівняти з існуючими даними
        if (status === 'new') newCount++;
        else if (status === 'update') updateCount++;
        else sameCount++;

        const statusClass = status === 'new' ? 'status-new' : status === 'update' ? 'status-update' : 'status-same';
        const statusIcon = status === 'new' ? 'add_circle' : status === 'update' ? 'sync' : 'check_circle';

        return `
            <tr class="${statusClass}">
                <td>${i + 1}</td>
                ${activeMapping.map(m => `<td>${row[m.colIndex] || ''}</td>`).join('')}
                <td><span class="material-symbols-outlined">${statusIcon}</span></td>
            </tr>
        `;
    }).join('');

    // Оновити лічильники
    const newCountEl = document.getElementById('preview-new-count');
    const updateCountEl = document.getElementById('preview-update-count');
    const sameCountEl = document.getElementById('preview-same-count');

    if (newCountEl) newCountEl.textContent = newCount;
    if (updateCountEl) updateCountEl.textContent = updateCount;
    if (sameCountEl) sameCountEl.textContent = sameCount;
}

/**
 * Виконати імпорт
 */
async function executeImport() {

    const importBtn = document.getElementById('execute-mapper-import');
    const modalContent = document.querySelector('#modal-mapper-import .modal-body');

    if (importBtn) {
        importBtn.disabled = true;
        importBtn.textContent = 'Імпортую...';
    }

    // Показуємо прогрес бар
    const loader = showLoader(modalContent, {
        type: 'progress',
        message: 'Підготовка до імпорту...',
        overlay: true
    });

    try {
        loader.updateProgress(5, 'Підготовка даних...');

        // Зберегти маппінг якщо обрано (тільки для маркетплейса)
        if (importState.importTarget === 'marketplace') {
            const saveMapping = document.getElementById('mapper-import-save-mapping')?.checked;
            if (saveMapping && importState.marketplaceId) {
                loader.updateProgress(10, 'Збереження маппінгу...');
                await saveColumnMapping();
            }
        }

        loader.updateProgress(15, 'Імпортую дані...');

        // Виконати імпорт даних з передачею функції прогресу
        if (importState.importTarget === 'marketplace') {
            // Імпорт для маркетплейса
            if (importState.dataType === 'characteristics' || importState.dataType === 'rozetka_pack') {
                // Для rozetka_pack також спочатку імпортуємо категорію якщо є
                if (importState.isRozetkaFormat && importState.rozetkaCategory) {
                    loader.updateProgress(15, 'Створення категорії...');
                    await importRozetkaCategory();
                }
                await importCharacteristicsAndOptions((percent, msg) => {
                    loader.updateProgress(20 + percent * 0.75, msg);
                });
            } else if (importState.dataType === 'categories') {
                await importCategories((percent, msg) => {
                    loader.updateProgress(15 + percent * 0.8, msg);
                });
            }
        } else {
            // Імпорт для свого довідника
            if (importState.dataType === 'characteristics') {
                await importOwnCharacteristicsAndOptions((percent, msg) => {
                    loader.updateProgress(15 + percent * 0.8, msg);
                });
            } else {
                await importOwnCategories((percent, msg) => {
                    loader.updateProgress(15 + percent * 0.8, msg);
                });
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
 * Зберегти маппінг колонок
 */
async function saveColumnMapping() {
    const marketplaces = getMarketplaces();
    const mp = marketplaces.find(m => m.id === importState.marketplaceId);

    if (!mp) return;

    let columnMapping = {};
    try {
        columnMapping = JSON.parse(mp.column_mapping || '{}');
    } catch (e) {
        columnMapping = {};
    }

    columnMapping[importState.dataType] = importState.mapping;

    await updateMarketplace(importState.marketplaceId, {
        column_mapping: JSON.stringify(columnMapping)
    });

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

    // Для Rozetka - категорія береться з файлу автоматично
    const rozetkaCategory = importState.isRozetkaFormat && importState.rozetkaCategory
        ? importState.rozetkaCategory
        : null;

    const mpCharacteristics = new Map(); // mp_char_id -> характеристика
    const mpOptions = [];

    importState.parsedData.forEach(row => {
        const charId = charIdCol !== undefined ? String(row[charIdCol] || '').trim() : '';
        const charName = charNameCol !== undefined ? String(row[charNameCol] || '').trim() : '';

        if (charId && charName) {
            // Додаємо/оновлюємо характеристику
            if (!mpCharacteristics.has(charId)) {
                // Для Rozetka використовуємо категорію з файлу, інакше з маппінгу
                const catId = rozetkaCategory
                    ? rozetkaCategory.id
                    : (categoryIdCol !== undefined ? String(row[categoryIdCol] || '').trim() : '');
                const catName = rozetkaCategory
                    ? rozetkaCategory.name
                    : (categoryNameCol !== undefined ? String(row[categoryNameCol] || '').trim() : '');

                mpCharacteristics.set(charId, {
                    mp_char_id: charId,
                    mp_char_name: charName,
                    mp_char_type: charTypeCol !== undefined ? String(row[charTypeCol] || '').trim() : '',
                    mp_char_filter_type: charFilterTypeCol !== undefined ? String(row[charFilterTypeCol] || '').trim() : '',
                    mp_char_unit: charUnitCol !== undefined ? String(row[charUnitCol] || '').trim() : '',
                    mp_char_is_global: charIsGlobalCol !== undefined ? String(row[charIsGlobalCol] || '').trim() : '',
                    mp_category_id: catId,
                    mp_category_name: catName
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
                mpOptions.push({
                    mp_char_id: charId,
                    mp_option_id: optionId,
                    mp_option_name: optionName
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

            // Оновлюємо JSON data
            const updatedData = JSON.stringify({
                name: existingChar.name || '',
                type: existingChar.type || '',
                filter_type: existingChar.filter_type || '',
                unit: existingChar.unit || '',
                is_global: existingChar.is_global || '',
                category_id: existingCatIds.join(','),
                category_name: existingCatNames.join(','),
                our_char_id: existingChar.our_char_id || ''
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
            // Генеруємо унікальний ID для кожного запису
            const uniqueId = `mpc-${importState.marketplaceId}-${c.mp_char_id}`;

            // Всі дані характеристики зберігаємо в JSON
            const dataJson = JSON.stringify({
                name: c.mp_char_name || '',
                type: c.mp_char_type || '',
                filter_type: c.mp_char_filter_type || '',
                unit: c.mp_char_unit || '',
                is_global: c.mp_char_is_global || '',
                category_id: c.mp_category_id || '',
                category_name: c.mp_category_name || '',
                our_char_id: '' // для маппінгу
            });

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
            // Генеруємо унікальний ID для кожного запису
            const uniqueId = `mpo-${importState.marketplaceId}-${o.mp_char_id}-${o.mp_option_id}`;

            // Всі дані опції зберігаємо в JSON
            const dataJson = JSON.stringify({
                char_id: o.mp_char_id || '',
                name: o.mp_option_name || '',
                our_option_id: '' // для маппінгу
            });

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

/**
 * Імпорт категорії з Rozetka файлу (категорія береться з назви файлу та першого рядка)
 */
async function importRozetkaCategory() {
    const { callSheetsAPI } = await import('../utils/api-client.js');

    if (!importState.rozetkaCategory) {
        return;
    }

    const { id: catId, name: catName } = importState.rozetkaCategory;

    if (!catId || !catName) {
        return;
    }


    // Перевіряємо чи категорія вже існує
    const { loadMpCategories, getMpCategories } = await import('./mapper-data.js');
    await loadMpCategories();

    const existingCats = getMpCategories();
    const alreadyExists = existingCats.some(c =>
        c.marketplace_id === importState.marketplaceId &&
        c.external_id === catId
    );

    if (alreadyExists) {
        return;
    }

    // Створюємо категорію
    const timestamp = new Date().toISOString();
    const uniqueId = `mpc-${importState.marketplaceId}-cat-${catId}`;

    const dataJson = JSON.stringify({
        name: catName,
        parent_id: '',
        parent_name: '',
        our_category_id: ''
    });

    await callSheetsAPI('append', {
        range: 'Mapper_MP_Categories!A:G',
        values: [[
            uniqueId,
            importState.marketplaceId,
            catId,
            'import',
            dataJson,
            timestamp,
            timestamp
        ]],
        spreadsheetType: 'main'
    });

}

/**
 * Імпорт категорій
 * @param {Function} onProgress - Callback для оновлення прогресу (percent, message)
 */
async function importCategories(onProgress = () => { }) {
    const { callSheetsAPI } = await import('../utils/api-client.js');

    onProgress(10, 'Обробка категорій...');

    const catIdCol = importState.mapping.cat_id;
    const catNameCol = importState.mapping.cat_name;
    const parentIdCol = importState.mapping.parent_id;
    const parentNameCol = importState.mapping.parent_name;

    const mpCategories = [];

    importState.parsedData.forEach(row => {
        const catId = row[catIdCol] || '';
        const catName = row[catNameCol] || '';

        if (catId && catName) {
            mpCategories.push({
                mp_cat_id: catId,
                mp_cat_name: catName,
                mp_parent_id: parentIdCol !== undefined ? row[parentIdCol] : '',
                mp_parent_name: parentNameCol !== undefined ? row[parentNameCol] : ''
            });
        }
    });


    onProgress(30, 'Перевірка існуючих даних...');

    // Завантажуємо існуючі дані для перевірки дублікатів
    const { loadMpCategories, getMpCategories } = await import('./mapper-data.js');
    await loadMpCategories();

    const existingCats = getMpCategories();

    // Створюємо Set існуючих ID для швидкої перевірки
    const existingCatIds = new Set(
        existingCats
            .filter(c => c.marketplace_id === importState.marketplaceId)
            .map(c => c.external_id)
    );

    // Фільтруємо тільки нові категорії
    const newCategories = mpCategories.filter(c => !existingCatIds.has(c.mp_cat_id));


    onProgress(50, `Запис ${newCategories.length} нових категорій...`);

    // Структура таблиці: id | marketplace_id | external_id | source | data | created_at | updated_at
    // data - JSON з усіма полями категорії (різні для кожного маркетплейсу)
    if (newCategories.length > 0) {
        const timestamp = new Date().toISOString();
        const catRows = newCategories.map(c => {
            // Генеруємо унікальний ID для кожного запису
            const uniqueId = `mpcat-${importState.marketplaceId}-${c.mp_cat_id}`;

            // Всі дані категорії зберігаємо в JSON
            const dataJson = JSON.stringify({
                name: c.mp_cat_name || '',
                parent_id: c.mp_parent_id || '',
                parent_name: c.mp_parent_name || '',
                our_cat_id: '' // для маппінгу
            });

            return [
                uniqueId,
                importState.marketplaceId,
                c.mp_cat_id,        // external_id
                'import',           // source
                dataJson,           // data (JSON)
                timestamp,          // created_at
                timestamp           // updated_at
            ];
        });

        await callSheetsAPI('append', {
            range: 'Mapper_MP_Categories!A:G',
            values: catRows,
            spreadsheetType: 'main'
        });
    } else {
    }

    onProgress(100, 'Готово!');
}

// ═══════════════════════════════════════════════════════════════════════════
// ІМПОРТ ДЛЯ СВОГО ДОВІДНИКА
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Імпорт своїх характеристик та опцій
 * @param {Function} onProgress - Callback для оновлення прогресу (percent, message)
 */
async function importOwnCharacteristicsAndOptions(onProgress = () => { }) {
    onProgress(5, 'Обробка даних файлу...');
    // Отримуємо індекси колонок з маппінгу
    const m = importState.mapping;
    const nameUaCol = m.own_char_name_ua;
    const nameRuCol = m.own_char_name_ru;
    const typeCol = m.own_char_type;
    const filterTypeCol = m.own_char_filter_type;
    const unitCol = m.own_char_unit;
    const isGlobalCol = m.own_char_is_global;
    const categoryIdsCol = m.own_char_category_ids;
    const optionUaCol = m.own_option_value_ua;
    const optionRuCol = m.own_option_value_ru;
    const optionParentIdCol = m.own_option_parent_id;

    const characteristics = new Map(); // name_ua -> char object
    const options = []; // {char_name_ua, value_ua, value_ru, parent_option_id}
    const categoryNamesToCreate = new Set(); // Унікальні назви категорій для створення

    importState.parsedData.forEach(row => {
        const nameUa = nameUaCol !== undefined ? String(row[nameUaCol] || '').trim() : '';
        const nameRu = nameRuCol !== undefined ? String(row[nameRuCol] || '').trim() : '';

        if (nameUa) {
            // Отримуємо категорії з рядка
            const categoryIdsRaw = categoryIdsCol !== undefined ? String(row[categoryIdsCol] || '').trim() : '';

            // Додаємо характеристику якщо ще немає
            if (!characteristics.has(nameUa)) {
                // Визначаємо тип: якщо є опції - select, інакше text
                const hasOptions = optionUaCol !== undefined;
                const charType = typeCol !== undefined ? String(row[typeCol] || '').trim() : (hasOptions ? 'select' : 'text');

                // Визначаємо is_global
                let isGlobal = false;
                if (isGlobalCol !== undefined) {
                    const globalValue = String(row[isGlobalCol] || '').toLowerCase().trim();
                    isGlobal = ['true', '1', 'так', 'yes', '+', 'да'].includes(globalValue);
                }

                characteristics.set(nameUa, {
                    name_ua: nameUa,
                    name_ru: nameRu,
                    type: charType || 'text',
                    filter_type: filterTypeCol !== undefined ? String(row[filterTypeCol] || '').trim() : 'none',
                    unit: unitCol !== undefined ? String(row[unitCol] || '').trim() : '',
                    is_global: isGlobal,
                    category_names: categoryIdsRaw // Зберігаємо назви категорій
                });

                // Збираємо унікальні категорії для створення
                if (categoryIdsRaw) {
                    categoryIdsRaw.split(',').forEach(catName => {
                        const trimmed = catName.trim();
                        if (trimmed) categoryNamesToCreate.add(trimmed);
                    });
                }
            }

            // Якщо є опція
            if (optionUaCol !== undefined) {
                const optionUa = String(row[optionUaCol] || '').trim();
                const optionRu = optionRuCol !== undefined ? String(row[optionRuCol] || '').trim() : '';
                const parentOptionId = optionParentIdCol !== undefined ? String(row[optionParentIdCol] || '').trim() : '';

                if (optionUa) {
                    // Перевіряємо чи така опція вже є для цієї характеристики
                    const exists = options.some(o =>
                        o.char_name_ua === nameUa && o.value_ua === optionUa
                    );
                    if (!exists) {
                        options.push({
                            char_name_ua: nameUa,
                            value_ua: optionUa,
                            value_ru: optionRu,
                            parent_option_id: parentOptionId
                        });
                    }
                }
            }
        }
    });


    // === КРОК 1: Створюємо категорії, яких немає ===
    const existingCategories = getCategories();
    const categoryNameToId = new Map(); // Назва -> ID

    // Заповнюємо карту існуючими категоріями
    existingCategories.forEach(cat => {
        categoryNameToId.set(cat.name_ua.toLowerCase(), cat.id);
    });

    // Створюємо нові категорії
    const newCategoryNames = Array.from(categoryNamesToCreate).filter(
        name => !categoryNameToId.has(name.toLowerCase())
    );

    if (newCategoryNames.length > 0) {
        onProgress(10, `Створюю ${newCategoryNames.length} нових категорій...`);

        for (let i = 0; i < newCategoryNames.length; i++) {
            const catName = newCategoryNames[i];
            const catPercent = Math.round(10 + (i / newCategoryNames.length) * 10);
            onProgress(catPercent, `Категорія: ${catName}`);

            try {
                const newCat = await addCategory({
                    name_ua: catName,
                    name_ru: '',
                    parent_id: ''
                });
                categoryNameToId.set(catName.toLowerCase(), newCat.id);
            } catch (e) {
                console.warn(`⚠️ Не вдалося створити категорію "${catName}":`, e);
            }
        }
    }

    // === КРОК 2: Конвертуємо назви категорій в ID ===
    function convertCategoryNamesToIds(categoryNamesStr) {
        if (!categoryNamesStr) return '';
        const names = categoryNamesStr.split(',').map(n => n.trim()).filter(n => n);
        const ids = names
            .map(name => categoryNameToId.get(name.toLowerCase()))
            .filter(id => id);
        return ids.join(',');
    }

    // === КРОК 3: Додаємо характеристики ===
    const charIdMap = new Map(); // name_ua -> id
    const totalChars = characteristics.size;
    let charIndex = 0;

    for (const [nameUa, char] of characteristics) {
        charIndex++;
        const charPercent = Math.round(20 + (charIndex / totalChars) * 40);
        onProgress(charPercent, `Характеристика ${charIndex}/${totalChars}: ${nameUa}`);

        // Конвертуємо назви категорій в ID
        const categoryIds = convertCategoryNamesToIds(char.category_names);

        try {
            const newChar = await addCharacteristic({
                name_ua: char.name_ua,
                name_ru: char.name_ru,
                type: char.type,
                unit: char.unit,
                filter_type: char.filter_type,
                is_global: char.is_global,
                category_ids: categoryIds
            });
            charIdMap.set(nameUa, newChar.id);
        } catch (e) {
            console.warn(`⚠️ Не вдалося додати характеристику "${nameUa}":`, e);
        }
    }

    // === КРОК 4: Додаємо опції ===
    const totalOpts = options.length;
    let optIndex = 0;

    for (const opt of options) {
        optIndex++;
        const optPercent = Math.round(60 + (optIndex / Math.max(totalOpts, 1)) * 35);
        onProgress(optPercent, `Опція ${optIndex}/${totalOpts}: ${opt.value_ua}`);

        const charId = charIdMap.get(opt.char_name_ua);
        if (charId) {
            try {
                await addOption({
                    characteristic_id: charId,
                    value_ua: opt.value_ua,
                    value_ru: opt.value_ru,
                    parent_option_id: opt.parent_option_id,
                    sort_order: '0'
                });
            } catch (e) {
                console.warn(`⚠️ Не вдалося додати опцію "${opt.value_ua}":`, e);
            }
        }
    }

    onProgress(100, 'Готово!');
}

/**
 * Імпорт своїх категорій
 * @param {Function} onProgress - Callback для оновлення прогресу (percent, message)
 */
async function importOwnCategories(onProgress = () => { }) {
    onProgress(5, 'Обробка категорій...');

    const nameUaCol = importState.mapping.own_cat_name_ua;
    const nameRuCol = importState.mapping.own_cat_name_ru;
    const parentCol = importState.mapping.own_cat_parent;

    // Спочатку збираємо всі унікальні категорії
    const categories = new Map(); // name_ua -> {name_ua, name_ru, parent_name}

    importState.parsedData.forEach(row => {
        const nameUa = row[nameUaCol]?.trim() || '';
        const nameRu = nameRuCol !== undefined ? row[nameRuCol]?.trim() : '';
        const parentName = parentCol !== undefined ? row[parentCol]?.trim() : '';

        if (nameUa && !categories.has(nameUa)) {
            categories.set(nameUa, {
                name_ua: nameUa,
                name_ru: nameRu || '',
                parent_name: parentName || ''
            });
        }
    });


    // Створюємо категорії в правильному порядку (спочатку без батьківських)
    const catIdMap = new Map(); // name_ua -> id
    const totalCats = categories.size;
    let catIndex = 0;

    // Перший прохід: категорії без батьківських
    onProgress(20, 'Додаю кореневі категорії...');

    for (const [nameUa, cat] of categories) {
        if (!cat.parent_name) {
            catIndex++;
            onProgress(20 + (catIndex / totalCats) * 35, `Категорія ${catIndex}/${totalCats}: ${nameUa}`);

            try {
                const newCat = await addCategory({
                    name_ua: cat.name_ua,
                    name_ru: cat.name_ru,
                    parent_id: ''
                });
                catIdMap.set(nameUa, newCat.id);
            } catch (e) {
                console.warn(`⚠️ Не вдалося додати категорію "${nameUa}":`, e);
            }
        }
    }

    // Другий прохід: категорії з батьківськими
    onProgress(55, 'Додаю підкатегорії...');

    for (const [nameUa, cat] of categories) {
        if (cat.parent_name && !catIdMap.has(nameUa)) {
            catIndex++;
            onProgress(55 + ((catIndex - catIdMap.size) / Math.max(totalCats - catIdMap.size, 1)) * 40, `Підкатегорія: ${nameUa}`);

            const parentId = catIdMap.get(cat.parent_name) || '';
            try {
                const newCat = await addCategory({
                    name_ua: cat.name_ua,
                    name_ru: cat.name_ru,
                    parent_id: parentId
                });
                catIdMap.set(nameUa, newCat.id);
            } catch (e) {
                console.warn(`⚠️ Не вдалося додати категорію "${nameUa}":`, e);
            }
        }
    }

    onProgress(100, 'Готово!');
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
                    <div class="modal-header-actions">
                        <button class="segment modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <p class="u-mb-16">Обрано <strong>${selectedMpIds.length}</strong> характеристик маркетплейсу.</p>
                    <p class="u-mb-16">Оберіть власну характеристику для прив'язки:</p>

                    <div class="form-group">
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
        applyBtn.innerHTML = '<span class="material-symbols-outlined is-spinning">sync</span> Обробка...';

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
                    <div class="modal-header-actions">
                        <button class="segment modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <p class="u-mb-16">Обрано <strong>${mpIds.length}</strong> опцій маркетплейсу.</p>
                    <p class="u-mb-16">Оберіть власну опцію для прив'язки:</p>

                    <div class="form-group">
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
        applyBtn.innerHTML = '<span class="material-symbols-outlined is-spinning">sync</span> Обробка...';

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
                    <div class="modal-header-actions">
                        <button class="segment modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <fieldset class="form-fieldset" disabled>
                        <div class="form-group">
                            <label>Джерело</label>
                            <input type="text" class="input-main" value="${escapeHtml(mpName)}" readonly>
                        </div>
                        <div class="grid2">
                            <div class="form-group">
                                <label>ID</label>
                                <input type="text" class="input-main" value="${escapeHtml(mpChar.id)}" readonly>
                            </div>
                            <div class="form-group">
                                <label>External ID</label>
                                <input type="text" class="input-main" value="${escapeHtml(mpChar.external_id || '')}" readonly>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Назва</label>
                            <input type="text" class="input-main" value="${escapeHtml(charData.name || '')}" readonly>
                        </div>
                        <div class="grid2">
                            <div class="form-group">
                                <label>Тип</label>
                                <input type="text" class="input-main" value="${escapeHtml(charData.type || '')}" readonly>
                            </div>
                            <div class="form-group">
                                <label>Одиниця виміру</label>
                                <input type="text" class="input-main" value="${escapeHtml(charData.unit || '')}" readonly>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Глобальна</label>
                            <input type="text" class="input-main" value="${charData.is_global ? 'Так' : 'Ні'}" readonly>
                        </div>
                    </fieldset>

                    <div class="form-fieldset u-mt-16">
                        <div class="form-group">
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
                    <div class="modal-header-actions">
                        <button class="segment modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <fieldset class="form-fieldset" disabled>
                        <div class="form-group">
                            <label>Джерело</label>
                            <input type="text" class="input-main" value="${escapeHtml(mpName)}" readonly>
                        </div>
                        <div class="grid2">
                            <div class="form-group">
                                <label>ID</label>
                                <input type="text" class="input-main" value="${escapeHtml(mpOption.id)}" readonly>
                            </div>
                            <div class="form-group">
                                <label>External ID</label>
                                <input type="text" class="input-main" value="${escapeHtml(mpOption.external_id || '')}" readonly>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Значення</label>
                            <input type="text" class="input-main" value="${escapeHtml(optData.name || '')}" readonly>
                        </div>
                    </fieldset>

                    <div class="form-fieldset u-mt-16">
                        <div class="form-group">
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
                    <div class="modal-header-actions">
                        <button class="segment modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <p class="u-mb-16">Вибрано ${selectedMpCatIds.length} MP категорій для маппінгу</p>
                    <div class="form-group">
                        <label>Власна категорія</label>
                        <select id="select-own-category" class="input-main">
                            <option value="">Оберіть категорію...</option>
                            ${optionsHtml}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-close-btn">Скасувати</button>
                    <button class="btn btn-primary" id="btn-confirm-category-mapping">
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
            confirmBtn.innerHTML = '<span class="material-symbols-outlined is-spinning">progress_activity</span><span>Маппінг...</span>';

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
                    <div class="modal-header-actions">
                        <button class="segment modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <fieldset class="form-fieldset" disabled>
                        <div class="form-group">
                            <label>Джерело</label>
                            <input type="text" class="input-main" value="${escapeHtml(mpName)}" readonly>
                        </div>
                        <div class="grid2">
                            <div class="form-group">
                                <label>ID</label>
                                <input type="text" class="input-main" value="${escapeHtml(mpCat.id)}" readonly>
                            </div>
                            <div class="form-group">
                                <label>External ID</label>
                                <input type="text" class="input-main" value="${escapeHtml(mpCat.external_id || '')}" readonly>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Назва</label>
                            <input type="text" class="input-main" value="${escapeHtml(catData.name || '')}" readonly>
                        </div>
                        ${parentName ? `
                        <div class="form-group">
                            <label>Батьківська категорія</label>
                            <input type="text" class="input-main" value="${escapeHtml(parentName)}" readonly>
                        </div>
                        ` : ''}
                    </fieldset>

                    <div class="form-fieldset u-mt-16">
                        <div class="form-group">
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
