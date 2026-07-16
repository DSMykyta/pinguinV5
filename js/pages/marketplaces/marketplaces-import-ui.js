// js/pages/marketplaces/marketplaces-import-ui.js

/**
 * Marketplace import modal UI.
 */

import { runHook } from './marketplaces-plugins.js';
import { getMarketplaces } from '../../data/marketplaces-data.js';
import { showModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { showLoader } from '../../components/feedback/loading.js';
import { initCustomSelects, reinitializeCustomSelect } from '../../components/forms/select.js';
import { importState, findAdapter, resetImportState } from './marketplaces-import-state.js';
import { handleSingleFile, applyHeaderRowSilent, validateImport } from './marketplaces-import-file.js';
import { executeImport, executeSingleFileImport } from './marketplaces-import-execute.js';

export async function showImportModal() {
    resetImportState();

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
