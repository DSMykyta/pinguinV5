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
    getCharacteristics, updateCharacteristic, getMpCategories, getMarketplaces,
    batchCreateCategoryMapping, getMappedMpCategories, deleteCategoryMapping
} from './mapper-data.js';
import { renderCurrentTab } from './mapper-table.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { showConfirmModal } from '../common/ui-modal-confirm.js';
import { initCustomSelects, reinitializeCustomSelect } from '../common/ui-select.js';
import { getBatchBar } from '../common/ui-batch-actions.js';
import { escapeHtml } from '../utils/text-utils.js';
import {
    initSectionNavigation,
    buildCategoryTree,
    renderTreeOptions,
    createModalOverlay,
    closeModalOverlay,
    setupModalCloseHandlers
} from './mapper-utils.js';
import { renderPseudoTable } from '../common/ui-table.js';
import { initTableSorting } from '../common/ui-table-controls.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../common/ui-actions.js';

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

    const confirmed = await showConfirmModal({
        title: 'Видалити категорію?',
        message: `Ви впевнені, що хочете видалити категорію "${category.name_ua}"?`,
        confirmText: 'Видалити',
        cancelText: 'Скасувати',
        confirmClass: 'btn-danger'
    });

    if (confirmed) {
        try {
            await deleteCategory(id);
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
    const isGrouping = groupingYes?.checked ? 'true' : 'false';

    return {
        name_ua: document.getElementById('mapper-category-name-ua')?.value.trim() || '',
        name_ru: document.getElementById('mapper-category-name-ru')?.value.trim() || '',
        parent_id: document.getElementById('mapper-category-parent')?.value || '',
        grouping: isGrouping
    };
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

    // Set grouping radio
    const isGrouping = category.grouping === 'TRUE' || category.grouping === true || category.grouping === 'true';
    if (groupingYes) groupingYes.checked = isGrouping;
    if (groupingNo) groupingNo.checked = !isGrouping;
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

    // Reset grouping to default (No)
    if (groupingYes) groupingYes.checked = false;
    if (groupingNo) groupingNo.checked = true;
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
        <div class="modal-overlay is-open">
            <div class="modal-container modal-small">
                <div class="modal-header">
                    <h2 class="modal-title">Додати характеристику</h2>
                    <div class="modal-header-actions">
                        <button class="segment modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="select-char-to-add">Оберіть характеристику</label>
                        <select id="select-char-to-add" data-custom-select placeholder="Оберіть характеристику">
                            <option value="">-- Оберіть --</option>
                            ${availableChars.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name_ua || c.id)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline modal-cancel-btn">Скасувати</button>
                    <button class="btn btn-primary modal-confirm-btn">Додати</button>
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
    const container = document.getElementById('category-related-chars');
    const statsEl = document.getElementById('category-chars-stats');
    const searchInput = document.getElementById('category-chars-search');
    if (!container) return;

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

    let allData = loadData();
    let filteredData = [...allData];

    // Функція оновлення статистики
    const updateStats = (count) => {
        if (statsEl) statsEl.textContent = `Прив'язано ${count}`;
    };

    // Конфігурація колонок
    const columns = [
        {
            id: 'id',
            label: 'ID',
            sortable: true,
            className: 'cell-id',
            render: (value) => `<span class="word-chip">${escapeHtml(value || ' ')}</span>`
        },
        {
            id: 'name_ua',
            label: 'Назва',
            sortable: true,
            className: 'cell-name',
            render: (value, row) => escapeHtml(value || row.id || ' ')
        },
        {
            id: '_unlink',
            label: '',
            sortable: false,
            className: 'cell-actions-end',
            render: (value, row) => actionButton({
                action: 'unlink',
                rowId: row.id,
                data: { name: row.name_ua || row.id }
            })
        }
    ];

    // Реєструємо обробники дій для цього контексту
    registerActionHandlers('category-characteristics', {
        edit: async (rowId) => {
            const { showEditCharacteristicModal } = await import('./mapper-characteristics.js');
            await showEditCharacteristicModal(rowId);
        },
        unlink: async (rowId, data) => {
            await handleUnlinkCharacteristic(rowId, data.name, categoryId);
        }
    });

    // Функція рендерингу таблиці
    const renderTable = (data) => {
        renderPseudoTable(container, {
            data,
            columns,
            rowActionsCustom: (row) => actionButton({
                action: 'edit',
                rowId: row.id
            }),
            emptyState: { message: 'Характеристики відсутні' },
            withContainer: false
        });

        // Оновлюємо статистику
        updateStats(allData.length);

        // Ініціалізуємо обробники дій (делегування)
        initActionHandlers(container, 'category-characteristics');
    };

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
                // Отримуємо поточну характеристику
                const characteristics = getCharacteristics();
                const char = characteristics.find(c => c.id === charId);
                if (!char) return;

                // Видаляємо categoryId зі списку
                const currentIds = char.category_ids
                    ? String(char.category_ids).split(',').map(id => id.trim()).filter(id => id)
                    : [];
                const newIds = currentIds.filter(id => id !== catId);

                // Оновлюємо характеристику (тільки поле category_ids)
                await updateCharacteristic(charId, {
                    category_ids: newIds.join(',')
                });

                showToast('Характеристику відв\'язано', 'success');

                // Перезавантажуємо дані
                allData = loadData();
                filteredData = [...allData];
                renderTable(filteredData);
            } catch (error) {
                console.error('❌ Помилка відв\'язування:', error);
                showToast('Помилка відв\'язування характеристики', 'error');
            }
        }
    };

    // Функція пошуку
    const filterData = (query) => {
        const q = query.toLowerCase().trim();
        if (!q) {
            filteredData = [...allData];
        } else {
            filteredData = allData.filter(row =>
                (row.id && row.id.toLowerCase().includes(q)) ||
                (row.name_ua && row.name_ua.toLowerCase().includes(q))
            );
        }
        renderTable(filteredData);
    };

    // Підключаємо пошук
    if (searchInput) {
        searchInput.value = '';
        searchInput.addEventListener('input', (e) => filterData(e.target.value));
    }

    // Кнопка "Додати" - прив'язати характеристику до категорії
    const addBtn = document.getElementById('btn-add-category-char');
    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            await showAddCharacteristicToCategoryModal(categoryId, () => {
                // Колбек після прив'язки - оновлюємо дані
                allData = loadData();
                filteredData = [...allData];
                renderTable(filteredData);
            });
        });
    }

    // Перший рендер
    renderTable(filteredData);

    // Ініціалізація сортування
    initTableSorting(container, {
        dataSource: () => filteredData,
        onSort: (sortedData) => {
            filteredData = sortedData;
            renderTable(filteredData);
        },
        columnTypes: {
            id: 'id-text',
            name_ua: 'string'
        }
    });
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
            confirmBtn.innerHTML = '<span class="material-symbols-outlined is-spinning">progress_activity</span><span>Маппінг...</span>';

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

        if (!mpCat) {
            mpCat = mpCats.find(c => c.external_id === mpCatIdOrData);
        }

        if (!mpCat) {
            mpCat = mpCats.find(c => mpCatIdOrData.startsWith(c.id));
        }
    }

    if (!mpCat) {
        showToast('MP категорію не знайдено', 'error');
        return;
    }

    let catData = mpCat;
    if (mpCat.data && typeof mpCat.data === 'string') {
        try {
            catData = { ...mpCat, ...JSON.parse(mpCat.data) };
        } catch (e) {}
    }

    const marketplaces = getMarketplaces();
    const marketplace = marketplaces.find(m => m.id === mpCat.marketplace_id);
    const mpName = marketplace ? marketplace.name : mpCat.marketplace_id;

    let mappedToName = '';
    if (catData.our_category_id) {
        const ownCats = getCategories();
        const ownCat = ownCats.find(c => c.id === catData.our_category_id);
        mappedToName = ownCat ? (ownCat.name_ua || ownCat.id) : catData.our_category_id;
    }

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
                                ? `<input type="text" class="input-main" value="${escapeHtml(mappedToName)}" readonly>`
                                : `<p class="u-text-tertiary">Не замаплено</p>`
                            }
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-close-btn">Закрити</button>
                </div>
            </div>
        </div>
    `;

    const modalOverlay = createModalOverlay(modalHtml);
    setupModalCloseHandlers(modalOverlay, () => closeModalOverlay(modalOverlay));
}

// ═══════════════════════════════════════════════════════════════════════════
// MP СЕКЦІЇ
// ═══════════════════════════════════════════════════════════════════════════

function renderMappedMpCategoriesSections(ownCatId) {
    const nav = document.getElementById('category-section-navigator');
    const content = document.querySelector('.modal-fullscreen-content');
    if (!nav || !content) return;

    nav.querySelectorAll('.sidebar-nav-item.mp-nav-item').forEach(el => el.remove());
    content.querySelectorAll('section.mp-section').forEach(el => el.remove());

    const mappedMpCats = getMappedMpCategories(ownCatId);
    if (mappedMpCats.length === 0) return;

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

    const navMain = nav.querySelector('.sidebar-nav-main');
    const navTarget = navMain || nav;

    Object.entries(byMarketplace).forEach(([mpId, data]) => {
        const navItem = document.createElement('a');
        navItem.href = `#section-mp-cat-${mpId}`;
        navItem.className = 'sidebar-nav-item mp-nav-item';
        navItem.setAttribute('aria-label', data.name);
        navItem.innerHTML = `
            <span class="material-symbols-outlined">storefront</span>
            <span class="sidebar-nav-label">${escapeHtml(data.name)} (${data.items.length})</span>
        `;
        navTarget.appendChild(navItem);

        const section = document.createElement('section');
        section.id = `section-mp-cat-${mpId}`;
        section.className = 'mp-section';
        section.innerHTML = renderMpCategorySectionContent(data);
        content.appendChild(section);
    });

    // Перезапускаємо навігацію щоб включити нові секції
    initSectionNavigation('category-section-navigator');

    // Реєструємо обробники для маппінгів категорій
    registerActionHandlers('mp-category-mapping', {
        unmap: async (rowId, data) => {
            if (data.mappingId) {
                await deleteCategoryMapping(data.mappingId);
                showToast('Маппінг видалено', 'success');
                renderMappedMpCategoriesSections(ownCatId);
                renderCurrentTab();
            }
        }
    });

    // Ініціалізуємо обробники дій
    initActionHandlers(content, 'mp-category-mapping');
}

