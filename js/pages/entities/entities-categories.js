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

let _state = null;

import { registerEntitiesPlugin, runHook } from './entities-plugins.js';
import {
    addCategory, updateCategory, deleteCategory, getCategories,
    getCharacteristics, getOptions, updateCharacteristic,
    getCategoryDependencies
} from '../../data/entities-data.js';
import { getMpCategories } from '../../data/mp-data.js';
import { getMarketplaces } from '../../data/marketplaces-data.js';
import {
    createCategoryMapping, batchCreateCategoryMapping, getMappedMpCategories, deleteCategoryMapping,
    getMapCategories
} from '../../data/mappings-data.js';
import { showModal, closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { showConfirmModal } from '../../components/modal/modal-main.js';
import { initCustomSelects, reinitializeCustomSelect } from '../../components/forms/select.js';
import { getBatchBar } from '../../components/actions/actions-batch.js';
import { escapeHtml } from '../../utils/utils-text.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';
import {
    initSectionNavigation,
    buildCategoryTree,
    renderTreeOptions,
    createModalOverlay,
    closeModalOverlay,
    setupModalCloseHandlers,
    buildMpViewModal,
    showMapToMpModal,
    buildCascadeDetails
} from './entities-utils.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import { initPaginationCharm } from '../../components/charms/pagination/pagination-main.js';
import { initSearchCharm } from '../../components/charms/charm-search.js';
import { initColumnsCharm } from '../../components/charms/charm-columns.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';

export const PLUGIN_NAME = 'entities-categories';

/**
 * Iнiцiалiзацiя плагiна
 * Реєструє hooks та позначає плагiн як завантажений
 */
export function init(state) {
    _state = state;
    registerEntitiesPlugin('onTabChange', handleTabChange);
    registerEntitiesPlugin('onDataLoaded', handleDataLoaded);
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

function getCategoryFormData() {
    const groupingYes = document.getElementById('mapper-category-grouping-yes');
    const isGrouping = groupingYes?.checked ? 'TRUE' : 'FALSE';

    return {
        name_ua: document.getElementById('mapper-category-name-ua')?.value.trim() || '',
        name_ru: document.getElementById('mapper-category-name-ru')?.value.trim() || '',
        parent_id: document.getElementById('mapper-category-parent')?.value || '',
        grouping: isGrouping
    };
}

function updateCategoryGroupingDot(isGrouping) {
    const dot = document.getElementById('category-grouping-dot');
    if (dot) {
        dot.classList.remove('c-green', 'c-yellow');
        dot.classList.add(isGrouping ? 'c-yellow' : 'c-green');
        dot.title = isGrouping ? 'Групуюча' : 'Товарна';
    }
}

function initGroupingToggleHandler() {
    const groupingYes = document.getElementById('mapper-category-grouping-yes');
    const groupingNo = document.getElementById('mapper-category-grouping-no');
    if (!groupingYes || groupingYes.dataset.toggleInited) return;
    groupingYes.addEventListener('change', () => updateCategoryGroupingDot(true));
    if (groupingNo) groupingNo.addEventListener('change', () => updateCategoryGroupingDot(false));
    groupingYes.dataset.toggleInited = '1';
}

function fillCategoryForm(category) {
    const nameUaField = document.getElementById('mapper-category-name-ua');
    const nameRuField = document.getElementById('mapper-category-name-ru');
    const parentField = document.getElementById('mapper-category-parent');
    const groupingYes = document.getElementById('mapper-category-grouping-yes');
    const groupingNo = document.getElementById('mapper-category-grouping-no');

    if (nameUaField) nameUaField.value = category.name_ua || '';
    if (nameRuField) nameRuField.value = category.name_ru || '';
    if (parentField) parentField.value = category.parent_id || '';

    const isGrouping = category.grouping === 'TRUE' || category.grouping === true || category.grouping === 'true';
    if (groupingYes) groupingYes.checked = isGrouping;
    if (groupingNo) groupingNo.checked = !isGrouping;
    updateCategoryGroupingDot(isGrouping);
}

function clearCategoryForm() {
    const nameUaField = document.getElementById('mapper-category-name-ua');
    const nameRuField = document.getElementById('mapper-category-name-ru');
    const parentField = document.getElementById('mapper-category-parent');
    const groupingYes = document.getElementById('mapper-category-grouping-yes');
    const groupingNo = document.getElementById('mapper-category-grouping-no');

    if (nameUaField) nameUaField.value = '';
    if (nameRuField) nameRuField.value = '';
    if (parentField) parentField.value = '';

    if (groupingYes) groupingYes.checked = false;
    if (groupingNo) groupingNo.checked = true;
    updateCategoryGroupingDot(false);
}

function populateParentCategorySelect(excludeId = null) {
    const select = document.getElementById('mapper-category-parent');
    if (!select) return;

    const categories = getCategories();

    select.innerHTML = '<option value="">— Без батькiвської —</option>';

    categories.forEach(cat => {
        if (cat.id !== excludeId) {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name_ua || cat.id;
            select.appendChild(option);
        }
    });

    reinitializeCustomSelect(select);
}

async function showAddCharacteristicToCategoryModal(categoryId, onSuccess) {
    const allCharacteristics = getCharacteristics();

    const availableChars = allCharacteristics.filter(char => {
        if (!char.category_ids) return true;
        const ids = Array.isArray(char.category_ids)
            ? char.category_ids
            : String(char.category_ids).split(',').map(id => id.trim());
        return !ids.includes(categoryId);
    });

    if (availableChars.length === 0) {
        showToast('Всi характеристики вже прив\'язанi до цiєї категорiї', 'info');
        return;
    }

    const modalHtml = `
        <div class="modal-overlay open">
            <div class="modal-container modal-small">
                <div class="modal-header">
                    <h2 class="modal-title">Додати характеристику</h2>
                    <div class="group">
                        <button class="btn-icon modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="group column">
                        <label for="select-char-to-add">Оберiть характеристику</label>
                        <select id="select-char-to-add" data-custom-select placeholder="Оберiть характеристику">
                            <option value="">-- Оберiть --</option>
                            ${availableChars.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name_ua || c.id)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-outline modal-cancel-btn">Скасувати</button>
                    <button class="btn-primary modal-confirm-btn">Додати</button>
                </div>
            </div>
        </div>
    `;

    const overlay = createModalOverlay(modalHtml);
    document.body.appendChild(overlay);
    initCustomSelects(overlay);

    const closeBtn = overlay.querySelector('.modal-close-btn');
    const cancelBtn = overlay.querySelector('.modal-cancel-btn');
    const confirmBtn = overlay.querySelector('.modal-confirm-btn');
    const selectEl = overlay.querySelector('#select-char-to-add');

    const cleanup = () => {
        overlay.remove();
    };

    closeBtn?.addEventListener('click', cleanup);
    cancelBtn?.addEventListener('click', cleanup);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup();
    });

    confirmBtn?.addEventListener('click', async () => {
        const charId = selectEl?.value;
        if (!charId) {
            showToast('Оберiть характеристику', 'warning');
            return;
        }

        try {
            const char = allCharacteristics.find(c => c.id === charId);
            if (!char) return;

            let categoryIds = [];
            if (char.category_ids) {
                categoryIds = Array.isArray(char.category_ids)
                    ? [...char.category_ids]
                    : String(char.category_ids).split(',').map(id => id.trim());
            }
            categoryIds.push(categoryId);

            await updateCharacteristic(charId, { category_ids: categoryIds.join(',') });
            showToast('Характеристику прив\'язано', 'success');
            cleanup();
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Помилка прив\'язування:', error);
            showToast('Помилка прив\'язування характеристики', 'error');
        }
    });
}

