// js/pages/entities/entities-characteristics-mappings.js

/**
 * Marketplace mapping UI and batch actions for characteristics.
 */

import { runHook } from './entities-plugins.js';
import { getCharacteristics } from '../../data/entities-data.js';
import { getMpCharacteristics } from '../../data/mp-data.js';
import { getMarketplaces } from '../../data/marketplaces-data.js';
import {
    getMappedMpCharacteristics,
    createCharacteristicMapping,
    batchCreateCharacteristicMapping,
    deleteCharacteristicMapping,
    autoMapCharacteristics,
    getMapCharacteristics
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

export function initCharacteristicsMappings(state) {
    _state = state;
}

// ═══════════════════════════════════════════════════════════════════════════
// MP СЕКЦІЇ
// ═══════════════════════════════════════════════════════════════════════════

export function renderMappedMpCharacteristicsSections(ownCharId) {
    const nav = document.getElementById('char-section-navigator');
    const content = nav?.closest('.modal-container')?.querySelector('.modal-body > main');
    if (!nav || !content) return;

    nav.querySelectorAll('.btn-icon.expand.touch.mp-nav-item').forEach(el => el.remove());
    content.querySelectorAll('section.mp-section').forEach(el => el.remove());

    const mappedMpChars = getMappedMpCharacteristics(ownCharId);
    const marketplaces = getMarketplaces();

    const byMarketplace = {};
    mappedMpChars.forEach(mpChar => {
        const mpId = mpChar.marketplace_id;
        if (!byMarketplace[mpId]) {
            const marketplace = marketplaces.find(m => m.id === mpId);
            byMarketplace[mpId] = {
                name: marketplace?.name || mpId,
                items: []
            };
        }
        byMarketplace[mpId].items.push(mpChar);
    });

    const navMain = nav.querySelector('.nav-main');
    const navTarget = navMain || nav;
    const navItem = document.createElement('a');
    navItem.href = '#section-mp-characteristics';
    navItem.className = 'btn-icon expand mp-nav-item';
    navItem.setAttribute('aria-label', 'Маркетплейси');
    navItem.innerHTML = `
        <span class="material-symbols-outlined">hexagon</span>
        <span class="btn-icon-label">Маркетплейси</span>
        ${mappedMpChars.length ? `<span>${mappedMpChars.length}</span>` : ''}
    `;
    navTarget.appendChild(navItem);

    const section = document.createElement('section');
    section.id = 'section-mp-characteristics';
    section.className = 'mp-section';
    section.innerHTML = renderMpCharacteristicsSectionContent(byMarketplace, mappedMpChars.length);
    content.appendChild(section);

    const mapBtn = section.querySelector('.btn-map-mp');
    if (mapBtn) {
        mapBtn.addEventListener('click', () => {
            showMapToMpModal({
                marketplaces,
                getMpEntities: (mpId) => getMpCharacteristics().filter(c => c.marketplace_id === mpId),
                getEntityLabel: (entity) => {
                    const data = typeof entity.data === 'string' ? JSON.parse(entity.data || '{}') : (entity.data || {});
                    return `#${entity.external_id} — ${data.name || entity.external_id}`;
                },
                onMap: async (mpCharId) => {
                    await createCharacteristicMapping(ownCharId, mpCharId);
                    showToast('Маппінг створено', 'success');
                    renderMappedMpCharacteristicsSections(ownCharId);
                    initSectionNavigation('char-section-navigator');
                    runHook('onDataChanged');
                }
            });
        });
    }

    initSectionNavigation('char-section-navigator');

    registerActionHandlers('mp-characteristic-mapping', {
        unmap: async (rowId, data) => {
            if (data.mappingId) {
                const confirmed = await showConfirmModal({
                    title: 'Від\'язати?',
                    message: 'Зняти прив\'язку з маркетплейсу?',
                });
                if (!confirmed) return;
                const mapping = getMapCharacteristics().find(m => m.id === data.mappingId);
                const undoData = mapping ? { ownId: mapping.characteristic_id, mpId: mapping.mp_characteristic_id } : null;
                await deleteCharacteristicMapping(data.mappingId);
                renderMappedMpCharacteristicsSections(ownCharId);
                runHook('onDataChanged');
                showToast('Прив\'язку знято', 'success', undoData ? {
                    duration: 6000,
                    action: {
                        label: 'Відмінити',
                        onClick: async () => {
                            await createCharacteristicMapping(undoData.ownId, undoData.mpId);
                            renderMappedMpCharacteristicsSections(ownCharId);
                            runHook('onDataChanged');
                        }
                    }
                } : 3000);
            }
        }
    });

    // Cleanup попередній listener перед повторною ініціалізацією
    if (content._cleanupMpMapping) content._cleanupMpMapping();
    content._cleanupMpMapping = initActionHandlers(content, 'mp-characteristic-mapping');
}

function renderMpCharacteristicsSectionContent(byMarketplace, totalCount) {
    const cardsHtml = Object.entries(byMarketplace).map(([mpId, { name, items }]) => {
        return items.map(item => {
            const data = typeof item.data === 'string' ? JSON.parse(item.data) : (item.data || {});
            return `
                <div class="block" data-mp-id="${escapeHtml(item.id)}">
                    <div class="block-header">
                        <h3>${escapeHtml(name)}</h3>
                        ${actionButton({
                            action: 'unmap',
                            rowId: item.id,
                            data: { mappingId: item._mappingId }
                        })}
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
                <span class="body-s">Прив'язані характеристики маркетплейсів</span>
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
    const skipFields = ['our_char_id', 'our_option_id', 'our_cat_id'];
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

export async function showSelectOwnCharacteristicModal(selectedIds) {

    const mpChars = getMpCharacteristics();
    const ownChars = getCharacteristics();

    const selectedOwnIds = selectedIds.filter(id => ownChars.some(c => c.id === id));
    const selectedMpIds = selectedIds.filter(id => mpChars.some(c => c.id === id));

    if (selectedMpIds.length === 0) {
        showToast('Оберіть хоча б одну характеристику маркетплейсу', 'warning');
        return;
    }

    let targetOwnCharId = null;
    let needSelectTarget = true;

    if (selectedOwnIds.length === 1) {
        targetOwnCharId = selectedOwnIds[0];
        needSelectTarget = false;
    } else if (selectedOwnIds.length > 1) {
        showToast('Оберіть тільки одну власну характеристику як ціль', 'warning');
        return;
    }

    if (!needSelectTarget) {
        try {
            const result = await batchCreateCharacteristicMapping(selectedMpIds, targetOwnCharId);

            if (_state.selectedRows.characteristics) {
                _state.selectedRows.characteristics.clear();
            }
            const batchBar = getBatchBar('entities-characteristics');
            if (batchBar) batchBar.deselectAll();

            await runHook('onDataChanged');

            const targetChar = ownChars.find(c => c.id === targetOwnCharId);
            showToast(`Замаплено ${result.success.length} характеристик до "${targetChar?.name_ua || targetOwnCharId}"`, 'success');
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
                    <h2 class="modal-title">Замапити до власної характеристики</h2>
                    <div class="group">
                        <button class="btn-icon modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <p class="u-mb-16">Обрано <strong>${selectedMpIds.length}</strong> характеристик маркетплейсу.</p>
                    <p class="u-mb-16">Оберіть власну характеристику для прив'язки:</p>
                    <div class="group column">
                        <label for="select-own-char">Власна характеристика</label>
                        <select id="select-own-char" class="input-main">
                            <option value="">— Оберіть характеристику —</option>
                            ${ownChars.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name_ua || c.id)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary modal-close-btn">Скасувати</button>
                    <button id="btn-apply-char-mapping" class="btn-primary">
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

    const applyBtn = document.getElementById('btn-apply-char-mapping');
    const selectEl = document.getElementById('select-own-char');

    applyBtn.addEventListener('click', async () => {
        const ownCharId = selectEl.value;
        if (!ownCharId) {
            showToast('Оберіть характеристику', 'warning');
            return;
        }

        applyBtn.disabled = true;
        applyBtn.innerHTML = '<span class="material-symbols-outlined spinning">sync</span><span>Обробка...</span>';

        try {
            const result = await batchCreateCharacteristicMapping(selectedMpIds, ownCharId);

            closeThisModal();

            if (_state.selectedRows.characteristics) {
                _state.selectedRows.characteristics.clear();
            }
            const batchBar = getBatchBar('entities-characteristics');
            if (batchBar) batchBar.deselectAll();

            await runHook('onDataChanged');

            showToast(`Замаплено ${result.success.length} характеристик`, 'success');
        } catch (error) {
            console.error('❌ Помилка batch маппінгу:', error);
            showToast('Помилка при маппінгу', 'error');
            applyBtn.disabled = false;
            applyBtn.innerHTML = '<span class="material-symbols-outlined">link</span><span>Замапити</span>';
        }
    });
}

export async function handleAutoMapCharacteristics(selectedIds) {

    try {
        const result = await autoMapCharacteristics(selectedIds);

        if (_state.selectedRows.characteristics) {
            _state.selectedRows.characteristics.clear();
        }
        const batchBar = getBatchBar('entities-characteristics');
        if (batchBar) batchBar.deselectAll();

        await runHook('onDataChanged');

        showToast(`Автоматично замаплено ${result.mapped.length} характеристик`, 'success');
    } catch (error) {
        console.error('❌ Помилка автоматичного маппінгу:', error);
        showToast('Помилка автоматичного маппінгу', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПЕРЕГЛЯД MP
// ═══════════════════════════════════════════════════════════════════════════

export async function showViewMpCharacteristicModal(mpCharIdOrData) {

    let mpChar;

    if (typeof mpCharIdOrData === 'object' && mpCharIdOrData !== null) {
        mpChar = mpCharIdOrData;
    } else {
        const mpChars = getMpCharacteristics();
        mpChar = mpChars.find(c => c.id === mpCharIdOrData);
        if (!mpChar) mpChar = mpChars.find(c => c.external_id === mpCharIdOrData);
    }

    if (!mpChar) {
        showToast('MP характеристику не знайдено', 'error');
        return;
    }

    let jsonData = {};
    if (mpChar.data && typeof mpChar.data === 'string') {
        try { jsonData = JSON.parse(mpChar.data); } catch (e) {}
    }

    const marketplaces = getMarketplaces();
    const marketplace = marketplaces.find(m => m.id === mpChar.marketplace_id);
    const mpName = marketplace ? marketplace.name : mpChar.marketplace_id;

    // Перевіряємо маппінг
    const mapChars = getMapCharacteristics();
    const mapping = mapChars.find(m =>
        m.mp_characteristic_id === mpChar.id || m.mp_characteristic_id === mpChar.external_id
    );
    let mappedToName = '';
    if (mapping) {
        const ownChar = getCharacteristics().find(c => c.id === mapping.characteristic_id);
        mappedToName = ownChar ? (ownChar.name_ua || ownChar.id) : mapping.characteristic_id;
    }

    const modalHtml = buildMpViewModal({
        title: 'Характеристика маркетплейсу',
        mpName,
        externalId: mpChar.external_id,
        jsonData,
        mappedToName
    });

    const modalOverlay = createModalOverlay(modalHtml);
    setupModalCloseHandlers(modalOverlay, () => closeModalOverlay(modalOverlay));
}
