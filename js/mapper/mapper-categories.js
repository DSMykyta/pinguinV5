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
    createCategoryMapping, batchCreateCategoryMapping, getMappedMpCategories, deleteCategoryMapping
} from './mapper-data.js';
import { renderCurrentTab } from './mapper-table.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { showConfirmModal } from '../common/ui-modal-confirm.js';
import { initCustomSelects, reinitializeCustomSelect } from '../common/ui-select.js';
import { getBatchBar } from '../common/ui-batch-actions.js';
import { escapeHtml } from '../utils/text-utils.js';
import { renderAvatarState } from '../common/avatar/avatar-ui-states.js';
import {
    initSectionNavigation,
    buildCategoryTree,
    renderTreeOptions,
    createModalOverlay,
    closeModalOverlay,
    setupModalCloseHandlers,
    buildMpViewModal,
    showMapToMpModal
} from './mapper-utils.js';
import { renderTable as renderTableLego, col } from '../common/table/table-main.js';
import { initPagination } from '../common/ui-pagination.js';
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
        confirmClass: 'btn-delete'
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
    const isGrouping = groupingYes?.checked ? 'TRUE' : 'FALSE';

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
    const container = document.getElementById('category-related-chars');
    const statsEl = document.getElementById('category-chars-stats');
    const searchInput = document.getElementById('category-chars-search');
    const paginationEl = document.getElementById('category-chars-pagination');
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
    let currentPage = 1;
    let pageSize = 25;

    // Функція оновлення статистики
    const updateStats = (shown, total) => {
        if (statsEl) statsEl.textContent = `Показано ${shown} з ${total}`;
    };

    // Конфігурація колонок
    const columns = [
        col('id', 'ID', 'word-chip'),
        col('name_ua', 'Назва', 'text', { className: 'cell-l' }),
        {
            id: '_unlink',
            label: ' ',
            sortable: false,
            className: 'cell-s',
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

    // Створюємо Table LEGO API один раз
    const modalTableAPI = renderTableLego(container, {
        data: [],
        columns,
        rowActions: (row) => actionButton({
            action: 'edit',
            rowId: row.id
        }),
        emptyState: { message: 'Характеристики відсутні' },
        withContainer: false,
        onAfterRender: (cont) => initActionHandlers(cont, 'category-characteristics'),
        plugins: {
            sorting: {
                dataSource: () => filteredData,
                onSort: (sortedData) => {
                    filteredData = sortedData;
                    currentPage = 1;
                    renderPage();
                },
                columnTypes: {
                    id: 'id-text',
                    name_ua: 'string'
                }
            }
        }
    });

    // Функція рендерингу сторінки з пагінацією
    const renderPage = () => {
        const start = (currentPage - 1) * pageSize;
        const paginatedData = pageSize > 100000 ? filteredData : filteredData.slice(start, start + pageSize);
        modalTableAPI.render(paginatedData);
        updateStats(filteredData.length, allData.length);
        if (paginationAPI) paginationAPI.update({ totalItems: filteredData.length, currentPage, pageSize });
    };

    // Ініціалізація пагінації
    const paginationAPI = paginationEl ? initPagination(paginationEl, {
        currentPage, pageSize,
        totalItems: filteredData.length,
        onPageChange: (page, size) => { currentPage = page; pageSize = size; renderPage(); }
    }) : null;

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

                await updateCharacteristic(charId, {
                    category_ids: newIds.join(',')
                });

                showToast('Характеристику відв\'язано', 'success');

                allData = loadData();
                filteredData = [...allData];
                currentPage = 1;
                renderPage();
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
        currentPage = 1;
        renderPage();
    };

    // Підключаємо пошук
    if (searchInput) {
        searchInput.value = '';
        searchInput.addEventListener('input', (e) => filterData(e.target.value));
    }

    // Кнопка refresh
    const refreshBtn = document.getElementById('refresh-category-chars');
    if (refreshBtn) {
        refreshBtn.onclick = () => {
            allData = loadData();
            filteredData = [...allData];
            if (searchInput) searchInput.value = '';
            currentPage = 1;
            renderPage();
        };
    }

    // Кнопка "Додати" - прив'язати характеристику до категорії
    const addBtn = document.getElementById('btn-add-category-char');
    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            await showAddCharacteristicToCategoryModal(categoryId, () => {
                allData = loadData();
                filteredData = [...allData];
                currentPage = 1;
                renderPage();
            });
        });
    }

    // Перший рендер
    renderPage();
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
                    message: 'Ви впевнені, що хочете видалити цю прив\'язку?'
                });
                if (!confirmed) return;
                await deleteCategoryMapping(data.mappingId);
                showToast('Маппінг видалено', 'success');
                renderMappedMpCategoriesSections(ownCatId);
                renderCurrentTab();
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
            return `
                <div class="mp-item-card" data-mp-id="${escapeHtml(item.id)}">
                    <div class="mp-item-header">
                        <span class="mp-item-id">${escapeHtml(name)}</span>
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
    }).join('');

    return `
        <div class="section-header u-align-end">
            <div class="section-name-block">
                <div class="section-name">
                    <h2>Маркетплейси</h2>
                    <span class="word-chip">${totalCount}</span>
                </div>
                <span class="small">Прив'язані категорії маркетплейсів</span>
            </div>
            <div class="tab-controls">
                <button class="btn-outline btn-map-mp">
                    <span class="material-symbols-outlined">link</span>
                    <span>Замапити</span>
                </button>
            </div>
        </div>
        <div class="section-content">
            <div class="mp-items-list">
                ${cardsHtml || renderAvatarState('empty', { message: "Немає прив'язок", size: 'medium', containerClass: 'empty-state-container', avatarClass: 'empty-state-avatar', messageClass: 'avatar-state-message', showMessage: true })}
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
            <div class="form-group">
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
                await deleteCategoryMapping(mappingId);
                showToast('Прив\'язку видалено', 'success');
                renderBindingsRows(ownCatId, container);
            } catch (err) {
                showToast('Помилка видалення', 'error');
                btn.disabled = false;
            }
        };
    });
}