function populateRelatedCharacteristics(categoryId) {
    if (!document.getElementById('category-related-chars')) return;

    const loadData = () => {
        const characteristics = getCharacteristics();
        return characteristics.filter(char => {
            if (!char.category_ids) return false;
            const ids = Array.isArray(char.category_ids)
                ? char.category_ids
                : String(char.category_ids).split(',').map(id => id.trim());
            return ids.includes(categoryId);
        });
    };

    const allOptions = getOptions();

    registerActionHandlers('category-characteristics', {
        edit: async (rowId) => {
            const { showEditCharacteristicModal } = await import('./entities-characteristics.js');
            await showEditCharacteristicModal(rowId);
        },
        unlink: async (rowId, data) => {
            await handleUnlinkCharacteristic(rowId, data.name, categoryId);
        }
    });

    let catCharsCleanup = null;

    const managed = createManagedTable({
        container: 'category-related-chars',
        columns: [
            { ...col('id', 'ID', 'tag', { span: 1 }), searchable: true },
            { ...col('category_ids', 'Категорiя', 'binding-chip', { span: 2 }), searchable: true, searchChecked: false },
            { ...col('name_ua', 'Назва', 'name', { span: 4 }), searchable: true },
            { ...col('type', 'Тип', 'code'), searchable: true, searchChecked: false },
            col('optCount', 'Опцiї', 'counter', {
                sortable: true,
                render: (value, row) => {
                    const count = allOptions.filter(o => o.characteristic_id === row.id).length;
                    const cls = count === 0 ? 'chip' : 'chip c-secondary';
                    return `<span class="${cls}">${count}</span>`;
                }
            }),
            col('action', ' ', 'action', {
                render: (value, row) => actionButton({
                    action: 'unlink', rowId: row.id,
                    data: { name: row.name_ua || row.id }
                })
            })
        ],
        data: loadData(),
        statsId: null,
        paginationId: null,
        tableConfig: {
            rowActionsHeader: ' ',
            rowActions: (row) => actionButton({ action: 'edit', rowId: row.id }),
            getRowId: (row) => row.id,
            emptyState: { message: 'Характеристики вiдсутнi' },
            withContainer: false,
            onAfterRender: (cont) => {
                if (catCharsCleanup) catCharsCleanup();
                catCharsCleanup = initActionHandlers(cont, 'category-characteristics');
            },
            plugins: {
                sorting: { columnTypes: { id: 'id-text', name_ua: 'string' } }
            }
        },
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'cat-chars'
    });

    initPaginationCharm();
    initSearchCharm();
    initColumnsCharm();

    const container = document.getElementById('category-related-chars');
    if (container) {
        container.addEventListener('charm:refresh', () => {
            managed.setData(loadData());
        });
    }

    const handleUnlinkCharacteristic = async (charId, charName, catId) => {
        const confirmed = await showConfirmModal({
            action: 'вiд\'язати',
            entity: 'характеристику',
            name: charName,
        });

        if (confirmed) {
            try {
                const characteristics = getCharacteristics();
                const char = characteristics.find(c => c.id === charId);
                if (!char) return;

                const currentIds = char.category_ids
                    ? String(char.category_ids).split(',').map(id => id.trim()).filter(id => id)
                    : [];
                const newIds = currentIds.filter(id => id !== catId);

                await updateCharacteristic(charId, { category_ids: newIds.join(',') });
                showToast('Характеристику вiдв\'язано', 'success');
                managed.setData(loadData());
            } catch (error) {
                console.error('Помилка вiдв\'язування:', error);
                showToast('Помилка вiдв\'язування характеристики', 'error');
            }
        }
    };

    const addBtn = document.getElementById('btn-add-category-char');
    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            await showAddCharacteristicToCategoryModal(categoryId, () => {
                managed.setData(loadData());
            });
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// МАППIНГ
// ═══════════════════════════════════════════════════════════════════════════

export async function showSelectOwnCategoryModal(selectedMpCatIds) {
    const ownCategories = getCategories();

    if (ownCategories.length === 0) {
        showToast('Немає власних категорiй для маппiнгу', 'warning');
        return;
    }

    const categoryTree = buildCategoryTree(ownCategories);
    const optionsHtml = renderTreeOptions(categoryTree);

    const modalHtml = `
        <div class="modal-overlay open">
            <div class="modal-container modal-small">
                <div class="modal-header">
                    <h2 class="modal-title">Замапити до категорiї</h2>
                    <div class="group">
                        <button class="btn-icon modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <p class="u-mb-16">Вибрано ${selectedMpCatIds.length} MP категорiй для маппiнгу</p>
                    <div class="group column">
                        <label>Власна категорiя</label>
                        <select id="select-own-category" class="input-main">
                            <option value="">Оберiть категорiю...</option>
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

    const modalOverlay = createModalOverlay(modalHtml);
    const closeThisModal = () => closeModalOverlay(modalOverlay);

    setupModalCloseHandlers(modalOverlay, closeThisModal);

    const confirmBtn = document.getElementById('btn-confirm-category-mapping');
    const selectEl = document.getElementById('select-own-category');

    confirmBtn.addEventListener('click', async () => {
        const ownCatId = selectEl.value;
        if (!ownCatId) {
            showToast('Оберiть категорiю', 'warning');
            return;
        }

        try {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="material-symbols-outlined spinning">progress_activity</span><span>Маппiнг...</span>';

            await batchCreateCategoryMapping(selectedMpCatIds, ownCatId);

            closeThisModal();

            _state.selectedRows.categories.clear();
            const batchBar = getBatchBar('entities-categories');
            if (batchBar) batchBar.deselectAll();

            showToast(`Замаплено ${selectedMpCatIds.length} категорiй`, 'success');
            runHook('onDataChanged');
        } catch (error) {
            console.error('Помилка маппiнгу:', error);
            showToast('Помилка маппiнгу категорiй', 'error');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<span class="material-symbols-outlined">link</span><span>Замапити</span>';
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// ПЕРЕГЛЯД MP КАТЕГОРIЇ
// ═══════════════════════════════════════════════════════════════════════════

export async function showViewMpCategoryModal(mpCatIdOrData) {
    let mpCat;

    if (typeof mpCatIdOrData === 'object' && mpCatIdOrData !== null) {
        mpCat = mpCatIdOrData;
    } else {
        const mpCats = getMpCategories();
        mpCat = mpCats.find(c => c.id === mpCatIdOrData);
        if (!mpCat) mpCat = mpCats.find(c => c.external_id === mpCatIdOrData);
        if (!mpCat) mpCat = mpCats.find(c => mpCatIdOrData.startsWith(c.id));
    }

    if (!mpCat) {
        showToast('MP категорiю не знайдено', 'error');
        return;
    }

    let jsonData = {};
    if (mpCat.data && typeof mpCat.data === 'string') {
        try { jsonData = JSON.parse(mpCat.data); } catch (e) {}
    }

    const marketplaces = getMarketplaces();
    const marketplace = marketplaces.find(m => m.id === mpCat.marketplace_id);
    const mpName = marketplace ? marketplace.name : mpCat.marketplace_id;

    const mapCats = getMapCategories();
    const mapping = mapCats.find(m =>
        m.mp_category_id === mpCat.id || m.mp_category_id === mpCat.external_id
    );
    let mappedToName = '';
    if (mapping) {
        const ownCat = getCategories().find(c => c.id === mapping.category_id);
        mappedToName = ownCat ? (ownCat.name_ua || ownCat.id) : mapping.category_id;
    }

    const modalHtml = buildMpViewModal({
        title: 'Категорiя маркетплейсу',
        mpName,
        externalId: mpCat.external_id,
        jsonData,
        mappedToName
    });

    const modalOverlay = createModalOverlay(modalHtml);
    setupModalCloseHandlers(modalOverlay, () => closeModalOverlay(modalOverlay));
}

// ═══════════════════════════════════════════════════════════════════════════
// MP СЕКЦIЇ
// ═══════════════════════════════════════════════════════════════════════════

function renderMappedMpCategoriesSections(ownCatId) {
    const nav = document.getElementById('category-section-navigator');
    const content = nav?.closest('.modal-container')?.querySelector('.modal-body > main');
    if (!nav || !content) return;

    nav.querySelectorAll('.btn-icon.expand.touch.mp-nav-item').forEach(el => el.remove());
    content.querySelectorAll('section.mp-section').forEach(el => el.remove());

    const mappedMpCats = getMappedMpCategories(ownCatId);
    const marketplaces = getMarketplaces();

    const byMarketplace = {};
    mappedMpCats.forEach(mpCat => {
        const mpId = mpCat.marketplace_id;
        if (!byMarketplace[mpId]) {
            const marketplace = marketplaces.find(m => m.id === mpId);
            byMarketplace[mpId] = {
                name: marketplace?.name || mpId,
                items: []
            };
        }
        byMarketplace[mpId].items.push(mpCat);
    });

    const navMain = nav.querySelector('.nav-main');
    const navTarget = navMain || nav;
    const navItem = document.createElement('a');
    navItem.href = '#section-mp-categories';
    navItem.className = 'btn-icon expand mp-nav-item';
    navItem.setAttribute('aria-label', 'Маркетплейси');
    navItem.innerHTML = `
        <span class="material-symbols-outlined">hexagon</span>
        <span class="btn-icon-label">Маркетплейси</span>
        ${mappedMpCats.length ? `<span>${mappedMpCats.length}</span>` : ''}
    `;
    navTarget.appendChild(navItem);

    const section = document.createElement('section');
    section.id = 'section-mp-categories';
    section.className = 'mp-section';
    section.innerHTML = renderMpCategoriesSectionContent(byMarketplace, mappedMpCats.length);
    content.appendChild(section);

    const mapBtn = section.querySelector('.btn-map-mp');
    if (mapBtn) {
        mapBtn.addEventListener('click', () => {
            showMapToMpModal({
                marketplaces,
                getMpEntities: (mpId) => getMpCategories().filter(c => c.marketplace_id === mpId),
                getEntityLabel: (entity) => {
                    const data = typeof entity.data === 'string' ? JSON.parse(entity.data || '{}') : (entity.data || {});
                    return `#${entity.external_id} — ${data.name || entity.external_id}`;
                },
                onMap: async (mpCatId) => {
                    await createCategoryMapping(ownCatId, mpCatId);
                    showToast('Маппiнг створено', 'success');
                    renderMappedMpCategoriesSections(ownCatId);
                    initSectionNavigation('category-section-navigator');
                    runHook('onDataChanged');
                }
            });
        });
    }

    initSectionNavigation('category-section-navigator');

    registerActionHandlers('mp-category-mapping', {
        unmap: async (rowId, data) => {
            if (data.mappingId) {
                const confirmed = await showConfirmModal({
                    title: 'Вiд\'язати?',
                    message: 'Зняти прив\'язку з маркетплейсу?',
                });
                if (!confirmed) return;
                const mapping = getMapCategories().find(m => m.id === data.mappingId);
                const undoData = mapping ? { ownId: mapping.category_id, mpId: mapping.mp_category_id } : null;
                await deleteCategoryMapping(data.mappingId);
                renderMappedMpCategoriesSections(ownCatId);
                runHook('onDataChanged');
                showToast('Прив\'язку знято', 'success', undoData ? {
                    duration: 6000,
                    action: {
                        label: 'Вiдмiнити',
                        onClick: async () => {
                            await createCategoryMapping(undoData.ownId, undoData.mpId);
                            renderMappedMpCategoriesSections(ownCatId);
                            runHook('onDataChanged');
                        }
                    }
                } : 3000);
            }
        }
    });

    if (content._cleanupMpMapping) content._cleanupMpMapping();
    content._cleanupMpMapping = initActionHandlers(content, 'mp-category-mapping');
}

