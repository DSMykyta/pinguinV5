// js/pages/entities/entities-characteristics.js

/**
 * Characteristics plugin facade.
 *
 * Keeps the public page API stable while delegating form, related options,
 * marketplace mappings, and bindings UI to focused modules.
 */

import { registerHook, runHook } from './entities-plugins.js';
import {
    addCharacteristic,
    updateCharacteristic,
    deleteCharacteristic,
    getCharacteristics,
    getOptions,
    updateOption,
    getCharacteristicDependencies
} from '../../data/entities-data.js';
import {
    deleteCharacteristicMapping,
    getMapCharacteristics
} from '../../data/mappings-data.js';
import {
    showModal,
    closeModal,
    showConfirmModal
} from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { initCustomSelects } from '../../components/forms/select.js';
import {
    initSectionNavigation,
    buildCascadeDetails
} from './entities-utils.js';
import {
    getCharacteristicFormData,
    fillCharacteristicForm,
    clearCharacteristicForm,
    initGlobalToggleHandler,
    populateCategorySelect
} from './entities-characteristics-form.js';
import {
    clearRelatedOptions,
    populateRelatedOptions
} from './entities-characteristics-options.js';
import {
    initCharacteristicsMappings,
    renderMappedMpCharacteristicsSections,
    showSelectOwnCharacteristicModal,
    handleAutoMapCharacteristics,
    showViewMpCharacteristicModal
} from './entities-characteristics-mappings.js';
import { showBindingsModal } from './entities-characteristics-bindings.js';

export const PLUGIN_NAME = 'entities-characteristics';

export {
    showSelectOwnCharacteristicModal,
    handleAutoMapCharacteristics,
    showViewMpCharacteristicModal,
    showBindingsModal
};

export function init(state) {
    initCharacteristicsMappings(state);
    registerHook('onTabChange', handleTabChange);
    registerHook('onDataLoaded', handleDataLoaded);
}

function handleTabChange(newTab, prevTab) {
    if (newTab === 'characteristics') {
        // Таб характеристик активовано
    }
}

function handleDataLoaded() {
    // Оновити залежні дані якщо потрібно
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD МОДАЛКИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модальне вікно для додавання характеристики
 */
export async function showAddCharacteristicModal() {

    await showModal('mapper-characteristic-edit', null);

    const modalEl = document.querySelector('[data-modal-id="mapper-characteristic-edit"]');

    const title = document.getElementById('char-modal-title');
    if (title) title.textContent = 'Додати характеристику';

    const deleteBtn = document.getElementById('delete-mapper-characteristic');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    clearCharacteristicForm();
    populateCategorySelect();

    if (modalEl) initCustomSelects(modalEl);
    initGlobalToggleHandler();
    clearRelatedOptions();
    initSectionNavigation('char-section-navigator');

    modalEl?.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        };
    });

    const saveBtn = document.getElementById('save-mapper-characteristic');
    if (saveBtn) {
        saveBtn.onclick = () => handleSaveNewCharacteristic(false);
    }

    const saveCloseBtn = document.getElementById('save-close-mapper-characteristic');
    if (saveCloseBtn) {
        saveCloseBtn.onclick = () => handleSaveNewCharacteristic(true);
    }
}

/**
 * Показати модальне вікно для редагування характеристики
 */
export async function showEditCharacteristicModal(id) {

    const characteristics = getCharacteristics();
    const characteristic = characteristics.find(c => c.id === id);

    if (!characteristic) {
        showToast('Характеристику не знайдено', 'error');
        return;
    }

    await showModal('mapper-characteristic-edit', null);

    const modalEl = document.querySelector('[data-modal-id="mapper-characteristic-edit"]');

    const title = document.getElementById('char-modal-title');
    if (title) title.textContent = `Характеристика ${characteristic.name_ua || ''}`;

    const deleteBtn = document.getElementById('delete-mapper-characteristic');
    if (deleteBtn) {
        deleteBtn.classList.remove('u-hidden');
        deleteBtn.onclick = () => {
            closeModal();
            showDeleteCharacteristicConfirm(id);
        };
    }

    const selectedCategoryIds = characteristic.category_ids
        ? characteristic.category_ids.split(',').map(id => id.trim()).filter(id => id)
        : [];
    populateCategorySelect(selectedCategoryIds);

    if (modalEl) initCustomSelects(modalEl);
    initGlobalToggleHandler();
    fillCharacteristicForm(characteristic);
    populateRelatedOptions(id);
    renderMappedMpCharacteristicsSections(id);
    initSectionNavigation('char-section-navigator');

    modalEl?.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        };
    });

    const saveBtn = document.getElementById('save-mapper-characteristic');
    if (saveBtn) {
        saveBtn.onclick = () => handleUpdateCharacteristic(id, false);
    }

    const saveCloseBtn = document.getElementById('save-close-mapper-characteristic');
    if (saveCloseBtn) {
        saveCloseBtn.onclick = () => handleUpdateCharacteristic(id, true);
    }
}

async function showDeleteCharacteristicConfirm(id) {
    const characteristics = getCharacteristics();
    const characteristic = characteristics.find(c => c.id === id);

    if (!characteristic) {
        showToast('Характеристику не знайдено', 'error');
        return;
    }

    // Каскадні попередження
    const deps = getCharacteristicDependencies(id, getMapCharacteristics());
    const items = [];
    if (deps.mappings > 0)
        items.push({ icon: 'link_off', text: `<strong>${deps.mappings}</strong> прив'язок до МП буде видалено` });
    if (deps.options > 0)
        items.push({ icon: 'circle', text: `<strong>${deps.options}</strong> опцій буде відв'язано` });

    const confirmed = await showConfirmModal({
        action: 'видалити',
        entity: 'характеристику',
        name: characteristic.name_ua,
        details: buildCascadeDetails(items)
    });

    if (confirmed) {
        try {
            await deleteCharacteristic(id);

            // Каскадне очищення: видалити маппінги
            const charMappings = getMapCharacteristics().filter(m => m.characteristic_id === id);
            for (const mapping of charMappings) {
                await deleteCharacteristicMapping(mapping.id);
            }

            // Каскадне очищення: відв'язати опції
            const orphanOptions = getOptions().filter(o => o.characteristic_id === id);
            for (const opt of orphanOptions) {
                await updateOption(opt.id, { characteristic_id: '' });
            }

            showToast('Характеристику видалено', 'success');
            runHook('onDataChanged');
        } catch (error) {
            showToast('Помилка видалення характеристики', 'error');
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ФОРМА
// ═══════════════════════════════════════════════════════════════════════════

async function handleSaveNewCharacteristic(shouldClose = true) {
    const data = getCharacteristicFormData();
    try {
        await addCharacteristic(data);
        showToast('Характеристику додано', 'success');
        if (shouldClose) closeModal();
        runHook('onDataChanged');
    } catch (error) {
        showToast('Помилка додавання характеристики', 'error');
    }
}

async function handleUpdateCharacteristic(id, shouldClose = true) {
    const data = getCharacteristicFormData();
    try {
        await updateCharacteristic(id, data);
        showToast('Характеристику оновлено', 'success');
        if (shouldClose) closeModal();
        runHook('onDataChanged');
    } catch (error) {
        showToast('Помилка оновлення характеристики', 'error');
    }
}
