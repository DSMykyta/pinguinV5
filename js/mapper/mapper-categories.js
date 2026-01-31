// js/mapper/mapper-categories.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - CATEGORIES PLUGIN                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Категорії: CRUD операції + модалки                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { mapperState, registerHook, markPluginLoaded } from './mapper-state.js';
import {
    addCategory, updateCategory, deleteCategory, getCategories,
    getCharacteristics, getMpCategories, getMarketplaces,
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

export const PLUGIN_NAME = 'mapper-categories';

/**
 * Ініціалізація плагіна
 */
export function init() {
    console.log(`🔌 [${PLUGIN_NAME}] Ініціалізація...`);
    markPluginLoaded(PLUGIN_NAME);
}

// ═══════════════════════════════════════════════════════════════════════════
// CRUD МОДАЛКИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модальне вікно для додавання категорії
 */
export async function showAddCategoryModal() {
    console.log('➕ Відкриття модального вікна для додавання категорії');

    await showModal('mapper-category-edit', null);

    const modalEl = document.querySelector('[data-modal-id="mapper-category-edit"]');

    const title = document.getElementById('modal-title');
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
    console.log(`✏️ Відкриття модального вікна для редагування категорії ${id}`);

    const categories = getCategories();
    const category = categories.find(c => c.id === id);

    if (!category) {
        showToast('Категорію не знайдено', 'error');
        return;
    }

    await showModal('mapper-category-edit', null);

    const modalEl = document.querySelector('[data-modal-id="mapper-category-edit"]');

    const title = document.getElementById('modal-title');
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
    return {
        name_ua: document.getElementById('mapper-category-name-ua')?.value.trim() || '',
        name_ru: document.getElementById('mapper-category-name-ru')?.value.trim() || '',
        parent_id: document.getElementById('mapper-category-parent')?.value || ''
    };
}

function fillCategoryForm(category) {
    const nameUaField = document.getElementById('mapper-category-name-ua');
    const nameRuField = document.getElementById('mapper-category-name-ru');
    const parentField = document.getElementById('mapper-category-parent');

    if (nameUaField) nameUaField.value = category.name_ua || '';
    if (nameRuField) nameRuField.value = category.name_ru || '';
    if (parentField) parentField.value = category.parent_id || '';
}

function clearCategoryForm() {
    const nameUaField = document.getElementById('mapper-category-name-ua');
    const nameRuField = document.getElementById('mapper-category-name-ru');
    const parentField = document.getElementById('mapper-category-parent');

    if (nameUaField) nameUaField.value = '';
    if (nameRuField) nameRuField.value = '';
    if (parentField) parentField.value = '';
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

function populateRelatedCharacteristics(categoryId) {
    const container = document.getElementById('category-related-chars');
    const countEl = document.getElementById('category-chars-count');
    if (!container) return;

    const characteristics = getCharacteristics();
    const relatedChars = characteristics.filter(char => {
        if (!char.category_ids) return false;
        const ids = Array.isArray(char.category_ids)
            ? char.category_ids
            : String(char.category_ids).split(',').map(id => id.trim());
        return ids.includes(categoryId);
    });

    if (relatedChars.length === 0) {
        container.innerHTML = `
            <div class="empty-state-container">
                <div class="empty-state-message">Характеристики відсутні</div>
            </div>
        `;
        if (countEl) countEl.textContent = '';
        return;
    }

    if (countEl) countEl.textContent = relatedChars.length;

    container.innerHTML = relatedChars.map(char => `
        <div class="inputs-bloc td" data-id="${char.id}">
            <div class="inputs-line">
                <div class="left">
                    <span class="item-name">${escapeHtml(char.name_ua || char.id)}</span>
                </div>
                <div class="right">
                    <span class="item-id">${char.id}</span>
                </div>
            </div>
            <button class="btn-icon btn-edit-item" data-id="${char.id}" title="Редагувати">
                <span class="material-symbols-outlined">edit</span>
            </button>
        </div>
    `).join('');

    container.querySelectorAll('.btn-edit-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const charId = btn.dataset.id;
            // Не закриваємо батьківський модал - відкриваємо поверх
            const { showEditCharacteristicModal } = await import('./mapper-characteristics.js');
            await showEditCharacteristicModal(charId);
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// МАППІНГ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модалку вибору власної категорії для маппінгу MP категорій
 */
export async function showSelectOwnCategoryModal(selectedMpCatIds) {
    console.log(`🔗 Вибір власної категорії для ${selectedMpCatIds.length} MP категорій`);

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
            if (batchBar) batchBar.clearSelection();

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
    console.log(`👁️ Перегляд MP категорії`, mpCatIdOrData);

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

    content.querySelectorAll('.btn-unmap-cat').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const mappingId = btn.dataset.mappingId;
            if (mappingId) {
                try {
                    await deleteCategoryMapping(mappingId);
                    showToast('Маппінг видалено', 'success');
                    renderMappedMpCategoriesSections(ownCatId);
                    renderCurrentTab();
                } catch (error) {
                    showToast('Помилка видалення маппінгу', 'error');
                }
            }
        });
    });
}

function renderMpCategorySectionContent(marketplaceData) {
    const { name, items } = marketplaceData;

    const itemsHtml = items.map(item => {
        const data = typeof item.data === 'string' ? JSON.parse(item.data) : (item.data || {});
        return `
            <div class="mp-item-card" data-mp-id="${escapeHtml(item.id)}">
                <div class="mp-item-header">
                    <span class="mp-item-id">#${escapeHtml(item.external_id || item.id)}</span>
                    <button class="btn-icon btn-unmap btn-unmap-cat" data-mapping-id="${escapeHtml(item._mappingId)}" title="Відв'язати">
                        <span class="material-symbols-outlined">link_off</span>
                    </button>
                </div>
                <div class="mp-item-fields">
                    <div class="form-grid form-grid-2">
                        <div class="form-group">
                            <label>Назва</label>
                            <input type="text" class="input-main" value="${escapeHtml(data.name || '')}" readonly>
                        </div>
                        ${data.parent_name ? `
                        <div class="form-group">
                            <label>Батьківська</label>
                            <input type="text" class="input-main" value="${escapeHtml(data.parent_name)}" readonly>
                        </div>
                        ` : ''}
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
                    <span class="badge badge-neutral">${items.length}</span>
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
