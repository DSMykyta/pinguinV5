// js/pages/entities/entities-categories.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    ENTITIES - CATEGORIES PLUGIN                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  ПЛАГIН — Категорiї: CRUD операцiї + модалки                            ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Управлiння власними категорiями та маппiнг MP категорiй.                ║
 * ║                                                                          ║
 * ║  ЕКСПОРТОВАНI ФУНКЦIЇ:                                                   ║
 * ║  - init() — Iнiцiалiзацiя плагiна (реєстрацiя hooks)                    ║
 * ║  - showAddCategoryModal() — Модалка додавання категорiї                  ║
 * ║  - showEditCategoryModal(id) — Модалка редагування категорiї             ║
 * ║  - showSelectOwnCategoryModal(mpIds) — Вибiр власної категорiї           ║
 * ║  - showViewMpCategoryModal(mpCatId) — Перегляд MP категорiї              ║
 * ║                                                                          ║
 * ║  ЗАЛЕЖНОСТI:                                                             ║
 * ║  - entities-state.js (state, hooks)                                      ║
 * ║  - entities-table.js (рендеринг)                                         ║
 * ║  - entities-utils.js (утилiти)                                           ║
 * ║  - ../../data/ (API операцiї)                                            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { registerHook, runHook } from './entities-plugins.js';
import {
    addCategory, updateCategory, deleteCategory, getCategories,
    getCharacteristics, updateCharacteristic,
    getCategoryDependencies
} from '../../data/entities-data.js';
import {
    deleteCategoryMapping,
    getMapCategories
} from '../../data/mappings-data.js';
import { showModal, closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { showConfirmModal } from '../../components/modal/modal-main.js';
import { initCustomSelects } from '../../components/forms/select.js';
import {
    initSectionNavigation,
    buildCascadeDetails
} from './entities-utils.js';
import {
    getCategoryFormData,
    initGroupingToggleHandler,
    fillCategoryForm,
    clearCategoryForm,
    populateParentCategorySelect
} from './entities-categories-form.js';
import { populateRelatedCharacteristics } from './entities-categories-characteristics.js';
import {
    initCategoriesMappings,
    renderMappedMpCategoriesSections,
    showSelectOwnCategoryModal,
    showViewMpCategoryModal
} from './entities-categories-mappings.js';
import { showBindingsModal } from './entities-categories-bindings.js';

export const PLUGIN_NAME = 'entities-categories';
export {
    showSelectOwnCategoryModal,
    showViewMpCategoryModal,
    showBindingsModal
};

/**
 * Iнiцiалiзацiя плагiна
 * Реєструє hooks та позначає плагiн як завантажений
 */
export function init(state) {
    initCategoriesMappings(state);
    registerHook('onTabChange', handleTabChange);
    registerHook('onDataLoaded', handleDataLoaded);
}

function handleTabChange(newTab, prevTab) {
    if (newTab === 'categories') {
        // Таб категорiй активовано
    }
}

function handleDataLoaded() {
    // Оновити залежнi данi якщо потрiбно
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD МОДАЛКИ
// ═══════════════════════════════════════════════════════════════════════════

export async function showAddCategoryModal() {
    await showModal('mapper-category-edit', null);

    const modalEl = document.querySelector('[data-modal-id="mapper-category-edit"]');

    const title = document.getElementById('category-modal-title');
    if (title) title.textContent = 'Додати категорiю';

    const deleteBtn = document.getElementById('delete-mapper-category');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    clearCategoryForm();
    populateParentCategorySelect();
    initGroupingToggleHandler();

    if (modalEl) initCustomSelects(modalEl);
    initSectionNavigation('category-section-navigator');

    modalEl?.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        };
    });

    const saveBtn = document.getElementById('save-mapper-category');
    if (saveBtn) {
        saveBtn.onclick = () => handleSaveNewCategory(false);
    }

    const saveCloseBtn = document.getElementById('save-close-mapper-category');
    if (saveCloseBtn) {
        saveCloseBtn.onclick = () => handleSaveNewCategory(true);
    }
}

