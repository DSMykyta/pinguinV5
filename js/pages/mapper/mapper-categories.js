// js/mapper/mapper-categories.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - CATEGORIES PLUGIN                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Категорії: CRUD операції + модалки                          ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Управління власними категоріями та маппінг MP категорій.                ║
 * ║                                                                          ║
 * ║  ЕКСПОРТОВАНІ ФУНКЦІЇ:                                                   ║
 * ║  - init() — Ініціалізація плагіна (реєстрація hooks)                     ║
 * ║  - showAddCategoryModal() — Модалка додавання категорії                  ║
 * ║  - showEditCategoryModal(id) — Модалка редагування категорії             ║
 * ║  - showSelectOwnCategoryModal(mpIds) — Вибір власної категорії           ║
 * ║  - showViewMpCategoryModal(mpCatId) — Перегляд MP категорії              ║
 * ║                                                                          ║
 * ║  ЗАЛЕЖНОСТІ:                                                             ║
 * ║  - mapper-state.js (state, hooks)                                        ║
 * ║  - mapper-data.js (API операції)                                         ║
 * ║  - mapper-table.js (рендеринг)                                           ║
 * ║  - mapper-utils.js (утиліти)                                             ║
 * ║  - ui-modal.js, ui-toast.js, ui-select.js (UI компоненти)                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { mapperState, registerHook, markPluginLoaded, runHook } from './mapper-state.js';
import {
    addCategory, updateCategory, deleteCategory, getCategories,
    getCharacteristics, getOptions, updateCharacteristic, getMpCategories, getMarketplaces,
    createCategoryMapping, batchCreateCategoryMapping, getMappedMpCategories, deleteCategoryMapping,
    getMapCategories, getCategoryDependencies
} from './mapper-data.js';
import { renderCurrentTab } from './mapper-table.js';
import { showModal, closeModal } from '../../components/ui-modal.js';
import { showToast } from '../../components/ui-toast.js';
import { showConfirmModal } from '../../components/ui-modal-confirm.js';
import { initCustomSelects, reinitializeCustomSelect } from '../../components/ui-select.js';
import { getBatchBar } from '../../components/ui-batch-actions.js';
import { escapeHtml } from '../../utils/text-utils.js';
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
} from './mapper-utils.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import { initPaginationCharm } from '../../components/charms/pagination/pagination-main.js';
import { initRefreshCharm } from '../../components/charms/charm-refresh.js';
import { initColumnsCharm } from '../../components/charms/charm-columns.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/ui-actions.js';

export const PLUGIN_NAME = 'mapper-categories';

/**
 * Ініціалізація плагіна
 * Реєструє hooks та позначає плагін як завантажений
 */
export function init() {
    // Реєструємо hooks для комунікації з іншими модулями
    registerHook('onTabChange', handleTabChange);
    registerHook('onDataLoaded', handleDataLoaded);

    markPluginLoaded(PLUGIN_NAME);
}

/**
 * Обробник зміни табу
 * @param {string} newTab - Новий активний таб
 * @param {string} prevTab - Попередній таб
 */
function handleTabChange(newTab, prevTab) {
    // Логіка при переході на/з табу категорій
    if (newTab === 'categories') {
        // Таб категорій активовано
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
 * Показати модальне вікно для додавання категорії
 */
export async function showAddCategoryModal() {

    await showModal('mapper-category-edit', null);

    const modalEl = document.querySelector('[data-modal-id="mapper-category-edit"]');

    const title = document.getElementById('category-modal-title');
    if (title) title.textContent = 'Додати категорію';

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
        saveBtn.onclick = handleSaveNewCategory;
    }
}

/**
 * Показати модальне вікно для редагування категорії
 */
export async function showEditCategoryModal(id) {

    const categories = getCategories();
    const category = categories.find(c => c.id === id);

    if (!category) {
        showToast('Категорію не знайдено', 'error');
        return;
    }

    await showModal('mapper-category-edit', null);

    const modalEl = document.querySelector('[data-modal-id="mapper-category-edit"]');

    const title = document.getElementById('category-modal-title');
    if (title) title.textContent = `Категорія ${category.name_ua || ''}`;

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
        saveBtn.onclick = () => handleUpdateCategory(id);
    }
}

/**
 * Показати підтвердження видалення категорії
 */
