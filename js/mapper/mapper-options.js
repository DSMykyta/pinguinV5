// js/mapper/mapper-options.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - OPTIONS PLUGIN                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Опції: CRUD операції + модалки                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { mapperState, registerHook, markPluginLoaded } from './mapper-state.js';
import {
    addOption, updateOption, deleteOption, getOptions,
    getCharacteristics, getMarketplaces,
    getMpOptions, getMappedMpOptions,
    batchCreateOptionMapping, deleteOptionMapping,
    autoMapOptions
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
    createModalOverlay,
    closeModalOverlay,
    setupModalCloseHandlers
} from './mapper-utils.js';
import { renderPseudoTable } from '../common/ui-table.js';
import { initTableSorting } from '../common/ui-table-controls.js';

export const PLUGIN_NAME = 'mapper-options';

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
 * Показати модальне вікно для додавання опції
 */
export async function showAddOptionModal(preselectedCharacteristicId = null) {
    console.log('➕ Відкриття модального вікна для додавання опції', preselectedCharacteristicId ? `для характеристики ${preselectedCharacteristicId}` : '');

    await showModal('mapper-option-edit', null);

    const modalEl = document.querySelector('[data-modal-id="mapper-option-edit"]');

    const title = document.getElementById('option-modal-title');
    if (title) title.textContent = 'Додати опцію';

    const deleteBtn = document.getElementById('delete-mapper-option');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    clearOptionForm();
    populateCharacteristicSelect(preselectedCharacteristicId);

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
        saveBtn.onclick = handleSaveNewOption;
    }
}

/**
 * Показати модальне вікно для редагування опції
 */
export async function showEditOptionModal(id) {
    console.log(`✏️ Відкриття модального вікна для редагування опції ${id}`);

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
    if (modalEl) initCustomSelects(modalEl);
    fillOptionForm(option);
    populateRelatedDependentCharacteristics(id);
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
        saveBtn.onclick = () => handleUpdateOption(id);
    }
}

