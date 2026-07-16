// js/pages/marketplaces/marketplaces-import-file.js

/**
 * File reading, header parsing, and column mapping for marketplace import.
 */

import { showToast } from '../../components/feedback/toast.js';
import { importState } from './marketplaces-import-state.js';

export async function handleSingleFile(file) {
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

export function applyHeaderRowSilent() {
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

export function autoDetectMappingSilent(headers) {
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

export async function parseFileRaw(file) {
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

export function getSystemFields() {
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

export function validateImport() {
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