function renderMpCategoriesSectionContent(byMarketplace, totalCount) {
    const cardsHtml = Object.entries(byMarketplace).map(([mpId, { name, items }]) => {
        return items.map(item => {
            const data = typeof item.data === 'string' ? JSON.parse(item.data) : (item.data || {});
            const fileId = item.file_id || '';
            const downloadBtn = fileId
                ? `<a href="https://drive.google.com/uc?export=download&id=${escapeHtml(fileId)}" target="_blank" class="btn-icon" title="Завантажити довiдник" aria-label="Завантажити довiдник"><span class="material-symbols-outlined">download</span></a>`
                : '';
            return `
                <div class="block" data-mp-id="${escapeHtml(item.id)}">
                    <div class="block-header">
                        <h3>${escapeHtml(name)}</h3>
                        <div class="group">
                            ${downloadBtn}
                            ${actionButton({
                                action: 'unmap',
                                rowId: item.id,
                                data: { mappingId: item._mappingId }
                            })}
                        </div>
                    </div>
                    <div class="block-list">
                        ${renderMpCategoryDataFields(data)}
                    </div>
                </div>
            `;
        }).join('');
    }).join('');

    return `
        <div class="section-header">
            <div class="section-name-block">
                <div class="section-name">
                    <h2>Маркетплейси</h2>
                    <span class="tag">${totalCount}</span>
                </div>
                <span class="body-s">Прив'язанi категорiї маркетплейсiв</span>
            </div>
            <div class="group">
                <button class="btn-outline btn-map-mp">
                    <span class="material-symbols-outlined">link</span>
                    <span>Замапити</span>
                </button>
            </div>
        </div>
        <div class="section-content">
            <div class="block-group grid">
                ${cardsHtml || renderAvatarState('empty', { message: "Немає прив'язок", size: 'medium', containerClass: 'empty-state', avatarClass: 'empty-state-avatar', messageClass: 'avatar-state-message', showMessage: true })}
            </div>
        </div>
    `;
}