function renderMpCategorySectionContent(marketplaceData) {
    const { name, items } = marketplaceData;

    const itemsHtml = items.map(item => {
        const data = typeof item.data === 'string' ? JSON.parse(item.data) : (item.data || {});
        return `
            <div class="mp-item-card" data-mp-id="${escapeHtml(item.id)}">
                <div class="mp-item-header">
                    <span class="mp-item-id">#${escapeHtml(item.external_id || item.id)}</span>
                    ${actionButton({
                        action: 'unmap',
                        rowId: item.id,
                        data: { mappingId: item._mappingId }
                    })}
                </div>
                <div class="mp-item-fields">
                    <div class="form-grid form-grid-2">
                        ${renderMpCategoryDataFields(data)}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="section-header">
            <div class="section-name-block">
                <div class="section-name">
                    <h2>${escapeHtml(name)}</h2>
                    <span class="word-chip">${items.length}</span>
                </div>
                <h3>Прив'язані категорії маркетплейсу</h3>
            </div>
        </div>
        <div class="section-content">
            <div class="mp-items-list">
                ${itemsHtml}
            </div>
        </div>
    `;
}

function renderMpCategoryDataFields(data) {
    const fields = [];

    if (data.name) {
        fields.push(`
            <div class="form-group">
                <label>Назва</label>
                <input type="text" value="${escapeHtml(data.name)}" readonly>
            </div>
        `);
    }

    if (data.parent_name) {
        fields.push(`
            <div class="form-group">
                <label>Батьківська</label>
                <input type="text" value="${escapeHtml(data.parent_name)}" readonly>
            </div>
        `);
    }

    const skipFields = ['name', 'parent_name', 'parent_id', 'our_category_id', 'our_cat_id', 'id'];
    Object.entries(data).forEach(([key, value]) => {
        if (!skipFields.includes(key) && value !== null && value !== undefined && value !== '') {
            fields.push(`
                <div class="form-group">
                    <label>${escapeHtml(key)}</label>
                    <input type="text" value="${escapeHtml(String(value))}" readonly>
                </div>
            `);
        }
    });

    return fields.join('');
}
