// js/pages/entities/entities-categories-mappings.js

/**
 * Marketplace mapping UI and batch actions for categories.
 */

import { runHook } from './entities-plugins.js';
import { getCategories } from '../../data/entities-data.js';
import { getMpCategories } from '../../data/mp-data.js';
import { getMarketplaces } from '../../data/marketplaces-data.js';
import {
    createCategoryMapping,
    batchCreateCategoryMapping,
    getMappedMpCategories,
    deleteCategoryMapping,
    getMapCategories
} from '../../data/mappings-data.js';
import { showConfirmModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
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
    showMapToMpModal
} from './entities-utils.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';

let _state = null;

export function initCategoriesMappings(state) {
    _state = state;
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

export function renderMappedMpCategoriesSections(ownCatId) {
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
