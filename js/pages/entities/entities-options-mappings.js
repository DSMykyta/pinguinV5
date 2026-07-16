// js/pages/entities/entities-options-mappings.js

/**
 * Marketplace mapping UI and batch actions for options.
 */

import { runHook } from './entities-plugins.js';
import { getOptions } from '../../data/entities-data.js';
import { getMpOptions } from '../../data/mp-data.js';
import { getMarketplaces } from '../../data/marketplaces-data.js';
import {
    getMappedMpOptions,
    createOptionMapping,
    batchCreateOptionMapping,
    deleteOptionMapping,
    autoMapOptions,
    getMapOptions
} from '../../data/mappings-data.js';
import { showConfirmModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { getBatchBar } from '../../components/actions/actions-batch.js';
import { escapeHtml } from '../../utils/utils-text.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';
import {
    initSectionNavigation,
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

export function initOptionsMappings(state) {
    _state = state;
}

// ═══════════════════════════════════════════════════════════════════════════
// MP СЕКЦІЇ
// ═══════════════════════════════════════════════════════════════════════════

export function renderMappedMpOptionsSections(ownOptionId) {
    const nav = document.getElementById('option-section-navigator');
    const content = nav?.closest('.modal-container')?.querySelector('.modal-body > main');
    if (!nav || !content) return;

    nav.querySelectorAll('.btn-icon.expand.touch.mp-nav-item').forEach(el => el.remove());
    content.querySelectorAll('section.mp-section').forEach(el => el.remove());

    const mappedMpOpts = getMappedMpOptions(ownOptionId);
    const marketplaces = getMarketplaces();

    const byMarketplace = {};
    mappedMpOpts.forEach(mpOpt => {
        const mpId = mpOpt.marketplace_id;
        if (!byMarketplace[mpId]) {
            const marketplace = marketplaces.find(m => m.id === mpId);
            byMarketplace[mpId] = {
                name: marketplace?.name || mpId,
                items: []
            };
        }
        byMarketplace[mpId].items.push(mpOpt);
    });

    const navMain = nav.querySelector('.nav-main');
    const navTarget = navMain || nav;
    const navItem = document.createElement('a');
    navItem.href = '#section-mp-options';
    navItem.className = 'btn-icon expand mp-nav-item';
    navItem.setAttribute('aria-label', 'Маркетплейси');
    navItem.innerHTML = `
        <span class="material-symbols-outlined">hexagon</span>
        <span class="btn-icon-label">Маркетплейси</span>
        ${mappedMpOpts.length ? `<span>${mappedMpOpts.length}</span>` : ''}
    `;
    navTarget.appendChild(navItem);

    const section = document.createElement('section');
    section.id = 'section-mp-options';
    section.className = 'mp-section';
    section.innerHTML = renderMpOptionsSectionContent(byMarketplace, mappedMpOpts.length);
    content.appendChild(section);

    const mapBtn = section.querySelector('.btn-map-mp');
    if (mapBtn) {
        mapBtn.addEventListener('click', () => {
            showMapToMpModal({
                marketplaces,
                getMpEntities: (mpId) => getMpOptions().filter(o => o.marketplace_id === mpId),
                getEntityLabel: (entity) => {
                    const data = typeof entity.data === 'string' ? JSON.parse(entity.data || '{}') : (entity.data || {});
                    return `#${entity.external_id} — ${data.name || entity.external_id}`;
                },
                onMap: async (mpOptionId) => {
                    await createOptionMapping(ownOptionId, mpOptionId);
                    showToast('Маппінг створено', 'success');
                    renderMappedMpOptionsSections(ownOptionId);
                    initSectionNavigation('option-section-navigator');
                    runHook('onDataChanged');
                }
            });
        });
    }

    initSectionNavigation('option-section-navigator');

    registerActionHandlers('mp-option-mapping', {
        unmap: async (rowId, data) => {
            const mappingId = data.mappingId;
            if (mappingId) {
                const confirmed = await showConfirmModal({
                    title: 'Від\'язати?',
                    message: 'Зняти прив\'язку з маркетплейсу?',
                });
                if (!confirmed) return;
                try {
                    const mapping = getMapOptions().find(m => m.id === mappingId);
                    const undoData = mapping ? { ownId: mapping.option_id, mpId: mapping.mp_option_id } : null;
                    await deleteOptionMapping(mappingId);
                    renderMappedMpOptionsSections(ownOptionId);
                    runHook('onDataChanged');
                    showToast('Прив\'язку знято', 'success', undoData ? {
                        duration: 6000,
                        action: {
                            label: 'Відмінити',
                            onClick: async () => {
                                await createOptionMapping(undoData.ownId, undoData.mpId);
                                renderMappedMpOptionsSections(ownOptionId);
                                runHook('onDataChanged');
                            }
                        }
                    } : 3000);
                } catch (error) {
                    showToast('Помилка видалення маппінгу', 'error');
                }
            }
        }
    });

    // Cleanup попередній listener перед повторною ініціалізацією
    if (content._cleanupMpMapping) content._cleanupMpMapping();
    content._cleanupMpMapping = initActionHandlers(content, 'mp-option-mapping');
}

function renderMpOptionsSectionContent(byMarketplace, totalCount) {
    const cardsHtml = Object.entries(byMarketplace).map(([mpId, { name, items }]) => {
        return items.map(item => {
            const data = typeof item.data === 'string' ? JSON.parse(item.data) : (item.data || {});
            return `
                <div class="block" data-mp-id="${escapeHtml(item.id)}">
                    <div class="block-header">
                        <h3>${escapeHtml(name)}</h3>
                        ${actionButton({ action: 'unmap', rowId: item.id, data: { mappingId: item._mappingId } })}
                    </div>
                    <div class="block-list">
                        ${renderMpDataFields(data)}
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
                <span class="smal">Прив'язані опції маркетплейсів</span>
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

function renderMpDataFields(data) {
    const skipFields = ['our_option_id', 'our_char_id', 'our_cat_id'];
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
// МАППІНГ
// ═══════════════════════════════════════════════════════════════════════════

export async function showSelectOwnOptionModal(selectedIds) {

    const mpOpts = getMpOptions();
    const ownOpts = getOptions();

    const selectedOwnIds = selectedIds.filter(id => ownOpts.some(o => o.id === id));
    const selectedMpIds = selectedIds.filter(id => mpOpts.some(o => o.id === id));

    if (selectedMpIds.length === 0) {
        showToast('Оберіть хоча б одну опцію маркетплейсу', 'warning');
        return;
    }

    let targetOwnOptId = null;
    let needSelectTarget = true;

    if (selectedOwnIds.length === 1) {
        targetOwnOptId = selectedOwnIds[0];
        needSelectTarget = false;
    } else if (selectedOwnIds.length > 1) {
        showToast('Оберіть тільки одну власну опцію як ціль', 'warning');
        return;
    }

    if (!needSelectTarget) {
        try {
            const result = await batchCreateOptionMapping(selectedMpIds, targetOwnOptId);

            if (_state.selectedRows.options) {
                _state.selectedRows.options.clear();
            }
            const batchBar = getBatchBar('entities-options');
            if (batchBar) batchBar.deselectAll();

            await runHook('onDataChanged');

            const targetOpt = ownOpts.find(o => o.id === targetOwnOptId);
            showToast(`Замаплено ${result.success.length} опцій до "${targetOpt?.value_ua || targetOwnOptId}"`, 'success');
        } catch (error) {
            console.error('❌ Помилка batch маппінгу:', error);
            showToast('Помилка при маппінгу', 'error');
        }
        return;
    }

    const modalHtml = `
        <div class="modal-overlay open">
            <div class="modal-container">
                <div class="modal-header">
                    <h2 class="modal-title">Замапити до власної опції</h2>
                    <div class="group">
                        <button class="btn-icon modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <p class="u-mb-16">Обрано <strong>${selectedMpIds.length}</strong> опцій маркетплейсу.</p>
                    <p class="u-mb-16">Оберіть власну опцію для прив'язки:</p>
                    <div class="group column">
                        <label for="select-own-option">Власна опція</label>
                        <select id="select-own-option" class="input-main">
                            <option value="">— Оберіть опцію —</option>
                            ${ownOpts.map(o => `<option value="${escapeHtml(o.id)}">${escapeHtml(o.value_ua || o.id)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary modal-close-btn">Скасувати</button>
                    <button id="btn-apply-option-mapping" class="btn-primary">
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

    const applyBtn = document.getElementById('btn-apply-option-mapping');
    const selectEl = document.getElementById('select-own-option');

    applyBtn.addEventListener('click', async () => {
        const ownOptionId = selectEl.value;
        if (!ownOptionId) {
            showToast('Оберіть опцію', 'warning');
            return;
        }

        applyBtn.disabled = true;
        applyBtn.innerHTML = '<span class="material-symbols-outlined spinning">sync</span><span>Обробка...</span>';

        try {
            const result = await batchCreateOptionMapping(selectedMpIds, ownOptionId);

            closeThisModal();

            if (_state.selectedRows.options) {
                _state.selectedRows.options.clear();
            }
            const batchBar = getBatchBar('entities-options');
            if (batchBar) batchBar.deselectAll();

            await runHook('onDataChanged');

            showToast(`Замаплено ${result.success.length} опцій`, 'success');
        } catch (error) {
            console.error('❌ Помилка batch маппінгу:', error);
            showToast('Помилка при маппінгу', 'error');
            applyBtn.disabled = false;
            applyBtn.innerHTML = '<span class="material-symbols-outlined">link</span><span>Замапити</span>';
        }
    });
}

export async function handleAutoMapOptions(selectedIds) {

    try {
        const result = await autoMapOptions(selectedIds);

        if (_state.selectedRows.options) {
            _state.selectedRows.options.clear();
        }
        const batchBar = getBatchBar('entities-options');
        if (batchBar) batchBar.deselectAll();

        await runHook('onDataChanged');

        showToast(`Автоматично замаплено ${result.mapped.length} опцій`, 'success');
    } catch (error) {
        console.error('❌ Помилка автоматичного маппінгу:', error);
        showToast('Помилка автоматичного маппінгу', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПЕРЕГЛЯД MP
// ═══════════════════════════════════════════════════════════════════════════

export async function showViewMpOptionModal(mpOptionIdOrData) {

    let mpOption;

    if (typeof mpOptionIdOrData === 'object' && mpOptionIdOrData !== null) {
        mpOption = mpOptionIdOrData;
    } else {
        const mpOpts = getMpOptions();
        mpOption = mpOpts.find(o => o.id === mpOptionIdOrData);
        if (!mpOption) mpOption = mpOpts.find(o => o.external_id === mpOptionIdOrData);
    }

    if (!mpOption) {
        showToast('MP опцію не знайдено', 'error');
        return;
    }

    let jsonData = {};
    if (mpOption.data && typeof mpOption.data === 'string') {
        try { jsonData = JSON.parse(mpOption.data); } catch (e) {}
    }

    const marketplaces = getMarketplaces();
    const marketplace = marketplaces.find(m => m.id === mpOption.marketplace_id);
    const mpName = marketplace ? marketplace.name : mpOption.marketplace_id;

    // Перевіряємо маппінг
    const mapOpts = getMapOptions();
    const mapping = mapOpts.find(m =>
        m.mp_option_id === mpOption.id || m.mp_option_id === mpOption.external_id
    );
    let mappedToName = '';
    if (mapping) {
        const ownOpt = getOptions().find(o => o.id === mapping.option_id);
        mappedToName = ownOpt ? (ownOpt.value_ua || ownOpt.id) : mapping.option_id;
    }

    const modalHtml = buildMpViewModal({
        title: 'Опція маркетплейсу',
        mpName,
        externalId: mpOption.external_id,
        jsonData,
        mappedToName
    });

    const modalOverlay = createModalOverlay(modalHtml);
    setupModalCloseHandlers(modalOverlay, () => closeModalOverlay(modalOverlay));
}