function renderMpCategoryDataFields(data) {
    const skipFields = ['our_category_id', 'our_cat_id'];
    const fields = [];

    Object.entries(data).forEach(([key, value]) => {
        if (skipFields.includes(key)) return;
        if (value === null || value === undefined || value === '') return;
        fields.push(`
            <div class="block-line">
                <label class="block-line-label">${escapeHtml(key)}</label>
                <span class="block-line-text">${escapeHtml(String(value))}</span>
            </div>
        `);
    });

    return fields.join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// МОДАЛ ПРИВ'ЯЗОК (BINDINGS MODAL)
// ═══════════════════════════════════════════════════════════════════════════

function extractMpName(obj) {
    if (!obj || typeof obj !== 'object') return '';
    if (obj.name_ua) return obj.name_ua;
    if (obj.nameUa) return obj.nameUa;
    if (obj.titleUk) return obj.titleUk;
    if (obj.titleRu) return obj.titleRu;
    if (obj.name) return obj.name;
    if (obj.name_ru) return obj.name_ru;
    if (obj.nameRu) return obj.nameRu;
    const nameKey = Object.keys(obj).find(k => {
        const lower = k.toLowerCase();
        return lower.includes('name') || lower.includes('title');
    });
    return nameKey ? obj[nameKey] : '';
}

function getMpCategoryLabel(mpCat) {
    if (!mpCat) return '';
    try {
        const data = typeof mpCat.data === 'string' ? JSON.parse(mpCat.data || '{}') : (mpCat.data || {});
        return extractMpName(data) || extractMpName(mpCat) || mpCat.external_id || mpCat.id;
    } catch {
        return extractMpName(mpCat) || mpCat.external_id || mpCat.id;
    }
}

export async function showBindingsModal(ownCatId, ownCatName) {
    const MODAL_ID = 'mapper-bindings';

    await showModal(MODAL_ID);

    const modalEl = document.getElementById(`modal-${MODAL_ID}`);
    if (!modalEl) return;

    const titleEl = modalEl.querySelector('#bindings-modal-title');
    if (titleEl) titleEl.textContent = `Прив'язки: ${ownCatName || ownCatId}`;

    const rowsContainer = modalEl.querySelector('#bindings-modal-rows');
    if (!rowsContainer) return;

    modalEl.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = () => {
            closeModal(MODAL_ID);
            runHook('onDataChanged');
        };
    });

    renderBindingsRows(ownCatId, rowsContainer);
}

