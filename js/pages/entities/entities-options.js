// js/pages/entities/entities-options.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    ENTITIES - OPTIONS PLUGIN                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Опції: CRUD операції + модалки                              ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Управління власними опціями та маппінг MP опцій.                        ║
 * ║                                                                          ║
 * ║  ЕКСПОРТОВАНІ ФУНКЦІЇ:                                                   ║
 * ║  - init() — Ініціалізація плагіна (реєстрація hooks)                     ║
 * ║  - showAddOptionModal(charId?) — Модалка додавання                       ║
 * ║  - showEditOptionModal(id) — Модалка редагування                         ║
 * ║  - showSelectOwnOptionModal(mpIds) — Вибір власної опції                 ║
 * ║  - showViewMpOptionModal(mpId) — Перегляд MP опції                       ║
 * ║  - handleAutoMapOptions(ids) — Авто-маппінг                              ║
 * ║                                                                          ║
 * ║  ЗАЛЕЖНОСТІ:                                                             ║
 * ║  - entities-state.js (state, hooks)                                      ║
 * ║  - entities-data.js, mp-data.js, mappings-data.js (API операції)         ║
 * ║  - entities-table.js (рендеринг)                                         ║
 * ║  - entities-utils.js (утиліти)                                            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { registerHook, runHook } from './entities-plugins.js';
import {
    addOption, updateOption, deleteOption, getOptions,
    getOptionDependencies
} from '../../data/entities-data.js';
import {
    deleteOptionMapping,
    getMapOptions
} from '../../data/mappings-data.js';
import { showModal, closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { showConfirmModal } from '../../components/modal/modal-main.js';
import { initCustomSelects, reinitializeCustomSelect } from '../../components/forms/select.js';
import {
    initSectionNavigation,
    buildCascadeDetails
} from './entities-utils.js';
import {
    getOptionFormData,
    fillOptionForm,
    clearOptionForm,
    populateCharacteristicSelect,
    populateParentOptionSelect
} from './entities-options-form.js';
import { populateRelatedChildOptions } from './entities-options-children.js';
import {
    initOptionsMappings,
    renderMappedMpOptionsSections,
    showSelectOwnOptionModal,
    handleAutoMapOptions,
    showViewMpOptionModal
} from './entities-options-mappings.js';
import { showBindingsModal } from './entities-options-bindings.js';

export const PLUGIN_NAME = 'entities-options';
export {
    showSelectOwnOptionModal,
    handleAutoMapOptions,
    showViewMpOptionModal,
    showBindingsModal
};

/**
 * Ініціалізація плагіна
 * Реєструє hooks та позначає плагін як завантажений
 */
export function init(state) {
    initOptionsMappings(state);
    registerHook('onTabChange', handleTabChange);
    registerHook('onDataLoaded', handleDataLoaded);
}

/**
 * Обробник зміни табу
 */
function handleTabChange(newTab, prevTab) {
    if (newTab === 'options') {
        // Таб опцій активовано
    }
}

/**
 * Обробник завантаження даних
 */
function handleDataLoaded() {
    // Оновити залежні дані якщо потрібно
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD МОДАЛКИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модальне вікно для додавання опції
 */
export async function showAddOptionModal(preselectedCharacteristicId = null) {

    await showModal('mapper-option-edit', null);

    const modalEl = document.querySelector('[data-modal-id="mapper-option-edit"]');

    const title = document.getElementById('option-modal-title');
    if (title) title.textContent = 'Додати опцію';

    const deleteBtn = document.getElementById('delete-mapper-option');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    clearOptionForm();
    populateCharacteristicSelect(preselectedCharacteristicId);
    populateParentOptionSelect();

    if (modalEl) initCustomSelects(modalEl);

    if (preselectedCharacteristicId) {
        const charSelect = document.getElementById('mapper-option-char');
        if (charSelect) {
            charSelect.value = preselectedCharacteristicId;
            reinitializeCustomSelect(charSelect);
        }
    }

    initSectionNavigation('option-section-navigator');

    modalEl?.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        };
    });

    const saveBtn = document.getElementById('save-mapper-option');
    if (saveBtn) {
        saveBtn.onclick = () => handleSaveNewOption(false);
    }

    const saveCloseBtn = document.getElementById('save-close-mapper-option');
    if (saveCloseBtn) {
        saveCloseBtn.onclick = () => handleSaveNewOption(true);
    }
}

