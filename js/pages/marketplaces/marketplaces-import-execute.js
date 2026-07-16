// js/pages/marketplaces/marketplaces-import-execute.js

/**
 * Marketplace import execution and headless reference import.
 */

import { runHook } from './marketplaces-plugins.js';
import { getMarketplaces } from '../../data/marketplaces-data.js';
import { closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { showLoader } from '../../components/feedback/loading.js';
import {
    importState,
    createImportState,
    setImportState,
    findAdapter,
    normalizeIsGlobal
} from './marketplaces-import-state.js';
import { parseFileRaw, autoDetectMappingSilent } from './marketplaces-import-file.js';

export async function executeSingleFileImport() {
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

export async function saveReferenceFileToDrive(state) {
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

export async function executeImport() {
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

export async function importCharacteristicsAndOptions(onProgress = () => { }) {
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

export async function importReferenceForCategory(file, marketplace, mpCategory) {
    const savedState = importState;

    const adapter = findAdapter(marketplace);
    if (!adapter) throw new Error('Немає адаптера для цього маркетплейсу');

    const config = adapter.getConfig();

    setImportState(createImportState({
        file,
        marketplaceId: marketplace.id,
        dataType: config.dataType || 'adapter_pack',
        headerRow: config.headerRow || 1,
        adapter
    }));

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
        setImportState(savedState);
    }
}