function renderBindingsRows(ownCatId, container) {
    const marketplaces = getMarketplaces().filter(m =>
        m.is_active === true || String(m.is_active).toLowerCase() === 'true'
    );
    const allMpCategories = getMpCategories();
    const mappedCats = getMappedMpCategories(ownCatId);

    let html = '';

    mappedCats.forEach(mpCat => {
        const mp = marketplaces.find(m => m.id === mpCat.marketplace_id);
        const mpName = mp?.name || mpCat.marketplace_id;
        const catLabel = getMpCategoryLabel(mpCat);
        const mappingId = mpCat._mappingId || '';

        html += `
            <div class="binding-row" data-mapping-id="${escapeHtml(mappingId)}">
                <div class="binding-field">
                    <select disabled>
                        <option selected>${escapeHtml(mpName)}</option>
                    </select>
                </div>
                <div class="binding-field binding-field-grow">
                    <select disabled>
                        <option selected>${escapeHtml(catLabel)}</option>
                    </select>
                </div>
                <button class="btn-icon binding-delete" data-mapping-id="${escapeHtml(mappingId)}" aria-label="Видалити">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
        `;
    });

    html += `
        <div class="binding-row binding-row-new">
            <div class="binding-field">
                <select class="binding-mp-select" data-custom-select>
                    <option value="">Маркетплейс</option>
                    ${marketplaces.map(mp => `<option value="${escapeHtml(mp.id)}">${escapeHtml(mp.name || mp.id)}</option>`).join('')}
                </select>
            </div>
            <div class="binding-field binding-field-grow">
                <select class="binding-cat-select" data-custom-select disabled>
                    <option value="">Категорiя МП</option>
                </select>
            </div>
            <div class="binding-placeholder"></div>
        </div>
    `;

    container.innerHTML = html;
    initCustomSelects(container);

    const mpSelect = container.querySelector('.binding-row-new .binding-mp-select');
    const catSelect = container.querySelector('.binding-row-new .binding-cat-select');

    if (mpSelect) {
        mpSelect.onchange = () => {
            const mpId = mpSelect.value;
            if (!mpId) {
                catSelect.innerHTML = '<option value="">Категорiя МП</option>';
                catSelect.disabled = true;
                reinitializeCustomSelect(catSelect);
                return;
            }

            const mpCats = allMpCategories.filter(c => c.marketplace_id === mpId);
            catSelect.disabled = false;
            catSelect.innerHTML = '<option value="">Категорiя МП</option>';
            mpCats.forEach(c => {
                const label = getMpCategoryLabel(c);
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `#${c.external_id} — ${label}`;
                catSelect.appendChild(opt);
            });
            reinitializeCustomSelect(catSelect);
        };
    }

    if (catSelect) {
        catSelect.onchange = async () => {
            const mpCatId = catSelect.value;
            if (!mpCatId) return;

            catSelect.disabled = true;
            try {
                await createCategoryMapping(ownCatId, mpCatId);
                showToast('Прив\'язку створено', 'success');
                renderBindingsRows(ownCatId, container);
            } catch (err) {
                showToast('Помилка створення прив\'язки', 'error');
                catSelect.disabled = false;
            }
        };
    }

    container.querySelectorAll('.binding-delete').forEach(btn => {
        btn.onclick = async () => {
            const mappingId = btn.dataset.mappingId;
            if (!mappingId) return;

            btn.disabled = true;
            try {
                const mapping = getMapCategories().find(m => m.id === mappingId);
                const undoData = mapping ? { ownId: mapping.category_id, mpId: mapping.mp_category_id } : null;
                await deleteCategoryMapping(mappingId);
                renderBindingsRows(ownCatId, container);
                showToast('Прив\'язку знято', 'success', undoData ? {
                    duration: 6000,
                    action: {
                        label: 'Вiдмiнити',
                        onClick: async () => {
                            await createCategoryMapping(undoData.ownId, undoData.mpId);
                            renderBindingsRows(ownCatId, container);
                        }
                    }
                } : 3000);
            } catch (err) {
                showToast('Помилка видалення', 'error');
                btn.disabled = false;
            }
        };
    });
}