/**
 * Показати модальне вікно для редагування опції
 */
export async function showEditOptionModal(id) {

    const options = getOptions();
    const option = options.find(o => o.id === id);

    if (!option) {
        showToast('Опцію не знайдено', 'error');
        return;
    }

    await showModal('mapper-option-edit', null);

    const modalEl = document.querySelector('[data-modal-id="mapper-option-edit"]');

    const title = document.getElementById('option-modal-title');
    if (title) title.textContent = `Опція ${option.value_ua || ''}`;

    const deleteBtn = document.getElementById('delete-mapper-option');
    if (deleteBtn) {
        deleteBtn.classList.remove('u-hidden');
        deleteBtn.onclick = () => {
            closeModal();
            showDeleteOptionConfirm(id);
        };
    }

    populateCharacteristicSelect();
    populateParentOptionSelect(option.parent_option_id || null);
    if (modalEl) initCustomSelects(modalEl);
    fillOptionForm(option);
    populateRelatedChildOptions(id);
    renderMappedMpOptionsSections(id);
    initSectionNavigation('option-section-navigator');

    modalEl?.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        };
    });

    const saveBtn = document.getElementById('save-mapper-option');
    if (saveBtn) {
        saveBtn.onclick = () => handleUpdateOption(id, false);
    }

    const saveCloseBtn = document.getElementById('save-close-mapper-option');
    if (saveCloseBtn) {
        saveCloseBtn.onclick = () => handleUpdateOption(id, true);
    }
}

async function showDeleteOptionConfirm(id) {
    const options = getOptions();
    const option = options.find(o => o.id === id);

    if (!option) {
        showToast('Опцію не знайдено', 'error');
        return;
    }

    // Каскадні попередження
    const deps = getOptionDependencies(id, getMapOptions());
    const items = [];
    if (deps.mappings > 0)
        items.push({ icon: 'link_off', text: `<strong>${deps.mappings}</strong> прив'язок до МП буде видалено` });
    if (deps.children > 0)
        items.push({ icon: 'circle', text: `<strong>${deps.children}</strong> дочірніх опцій буде відв'язано` });

    const confirmed = await showConfirmModal({
        action: 'видалити',
        entity: 'опцію',
        name: option.value_ua,
        details: buildCascadeDetails(items)
    });

    if (confirmed) {
        try {
            await deleteOption(id);

            // Каскадне очищення: видалити маппінги
            const optMappings = getMapOptions().filter(m => m.option_id === id);
            for (const mapping of optMappings) {
                await deleteOptionMapping(mapping.id);
            }

            // Каскадне очищення: відв'язати дочірні опції
            const children = getOptions().filter(o => o.parent_option_id === id);
            for (const child of children) {
                await updateOption(child.id, { parent_option_id: '' });
            }

            showToast('Опцію видалено', 'success');
            runHook('onDataChanged');
        } catch (error) {
            showToast('Помилка видалення опції', 'error');
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ФОРМА
// ═══════════════════════════════════════════════════════════════════════════

async function handleSaveNewOption(shouldClose = true) {
    const data = getOptionFormData();
    try {
        await addOption(data);
        showToast('Опцію додано', 'success');
        if (shouldClose) closeModal();
        runHook('onDataChanged');
    } catch (error) {
        showToast('Помилка додавання опції', 'error');
    }
}

async function handleUpdateOption(id, shouldClose = true) {
    const data = getOptionFormData();
    try {
        await updateOption(id, data);
        showToast('Опцію оновлено', 'success');
        if (shouldClose) closeModal();
        runHook('onDataChanged');
    } catch (error) {
        showToast('Помилка оновлення опції', 'error');
    }
}