async function showDeleteOptionConfirm(id) {
    const options = getOptions();
    const option = options.find(o => o.id === id);

    if (!option) {
        showToast('Опцію не знайдено', 'error');
        return;
    }

    const confirmed = await showConfirmModal({
        title: 'Видалити опцію?',
        message: `Ви впевнені, що хочете видалити опцію "${option.value_ua}"?`,
        confirmText: 'Видалити',
        cancelText: 'Скасувати',
        confirmClass: 'btn-danger'
    });

    if (confirmed) {
        try {
            await deleteOption(id);
            showToast('Опцію видалено', 'success');
            renderCurrentTab();
        } catch (error) {
            showToast('Помилка видалення опції', 'error');
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ФОРМА
// ═══════════════════════════════════════════════════════════════════════════

async function handleSaveNewOption() {
    const data = getOptionFormData();

    if (!data.value_ua) {
        showToast('Введіть значення опції', 'error');
        return;
    }

    if (!data.characteristic_id) {
        showToast('Оберіть характеристику', 'error');
        return;
    }

    try {
        await addOption(data);
        showToast('Опцію додано', 'success');
        closeModal();
        renderCurrentTab();
    } catch (error) {
        showToast('Помилка додавання опції', 'error');
    }
}

async function handleUpdateOption(id) {
    const data = getOptionFormData();

    if (!data.value_ua) {
        showToast('Введіть значення опції', 'error');
        return;
    }

    try {
        await updateOption(id, data);
        showToast('Опцію оновлено', 'success');
        closeModal();
        renderCurrentTab();
    } catch (error) {
        showToast('Помилка оновлення опції', 'error');
    }
}

function getOptionFormData() {
    return {
        characteristic_id: document.getElementById('mapper-option-char')?.value || '',
        value_ua: document.getElementById('mapper-option-value-ua')?.value.trim() || '',
        value_ru: document.getElementById('mapper-option-value-ru')?.value.trim() || '',
        sort_order: document.getElementById('mapper-option-order')?.value || '0'
    };
}

function fillOptionForm(option) {
    const charField = document.getElementById('mapper-option-char');
    const valueUaField = document.getElementById('mapper-option-value-ua');
    const valueRuField = document.getElementById('mapper-option-value-ru');
    const orderField = document.getElementById('mapper-option-order');

    if (charField) charField.value = option.characteristic_id || '';
    if (valueUaField) valueUaField.value = option.value_ua || '';
    if (valueRuField) valueRuField.value = option.value_ru || '';
    if (orderField) orderField.value = option.sort_order || '0';
}

function clearOptionForm() {
    const charField = document.getElementById('mapper-option-char');
    const valueUaField = document.getElementById('mapper-option-value-ua');
    const valueRuField = document.getElementById('mapper-option-value-ru');
    const orderField = document.getElementById('mapper-option-order');

    if (charField) charField.value = '';
    if (valueUaField) valueUaField.value = '';
    if (valueRuField) valueRuField.value = '';
    if (orderField) orderField.value = '0';
}

function populateCharacteristicSelect(preselectedId = null) {
    const select = document.getElementById('mapper-option-char');
    if (!select) return;

    const characteristics = getCharacteristics();

    select.innerHTML = '<option value="">— Оберіть характеристику —</option>';

    characteristics.forEach(char => {
        const option = document.createElement('option');
        option.value = char.id;
        option.textContent = char.name_ua || char.id;
        if (preselectedId && char.id === preselectedId) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    reinitializeCustomSelect(select);
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОВ'ЯЗАНІ ЕЛЕМЕНТИ
// ═══════════════════════════════════════════════════════════════════════════

function populateRelatedDependentCharacteristics(optionId) {
    const container = document.getElementById('option-related-chars');
    const countEl = document.getElementById('option-chars-count');
    const navItem = document.getElementById('nav-option-dependent');
    const section = document.getElementById('section-option-dependent');

    if (!container) return;

    const characteristics = getCharacteristics();
    let charsData = characteristics.filter(char => {
        if (!char.parent_option_id) return false;
        const ids = Array.isArray(char.parent_option_id)
            ? char.parent_option_id
            : String(char.parent_option_id).split(',').map(id => id.trim());
        return ids.includes(optionId);
    });

    // Приховуємо/показуємо секцію залежно від наявності залежних характеристик
    if (charsData.length === 0) {
        if (navItem) navItem.classList.add('u-hidden');
        if (section) section.classList.add('u-hidden');
        if (countEl) countEl.textContent = '';
        return;
    }

    if (navItem) navItem.classList.remove('u-hidden');
    if (section) section.classList.remove('u-hidden');
    if (countEl) countEl.textContent = charsData.length;

    // Конфігурація колонок
    const columns = [
        {
            id: 'id',
            label: 'ID',
            sortable: true,
            className: 'cell-id',
            render: (value) => `<span class="word-chip">${escapeHtml(value || '')}</span>`
        },
        {
            id: 'name_ua',
            label: 'Назва',
            sortable: true,
            className: 'cell-name',
            render: (value, row) => escapeHtml(value || row.id || '-')
        }
    ];

    // Функція рендерингу таблиці
    const renderTable = (data) => {
        renderPseudoTable(container, {
            data,
            columns,
            rowActionsCustom: (row) => `
                <button class="btn-icon btn-edit-dep-char" data-id="${row.id}" data-tooltip="Редагувати">
                    <span class="material-symbols-outlined">edit</span>
                </button>
            `,
            emptyState: { message: 'Залежні характеристики відсутні' },
            withContainer: false
        });

        // Обробники для кнопок редагування
        container.querySelectorAll('.btn-edit-dep-char').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const charId = btn.dataset.id;
                const { showEditCharacteristicModal } = await import('./mapper-characteristics.js');
                await showEditCharacteristicModal(charId);
            });
        });
    };

    // Перший рендер
    renderTable(charsData);

    // Ініціалізація сортування
    initTableSorting(container, {
        dataSource: () => charsData,
        onSort: (sortedData) => {
            charsData = sortedData;
            renderTable(charsData);
        },
        columnTypes: {
            id: 'id-text',
            name_ua: 'string'
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// MP СЕКЦІЇ
// ═══════════════════════════════════════════════════════════════════════════

function renderMappedMpOptionsSections(ownOptionId) {
    const nav = document.getElementById('option-section-navigator');
    const content = document.querySelector('.modal-fullscreen-content');
    if (!nav || !content) return;

    nav.querySelectorAll('.sidebar-nav-item.mp-nav-item').forEach(el => el.remove());
    content.querySelectorAll('section.mp-section').forEach(el => el.remove());

    const mappedMpOpts = getMappedMpOptions(ownOptionId);
    if (mappedMpOpts.length === 0) return;

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

    const navMain = nav.querySelector('.sidebar-nav-main');
    const navTarget = navMain || nav;

    Object.entries(byMarketplace).forEach(([mpId, data]) => {
        const navItem = document.createElement('a');
        navItem.href = `#section-mp-opt-${mpId}`;
        navItem.className = 'sidebar-nav-item mp-nav-item';
        navItem.setAttribute('aria-label', data.name);
        navItem.innerHTML = `
            <span class="material-symbols-outlined">storefront</span>
            <span class="sidebar-nav-label">${escapeHtml(data.name)} (${data.items.length})</span>
        `;
        navTarget.appendChild(navItem);

        const section = document.createElement('section');
        section.id = `section-mp-opt-${mpId}`;
        section.className = 'mp-section';
        section.innerHTML = renderMpOptionSectionContent(data);
        content.appendChild(section);
    });

    content.querySelectorAll('.btn-unmap-opt').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const mappingId = btn.dataset.mappingId;
            if (mappingId) {
                try {
                    await deleteOptionMapping(mappingId);
                    showToast('Маппінг видалено', 'success');
                    renderMappedMpOptionsSections(ownOptionId);
                    renderCurrentTab();
                } catch (error) {
                    showToast('Помилка видалення маппінгу', 'error');
                }
            }
        });
    });
}

function renderMpOptionSectionContent(marketplaceData) {
    const { name, items } = marketplaceData;

    const itemsHtml = items.map(item => {
        const data = typeof item.data === 'string' ? JSON.parse(item.data) : (item.data || {});
        return `
            <div class="mp-item-card" data-mp-id="${escapeHtml(item.id)}">
                <div class="mp-item-header">
                    <span class="mp-item-id">#${escapeHtml(item.external_id || item.id)}</span>
                    <button class="btn-icon btn-unmap btn-unmap-opt" data-mapping-id="${escapeHtml(item._mappingId)}" data-tooltip="Відв'язати">
                        <span class="material-symbols-outlined">link_off</span>
                    </button>
                </div>
                <div class="mp-item-fields">
                    <div class="form-grid form-grid-2">
                        ${renderMpDataFields(data)}
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
                <h3>Прив'язані опції маркетплейсу</h3>
            </div>
        </div>
        <div class="section-content">
            <div class="mp-items-list">
                ${itemsHtml}
            </div>
        </div>
    `;
}

function renderMpDataFields(data) {
    const fields = [];

    if (data.name) {
        fields.push(`
            <div class="form-group">
                <label>Значення</label>
                <input type="text" value="${escapeHtml(data.name)}" readonly>
            </div>
        `);
    }

    if (data.char_id) {
        fields.push(`
            <div class="form-group">
                <label>ID характеристики</label>
                <input type="text" value="${escapeHtml(data.char_id)}" readonly>
            </div>
        `);
    }

    const skipFields = ['name', 'char_id', 'our_option_id'];
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

// ═══════════════════════════════════════════════════════════════════════════
// МАППІНГ
// ═══════════════════════════════════════════════════════════════════════════

export async function showSelectOwnOptionModal(selectedIds) {
    console.log(`🔗 Batch маппінг опцій: ${selectedIds.length} обрано`);

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

            if (mapperState.selectedRows.options) {
                mapperState.selectedRows.options.clear();
            }
            const batchBar = getBatchBar('mapper-options');
            if (batchBar) batchBar.deselectAll();

            await renderCurrentTab();

            const targetOpt = ownOpts.find(o => o.id === targetOwnOptId);
            showToast(`Замаплено ${result.success.length} опцій до "${targetOpt?.value_ua || targetOwnOptId}"`, 'success');
        } catch (error) {
            console.error('❌ Помилка batch маппінгу:', error);
            showToast('Помилка при маппінгу', 'error');
        }
        return;
    }

    const modalHtml = `
        <div class="modal-overlay is-open">
            <div class="modal-container modal-medium">
                <div class="modal-header">
                    <h2 class="modal-title">Замапити до власної опції</h2>
                    <div class="modal-header-actions">
                        <button class="segment modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <p class="u-mb-16">Обрано <strong>${selectedMpIds.length}</strong> опцій маркетплейсу.</p>
                    <p class="u-mb-16">Оберіть власну опцію для прив'язки:</p>
                    <div class="form-group">
                        <label for="select-own-option">Власна опція</label>
                        <select id="select-own-option" class="input-main">
                            <option value="">— Оберіть опцію —</option>
                            ${ownOpts.map(o => `<option value="${escapeHtml(o.id)}">${escapeHtml(o.value_ua || o.id)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-close-btn">Скасувати</button>
                    <button id="btn-apply-option-mapping" class="btn btn-primary">
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
        applyBtn.innerHTML = '<span class="material-symbols-outlined is-spinning">sync</span><span>Обробка...</span>';

        try {
            const result = await batchCreateOptionMapping(selectedMpIds, ownOptionId);

            closeThisModal();

            if (mapperState.selectedRows.options) {
                mapperState.selectedRows.options.clear();
            }
            const batchBar = getBatchBar('mapper-options');
            if (batchBar) batchBar.deselectAll();

            await renderCurrentTab();

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
    console.log(`🤖 Автоматичний маппінг опцій: ${selectedIds.length} обрано`);

    try {
        const result = await autoMapOptions(selectedIds);

        if (mapperState.selectedRows.options) {
            mapperState.selectedRows.options.clear();
        }
        const batchBar = getBatchBar('mapper-options');
        if (batchBar) batchBar.deselectAll();

        await renderCurrentTab();

        showToast(`Автоматично замаплено ${result.mapped} опцій`, 'success');
    } catch (error) {
        console.error('❌ Помилка автоматичного маппінгу:', error);
        showToast('Помилка автоматичного маппінгу', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПЕРЕГЛЯД MP
// ═══════════════════════════════════════════════════════════════════════════

export async function showViewMpOptionModal(mpOptionIdOrData) {
    console.log(`👁️ Перегляд MP опції`, mpOptionIdOrData);

    let mpOption;

    if (typeof mpOptionIdOrData === 'object' && mpOptionIdOrData !== null) {
        mpOption = mpOptionIdOrData;
    } else {
        const mpOpts = getMpOptions();
        mpOption = mpOpts.find(o => o.id === mpOptionIdOrData);

        if (!mpOption) {
            mpOption = mpOpts.find(o => o.external_id === mpOptionIdOrData);
        }
    }

    if (!mpOption) {
        showToast('MP опцію не знайдено', 'error');
        return;
    }

    let optData = mpOption;
    if (mpOption.data && typeof mpOption.data === 'string') {
        try {
            optData = { ...mpOption, ...JSON.parse(mpOption.data) };
        } catch (e) {}
    }

    const marketplaces = getMarketplaces();
    const marketplace = marketplaces.find(m => m.id === mpOption.marketplace_id);
    const mpName = marketplace ? marketplace.name : mpOption.marketplace_id;

    let mappedToName = '';
    if (optData.our_option_id) {
        const ownOpts = getOptions();
        const ownOpt = ownOpts.find(o => o.id === optData.our_option_id);
        mappedToName = ownOpt ? (ownOpt.value_ua || ownOpt.id) : optData.our_option_id;
    }

    const modalHtml = `
        <div class="modal-overlay is-open">
            <div class="modal-container modal-medium">
                <div class="modal-header">
                    <h2 class="modal-title">Опція маркетплейсу</h2>
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
                                <input type="text" class="input-main" value="${escapeHtml(mpOption.id)}" readonly>
                            </div>
                            <div class="form-group">
                                <label>External ID</label>
                                <input type="text" class="input-main" value="${escapeHtml(mpOption.external_id || '')}" readonly>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Значення</label>
                            <input type="text" class="input-main" value="${escapeHtml(optData.name || '')}" readonly>
                        </div>
                    </fieldset>

                    <div class="form-fieldset u-mt-16">
                        <div class="form-group">
                            <label>Замаплено до</label>
                            ${mappedToName
                                ? `<div class="chip chip-success">${escapeHtml(mappedToName)}</div>`
                                : `<div class="chip">Не замаплено</div>`
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