export async function showEditCategoryModal(id) {
    const categories = getCategories();
    const category = categories.find(c => c.id === id);

    if (!category) {
        showToast('Категорiю не знайдено', 'error');
        return;
    }

    await showModal('mapper-category-edit', null);

    const modalEl = document.querySelector('[data-modal-id="mapper-category-edit"]');

    const title = document.getElementById('category-modal-title');
    if (title) title.textContent = `Категорiя ${category.name_ua || ''}`;

    const deleteBtn = document.getElementById('delete-mapper-category');
    if (deleteBtn) {
        deleteBtn.classList.remove('u-hidden');
        deleteBtn.onclick = () => {
            closeModal();
            showDeleteCategoryConfirm(id);
        };
    }

    populateParentCategorySelect(id);
    initGroupingToggleHandler();
    if (modalEl) initCustomSelects(modalEl);
    fillCategoryForm(category);
    populateRelatedCharacteristics(id);
    renderMappedMpCategoriesSections(id);
    initSectionNavigation('category-section-navigator');

    modalEl?.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        };
    });

    const saveBtn = document.getElementById('save-mapper-category');
    if (saveBtn) {
        saveBtn.onclick = () => handleUpdateCategory(id, false);
    }

    const saveCloseBtn = document.getElementById('save-close-mapper-category');
    if (saveCloseBtn) {
        saveCloseBtn.onclick = () => handleUpdateCategory(id, true);
    }
}

async function showDeleteCategoryConfirm(id) {
    const categories = getCategories();
    const category = categories.find(c => c.id === id);

    if (!category) {
        showToast('Категорiю не знайдено', 'error');
        return;
    }

    const deps = getCategoryDependencies(id, getMapCategories());
    const items = [];
    if (deps.mappings > 0)
        items.push({ icon: 'link_off', text: `<strong>${deps.mappings}</strong> прив'язок до МП буде видалено` });
    if (deps.characteristics > 0)
        items.push({ icon: 'change_history', text: `<strong>${deps.characteristics}</strong> характеристик буде вiдв'язано` });

    const confirmed = await showConfirmModal({
        action: 'видалити',
        entity: 'категорiю',
        name: category.name_ua,
        details: buildCascadeDetails(items)
    });

    if (confirmed) {
        try {
            await deleteCategory(id);

            const catMappings = getMapCategories().filter(m => m.category_id === id);
            for (const mapping of catMappings) {
                await deleteCategoryMapping(mapping.id);
            }

            const linkedChars = getCharacteristics().filter(c => {
                if (!c.category_ids) return false;
                return c.category_ids.split(',').map(cid => cid.trim()).includes(id);
            });
            for (const char of linkedChars) {
                const newIds = char.category_ids.split(',').map(cid => cid.trim()).filter(cid => cid !== id).join(',');
                await updateCharacteristic(char.id, { category_ids: newIds });
            }

            showToast('Категорiю видалено', 'success');
            runHook('onDataChanged');
        } catch (error) {
            showToast('Помилка видалення категорiї', 'error');
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ФОРМА
// ═══════════════════════════════════════════════════════════════════════════

async function handleSaveNewCategory(shouldClose = true) {
    const data = getCategoryFormData();
    try {
        await addCategory(data);
        showToast('Категорiю додано', 'success');
        if (shouldClose) closeModal();
        runHook('onDataChanged');
    } catch (error) {
        showToast('Помилка додавання категорiї', 'error');
    }
}

async function handleUpdateCategory(id, shouldClose = true) {
    const data = getCategoryFormData();
    try {
        await updateCategory(id, data);
        showToast('Категорiю оновлено', 'success');
        if (shouldClose) closeModal();
        runHook('onDataChanged');
    } catch (error) {
        showToast('Помилка оновлення категорiї', 'error');
    }
}