async function showDeleteCategoryConfirm(id) {
    const categories = getCategories();
    const category = categories.find(c => c.id === id);

    if (!category) {
        showToast('Категорію не знайдено', 'error');
        return;
    }

    // Каскадні попередження
    const deps = getCategoryDependencies(id);
    const items = [];
    if (deps.mappings > 0)
        items.push({ icon: 'link_off', text: `<strong>${deps.mappings}</strong> прив'язок до МП буде видалено` });
    if (deps.characteristics > 0)
        items.push({ icon: 'change_history', text: `<strong>${deps.characteristics}</strong> характеристик буде відв'язано` });

    const confirmed = await showConfirmModal({
        title: 'Видалити категорію?',
        message: `Ви впевнені, що хочете видалити категорію "${category.name_ua}"?`,
        confirmText: 'Видалити',
        cancelText: 'Скасувати',
        confirmClass: 'btn-delete',
        details: buildCascadeDetails(items)
    });

    if (confirmed) {
        try {
            await deleteCategory(id);

            // Каскадне очищення: видалити маппінги
            const catMappings = getMapCategories().filter(m => m.category_id === id);
            for (const mapping of catMappings) {
                await deleteCategoryMapping(mapping.id);
            }

            // Каскадне очищення: відв'язати характеристики
            const linkedChars = getCharacteristics().filter(c => {
                if (!c.category_ids) return false;
                return c.category_ids.split(',').map(cid => cid.trim()).includes(id);
            });
            for (const char of linkedChars) {
                const newIds = char.category_ids.split(',').map(cid => cid.trim()).filter(cid => cid !== id).join(',');
                await updateCharacteristic(char.id, { category_ids: newIds });
            }

            showToast('Категорію видалено', 'success');
            renderCurrentTab();
        } catch (error) {
            showToast('Помилка видалення категорії', 'error');
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ФОРМА
// ═══════════════════════════════════════════════════════════════════════════

async function handleSaveNewCategory() {
    const data = getCategoryFormData();

    if (!data.name_ua) {
        showToast('Введіть назву категорії', 'error');
        return;
    }

    try {
        await addCategory(data);
        showToast('Категорію додано', 'success');
        closeModal();
        renderCurrentTab();
    } catch (error) {
        showToast('Помилка додавання категорії', 'error');
    }
}

async function handleUpdateCategory(id) {
    const data = getCategoryFormData();

    if (!data.name_ua) {
        showToast('Введіть назву категорії', 'error');
        return;
    }

    try {
        await updateCategory(id, data);
        showToast('Категорію оновлено', 'success');
        closeModal();
        renderCurrentTab();
    } catch (error) {
        showToast('Помилка оновлення категорії', 'error');
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

    select.innerHTML = '<option value="">— Без батьківської —</option>';

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

/**
 * Показати модалку вибору характеристики для прив'язки до категорії
 */
async function showAddCharacteristicToCategoryModal(categoryId, onSuccess) {
    const allCharacteristics = getCharacteristics();

    // Фільтруємо - показуємо тільки ті, що ще не прив'язані
    const availableChars = allCharacteristics.filter(char => {
        if (!char.category_ids) return true;
        const ids = Array.isArray(char.category_ids)
            ? char.category_ids
            : String(char.category_ids).split(',').map(id => id.trim());
        return !ids.includes(categoryId);
    });

    if (availableChars.length === 0) {
        showToast('Всі характеристики вже прив\'язані до цієї категорії', 'info');
        return;
    }

    // Створюємо модалку
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
                        <label for="select-char-to-add">Оберіть характеристику</label>
                        <select id="select-char-to-add" data-custom-select placeholder="Оберіть характеристику">
                            <option value="">-- Оберіть --</option>
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
            showToast('Оберіть характеристику', 'warning');
            return;
        }

        try {
            // Отримуємо характеристику і додаємо categoryId
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
            console.error('❌ Помилка прив\'язування:', error);
            showToast('Помилка прив\'язування характеристики', 'error');
        }
    });
}

function populateRelatedCharacteristics(categoryId) {
    if (!document.getElementById('category-related-chars')) return;

    // Отримуємо дані
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

    // Реєструємо обробники дій
    registerActionHandlers('category-characteristics', {
        edit: async (rowId) => {
            const { showEditCharacteristicModal } = await import('./mapper-characteristics.js');
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
            { ...col('id', 'ID', 'tag'), searchable: true },
            { ...col('category_ids', 'Категорія', 'binding-chip'), searchable: true, searchChecked: false },
            { ...col('name_ua', 'Назва', 'name'), searchable: true },
            { ...col('type', 'Тип', 'code'), searchable: true, searchChecked: false },
            {
                id: '_optCount', label: 'Опції', sortable: true,
                span: 1, align: 'center',
                render: (value, row) => {
                    const count = allOptions.filter(o => o.characteristic_id === row.id).length;
                    const cls = count === 0 ? 'chip' : 'chip c-main';
                    return `<span class="${cls}">${count}</span>`;
                }
            },
            {
                id: '_unlink', label: ' ', sortable: false, span: 1,
                render: (value, row) => actionButton({
                    action: 'unlink', rowId: row.id,
                    data: { name: row.name_ua || row.id }
                })
            }
        ],
        data: loadData(),
        searchInputId: 'category-chars-search',
        statsId: null,
        paginationId: null,
        pageSize: null,
        checkboxPrefix: 'cat-chars',
        tableConfig: {
            rowActions: (row) => actionButton({ action: 'edit', rowId: row.id }),
            emptyState: { message: 'Характеристики відсутні' },
            withContainer: false,
            onAfterRender: (cont) => {
                if (catCharsCleanup) catCharsCleanup();
                catCharsCleanup = initActionHandlers(cont, 'category-characteristics');
            },
            plugins: {
                sorting: { columnTypes: { id: 'id-text', name_ua: 'string' } }
            }
        }
    });

    initPaginationCharm();
    initRefreshCharm();
    initColumnsCharm();

    // charm:refresh — оновити таблицю характеристик
    const container = document.getElementById('category-related-chars');
    if (container) {
        container.addEventListener('charm:refresh', () => {
            managed.setData(loadData());
        });
    }

    // Обробник відв'язування
    const handleUnlinkCharacteristic = async (charId, charName, catId) => {
        const confirmed = await showConfirmModal({
            title: 'Відв\'язати характеристику?',
            message: `Ви впевнені, що хочете відв'язати характеристику "${charName}" від цієї категорії?`,
            confirmText: 'Відв\'язати',
            cancelText: 'Скасувати',
            confirmClass: 'btn-warning',
            avatarState: 'confirmClose',
            avatarSize: 'small'
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
                showToast('Характеристику відв\'язано', 'success');
                managed.setData(loadData());
            } catch (error) {
                console.error('❌ Помилка відв\'язування:', error);
                showToast('Помилка відв\'язування характеристики', 'error');
            }
        }
    };

    // Кнопка "Додати"
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
// МАППІНГ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модалку вибору власної категорії для маппінгу MP категорій
 */
export async function showSelectOwnCategoryModal(selectedMpCatIds) {

    const ownCategories = getCategories();

    if (ownCategories.length === 0) {
        showToast('Немає власних категорій для маппінгу', 'warning');
        return;
    }

    const categoryTree = buildCategoryTree(ownCategories);
    const optionsHtml = renderTreeOptions(categoryTree);

    const modalHtml = `
        <div class="modal-overlay open">
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

    const modalOverlay = createModalOverlay(modalHtml);
    const closeThisModal = () => closeModalOverlay(modalOverlay);

    setupModalCloseHandlers(modalOverlay, closeThisModal);

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

// ═══════════════════════════════════════════════════════════════════════════
// ПЕРЕГЛЯД MP КАТЕГОРІЇ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати read-only модалку для MP категорії
 */
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
        showToast('MP категорію не знайдено', 'error');
        return;
    }

    let jsonData = {};
    if (mpCat.data && typeof mpCat.data === 'string') {
        try { jsonData = JSON.parse(mpCat.data); } catch (e) {}
    }

    const marketplaces = getMarketplaces();
    const marketplace = marketplaces.find(m => m.id === mpCat.marketplace_id);
    const mpName = marketplace ? marketplace.name : mpCat.marketplace_id;

    // Перевіряємо маппінг
    const mapCats = mapperState.mapCategories || [];
    const mapping = mapCats.find(m =>
        m.mp_category_id === mpCat.id || m.mp_category_id === mpCat.external_id
    );
    let mappedToName = '';
    if (mapping) {
        const ownCat = getCategories().find(c => c.id === mapping.category_id);
        mappedToName = ownCat ? (ownCat.name_ua || ownCat.id) : mapping.category_id;
    }

    const modalHtml = buildMpViewModal({
        title: 'Категорія маркетплейсу',
        mpName,
        externalId: mpCat.external_id,
        jsonData,
        mappedToName
    });

    const modalOverlay = createModalOverlay(modalHtml);
    setupModalCloseHandlers(modalOverlay, () => closeModalOverlay(modalOverlay));
}

// ═══════════════════════════════════════════════════════════════════════════
// MP СЕКЦІЇ
// ═══════════════════════════════════════════════════════════════════════════

function renderMappedMpCategoriesSections(ownCatId) {
    const nav = document.getElementById('category-section-navigator');
    const content = nav?.closest('.modal-fullscreen-container')?.querySelector('.modal-fullscreen-content');
    if (!nav || !content) return;

    nav.querySelectorAll('.sidebar-nav-item.mp-nav-item').forEach(el => el.remove());
    content.querySelectorAll('section.mp-section').forEach(el => el.remove());

    const mappedMpCats = getMappedMpCategories(ownCatId);
    const marketplaces = getMarketplaces();

    // Групуємо по маркетплейсах
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

    // Одна навігаційна кнопка
    const navMain = nav.querySelector('.sidebar-nav-main');
    const navTarget = navMain || nav;
    const navItem = document.createElement('a');
    navItem.href = '#section-mp-categories';
    navItem.className = 'sidebar-nav-item mp-nav-item';
    navItem.setAttribute('aria-label', 'Маркетплейси');
    navItem.innerHTML = `
        <span class="material-symbols-outlined">hexagon</span>
        <span class="sidebar-nav-label">Маркетплейси${mappedMpCats.length ? ` (${mappedMpCats.length})` : ''}</span>
    `;
    navTarget.appendChild(navItem);

    // Одна секція
    const section = document.createElement('section');
    section.id = 'section-mp-categories';
    section.className = 'mp-section';
    section.innerHTML = renderMpCategoriesSectionContent(byMarketplace, mappedMpCats.length);
    content.appendChild(section);

    // Кнопка "Замапити" в секції
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
                    showToast('Маппінг створено', 'success');
                    renderMappedMpCategoriesSections(ownCatId);
                    initSectionNavigation('category-section-navigator');
                    renderCurrentTab();
                }
            });
        });
    }

    initSectionNavigation('category-section-navigator');

    registerActionHandlers('mp-category-mapping', {
        unmap: async (rowId, data) => {
            if (data.mappingId) {
                const confirmed = await showConfirmModal({
                    title: 'Відв\'язати категорію',
                    message: 'Зняти прив\'язку з маркетплейсу?'
                });
                if (!confirmed) return;
                const mapping = getMapCategories().find(m => m.id === data.mappingId);
                const undoData = mapping ? { ownId: mapping.category_id, mpId: mapping.mp_category_id } : null;
                await deleteCategoryMapping(data.mappingId);
                renderMappedMpCategoriesSections(ownCatId);
                renderCurrentTab();
                showToast('Прив\'язку знято', 'success', undoData ? {
                    duration: 6000,
                    action: {
                        label: 'Відмінити',
                        onClick: async () => {
                            await createCategoryMapping(undoData.ownId, undoData.mpId);
                            renderMappedMpCategoriesSections(ownCatId);
                            renderCurrentTab();
                        }
                    }
                } : 3000);
            }
        }
    });

    // Cleanup попередній listener перед повторною ініціалізацією
    if (content._cleanupMpMapping) content._cleanupMpMapping();
    content._cleanupMpMapping = initActionHandlers(content, 'mp-category-mapping');
}

function renderMpCategoriesSectionContent(byMarketplace, totalCount) {
    const cardsHtml = Object.entries(byMarketplace).map(([mpId, { name, items }]) => {
        return items.map(item => {
            const data = typeof item.data === 'string' ? JSON.parse(item.data) : (item.data || {});
            const fileId = item.file_id || '';
            const downloadBtn = fileId
                ? `<a href="https://drive.google.com/uc?export=download&id=${escapeHtml(fileId)}" target="_blank" class="btn-icon" title="Завантажити довідник" aria-label="Завантажити довідник"><span class="material-symbols-outlined">download</span></a>`
                : '';
            return `
                <div class="mp-item-card" data-mp-id="${escapeHtml(item.id)}">
                    <div class="mp-item-header">
                        <span class="mp-item-id">${escapeHtml(name)}</span>
                        <div class="mp-item-actions">
                            ${downloadBtn}
                            ${actionButton({
                                action: 'unmap',
                                rowId: item.id,
                                data: { mappingId: item._mappingId }
                            })}
                        </div>
                    </div>
                    <div class="mp-item-fields">
                        <div class="grid">
                            ${renderMpCategoryDataFields(data)}
                        </div>
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
                <span class="body-s">Прив'язані категорії маркетплейсів</span>
            </div>
            <div class="group">
                <button class="btn-outline btn-map-mp">
                    <span class="material-symbols-outlined">link</span>
                    <span>Замапити</span>
                </button>
            </div>
        </div>
        <div class="section-content">
            <div class="mp-items-list">
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
            <div class="group column col-6">
                <label>${escapeHtml(key)}</label>
                <input type="text" class="input-main" value="${escapeHtml(String(value))}" readonly>
            </div>
        `);
    });

    return fields.join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// МОДАЛ ПРИВ'ЯЗОК (BINDINGS MODAL)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Витягнути назву з об'єкта MP
 */
function extractMpName(obj) {
    if (!obj || typeof obj !== 'object') return '';
    // Стандартні name поля
    if (obj.name_ua) return obj.name_ua;
    if (obj.nameUa) return obj.nameUa;
    // Maudau: titleUk/titleRu
    if (obj.titleUk) return obj.titleUk;
    if (obj.titleRu) return obj.titleRu;
    if (obj.name) return obj.name;
    if (obj.name_ru) return obj.name_ru;
    if (obj.nameRu) return obj.nameRu;
    // Fallback: будь-який ключ з "name" або "title"
    const nameKey = Object.keys(obj).find(k => {
        const lower = k.toLowerCase();
        return lower.includes('name') || lower.includes('title');
    });
    return nameKey ? obj[nameKey] : '';
}

/**
 * Отримати назву MP категорії
 */
function getMpCategoryLabel(mpCat) {
    if (!mpCat) return '';
    try {
        const data = typeof mpCat.data === 'string' ? JSON.parse(mpCat.data || '{}') : (mpCat.data || {});
        return extractMpName(data) || extractMpName(mpCat) || mpCat.external_id || mpCat.id;
    } catch {
        return extractMpName(mpCat) || mpCat.external_id || mpCat.id;
    }
}

/**
 * Показати модал прив'язок для власної категорії
 * @param {string} ownCatId - ID власної категорії
 * @param {string} ownCatName - Назва категорії для заголовка
 */
export async function showBindingsModal(ownCatId, ownCatName) {
    const MODAL_ID = 'mapper-bindings';

    await showModal(MODAL_ID);

    const modalEl = document.getElementById(`modal-${MODAL_ID}`);
    if (!modalEl) return;

    // Заголовок
    const titleEl = modalEl.querySelector('#bindings-modal-title');
    if (titleEl) titleEl.textContent = `Прив'язки: ${ownCatName || ownCatId}`;

    const rowsContainer = modalEl.querySelector('#bindings-modal-rows');
    if (!rowsContainer) return;

    // Закриття модалу
    modalEl.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = () => {
            closeModal(MODAL_ID);
            renderCurrentTab();
        };
    });

    renderBindingsRows(ownCatId, rowsContainer);
}

/**
 * Рендерити рядки прив'язок
 */
function renderBindingsRows(ownCatId, container) {
    const marketplaces = getMarketplaces().filter(m =>
        m.is_active === true || String(m.is_active).toLowerCase() === 'true'
    );
    const allMpCategories = getMpCategories();
    const mappedCats = getMappedMpCategories(ownCatId);

    let html = '';

    // Існуючі прив'язки
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

    // Порожній рядок для додавання
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
                    <option value="">Категорія МП</option>
                </select>
            </div>
            <div class="binding-placeholder"></div>
        </div>
    `;

    container.innerHTML = html;
    initCustomSelects(container);

    // Обробник вибору маркетплейсу
    const mpSelect = container.querySelector('.binding-row-new .binding-mp-select');
    const catSelect = container.querySelector('.binding-row-new .binding-cat-select');

    if (mpSelect) {
        mpSelect.onchange = () => {
            const mpId = mpSelect.value;
            if (!mpId) {
                catSelect.innerHTML = '<option value="">Категорія МП</option>';
                catSelect.disabled = true;
                reinitializeCustomSelect(catSelect);
                return;
            }

            const mpCats = allMpCategories.filter(c => c.marketplace_id === mpId);
            catSelect.disabled = false;
            catSelect.innerHTML = '<option value="">Категорія МП</option>';
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

    // Обробник вибору категорії → авто-збереження
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

    // Обробники видалення
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
                        label: 'Відмінити',
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
