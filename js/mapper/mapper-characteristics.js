// js/mapper/mapper-characteristics.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - CHARACTERISTICS PLUGIN                       ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Характеристики: CRUD операції + модалки                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { mapperState, registerHook, markPluginLoaded } from './mapper-state.js';
import {
    addCharacteristic, updateCharacteristic, deleteCharacteristic, getCharacteristics,
    getCategories, getOptions, getMarketplaces,
    getMpCharacteristics, getMappedMpCharacteristics,
    batchCreateCharacteristicMapping, deleteCharacteristicMapping,
    autoMapCharacteristics
} from './mapper-data.js';
import { renderCurrentTab } from './mapper-table.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { showConfirmModal } from '../common/ui-modal-confirm.js';
import { initCustomSelects, reinitializeCustomSelect } from '../common/ui-select.js';
import { getBatchBar } from '../common/ui-batch-actions.js';
import { escapeHtml } from '../utils/text-utils.js';
import { renderPseudoTable } from '../common/ui-table.js';
import { initTableSorting } from '../common/ui-table-controls.js';
import {
    initSectionNavigation,
    createModalOverlay,
    closeModalOverlay,
    setupModalCloseHandlers
} from './mapper-utils.js';

export const PLUGIN_NAME = 'mapper-characteristics';

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
 * Показати модальне вікно для додавання характеристики
 */
export async function showAddCharacteristicModal() {
    console.log('➕ Відкриття модального вікна для додавання характеристики');

    await showModal('mapper-characteristic-edit', null);

    const modalEl = document.querySelector('[data-modal-id="mapper-characteristic-edit"]');

    const title = document.getElementById('char-modal-title');
    if (title) title.textContent = 'Додати характеристику';

    const deleteBtn = document.getElementById('delete-mapper-characteristic');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    clearCharacteristicForm();
    populateCategorySelect();
    populateParentOptionsSelect();

    if (modalEl) initCustomSelects(modalEl);
    initGlobalToggleHandler();
    clearRelatedOptions();
    initSectionNavigation('char-section-navigator');

    modalEl?.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        };
    });

    const saveBtn = document.getElementById('save-mapper-characteristic');
    if (saveBtn) {
        saveBtn.onclick = handleSaveNewCharacteristic;
    }
}

/**
 * Показати модальне вікно для редагування характеристики
 */
export async function showEditCharacteristicModal(id) {
    console.log(`✏️ Відкриття модального вікна для редагування характеристики ${id}`);

    const characteristics = getCharacteristics();
    const characteristic = characteristics.find(c => c.id === id);

    if (!characteristic) {
        showToast('Характеристику не знайдено', 'error');
        return;
    }

    await showModal('mapper-characteristic-edit', null);

    const modalEl = document.querySelector('[data-modal-id="mapper-characteristic-edit"]');

    const title = document.getElementById('char-modal-title');
    if (title) title.textContent = `Характеристика ${characteristic.name_ua || ''}`;

    const deleteBtn = document.getElementById('delete-mapper-characteristic');
    if (deleteBtn) {
        deleteBtn.classList.remove('u-hidden');
        deleteBtn.onclick = () => {
            closeModal();
            showDeleteCharacteristicConfirm(id);
        };
    }

    const selectedCategoryIds = characteristic.category_ids
        ? characteristic.category_ids.split(',').map(id => id.trim()).filter(id => id)
        : [];
    populateCategorySelect(selectedCategoryIds);

    const selectedParentOptionIds = characteristic.parent_option_id
        ? characteristic.parent_option_id.split(',').map(id => id.trim()).filter(id => id)
        : [];
    populateParentOptionsSelect(selectedParentOptionIds);

    if (modalEl) initCustomSelects(modalEl);
    initGlobalToggleHandler();
    fillCharacteristicForm(characteristic);
    populateRelatedOptions(id);
    renderMappedMpCharacteristicsSections(id);
    initSectionNavigation('char-section-navigator');

    modalEl?.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        };
    });

    const saveBtn = document.getElementById('save-mapper-characteristic');
    if (saveBtn) {
        saveBtn.onclick = () => handleUpdateCharacteristic(id);
    }

    const addOptionBtn = document.getElementById('btn-add-char-option');
    if (addOptionBtn) {
        addOptionBtn.onclick = async () => {
            closeModal();
            const { showAddOptionModal } = await import('./mapper-options.js');
            await showAddOptionModal(id);
        };
    }
}

async function showDeleteCharacteristicConfirm(id) {
    const characteristics = getCharacteristics();
    const characteristic = characteristics.find(c => c.id === id);

    if (!characteristic) {
        showToast('Характеристику не знайдено', 'error');
        return;
    }

    const confirmed = await showConfirmModal({
        title: 'Видалити характеристику?',
        message: `Ви впевнені, що хочете видалити характеристику "${characteristic.name_ua}"?`,
        confirmText: 'Видалити',
        cancelText: 'Скасувати',
        confirmClass: 'btn-danger'
    });

    if (confirmed) {
        try {
            await deleteCharacteristic(id);
            showToast('Характеристику видалено', 'success');
            renderCurrentTab();
        } catch (error) {
            showToast('Помилка видалення характеристики', 'error');
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ФОРМА
// ═══════════════════════════════════════════════════════════════════════════

async function handleSaveNewCharacteristic() {
    const data = getCharacteristicFormData();

    if (!data.name_ua) {
        showToast('Введіть назву характеристики', 'error');
        return;
    }

    try {
        await addCharacteristic(data);
        showToast('Характеристику додано', 'success');
        closeModal();
        renderCurrentTab();
    } catch (error) {
        showToast('Помилка додавання характеристики', 'error');
    }
}

async function handleUpdateCharacteristic(id) {
    const data = getCharacteristicFormData();

    if (!data.name_ua) {
        showToast('Введіть назву характеристики', 'error');
        return;
    }

    try {
        await updateCharacteristic(id, data);
        showToast('Характеристику оновлено', 'success');
        closeModal();
        renderCurrentTab();
    } catch (error) {
        showToast('Помилка оновлення характеристики', 'error');
    }
}

function getCharacteristicFormData() {
    const categoriesSelect = document.getElementById('mapper-char-categories');
    const selectedCategories = categoriesSelect
        ? Array.from(categoriesSelect.selectedOptions).map(opt => opt.value)
        : [];

    const globalYes = document.getElementById('mapper-char-global-yes');
    const isGlobal = globalYes?.checked ?? false;

    const parentOptionSelect = document.getElementById('mapper-char-parent-option');
    const selectedParentOptions = parentOptionSelect
        ? Array.from(parentOptionSelect.selectedOptions).map(opt => opt.value)
        : [];

    return {
        name_ua: document.getElementById('mapper-char-name-ua')?.value.trim() || '',
        name_ru: document.getElementById('mapper-char-name-ru')?.value.trim() || '',
        type: document.getElementById('mapper-char-type')?.value || 'TextInput',
        unit: document.getElementById('mapper-char-unit')?.value.trim() || '',
        filter_type: document.getElementById('mapper-char-filter')?.value || 'disable',
        block_number: document.getElementById('mapper-char-block')?.value || '',
        is_global: isGlobal,
        category_ids: isGlobal ? '' : selectedCategories.join(','),
        parent_option_id: selectedParentOptions.join(',')
    };
}

function fillCharacteristicForm(characteristic) {
    const nameUaField = document.getElementById('mapper-char-name-ua');
    const nameRuField = document.getElementById('mapper-char-name-ru');
    const typeField = document.getElementById('mapper-char-type');
    const unitField = document.getElementById('mapper-char-unit');
    const filterField = document.getElementById('mapper-char-filter');
    const blockField = document.getElementById('mapper-char-block');
    const globalYes = document.getElementById('mapper-char-global-yes');
    const globalNo = document.getElementById('mapper-char-global-no');

    if (nameUaField) nameUaField.value = characteristic.name_ua || characteristic.name_uk || '';
    if (nameRuField) nameRuField.value = characteristic.name_ru || '';
    if (unitField) unitField.value = characteristic.unit || '';

    if (typeField) {
        const typeValue = characteristic.type || characteristic.param_type || 'TextInput';
        typeField.value = typeValue;
        reinitializeCustomSelect(typeField);
    }
    if (filterField) {
        filterField.value = characteristic.filter_type || 'disable';
        reinitializeCustomSelect(filterField);
    }
    if (blockField) {
        blockField.value = characteristic.block_number || '';
        reinitializeCustomSelect(blockField);
    }

    const isGlobal = characteristic.is_global === true ||
        String(characteristic.is_global).toLowerCase() === 'true';
    if (globalYes) globalYes.checked = isGlobal;
    if (globalNo) globalNo.checked = !isGlobal;

    toggleCategoriesField(isGlobal);
}

function clearCharacteristicForm() {
    const nameUaField = document.getElementById('mapper-char-name-ua');
    const nameRuField = document.getElementById('mapper-char-name-ru');
    const typeField = document.getElementById('mapper-char-type');
    const unitField = document.getElementById('mapper-char-unit');
    const filterField = document.getElementById('mapper-char-filter');
    const globalYes = document.getElementById('mapper-char-global-yes');
    const globalNo = document.getElementById('mapper-char-global-no');
    const categoriesSelect = document.getElementById('mapper-char-categories');

    if (nameUaField) nameUaField.value = '';
    if (nameRuField) nameRuField.value = '';
    if (unitField) unitField.value = '';
    if (globalYes) globalYes.checked = false;
    if (globalNo) globalNo.checked = true;

    if (typeField) {
        typeField.value = 'TextInput';
        reinitializeCustomSelect(typeField);
    }
    if (filterField) {
        filterField.value = 'disable';
        reinitializeCustomSelect(filterField);
    }

    if (categoriesSelect) {
        Array.from(categoriesSelect.options).forEach(opt => opt.selected = false);
        reinitializeCustomSelect(categoriesSelect);
    }

    const parentOptionSelect = document.getElementById('mapper-char-parent-option');
    if (parentOptionSelect) {
        Array.from(parentOptionSelect.options).forEach(opt => opt.selected = false);
        reinitializeCustomSelect(parentOptionSelect);
    }

    toggleCategoriesField(false);
}

function toggleCategoriesField(isGlobal) {
    const categoriesGroup = document.getElementById('mapper-char-categories')?.closest('.form-group');
    if (categoriesGroup) {
        categoriesGroup.style.display = isGlobal ? 'none' : '';
    }
}

function initGlobalToggleHandler() {
    const globalYes = document.getElementById('mapper-char-global-yes');
    const globalNo = document.getElementById('mapper-char-global-no');

    if (globalYes) {
        globalYes.addEventListener('change', () => {
            if (globalYes.checked) toggleCategoriesField(true);
        });
    }
    if (globalNo) {
        globalNo.addEventListener('change', () => {
            if (globalNo.checked) toggleCategoriesField(false);
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// СЕЛЕКТИ
// ═══════════════════════════════════════════════════════════════════════════

function populateCategorySelect(selectedIds = []) {
    const select = document.getElementById('mapper-char-categories');
    if (!select) return;

    const categories = getCategories();

    select.innerHTML = '';

    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name_ua || cat.id;
        if (selectedIds.includes(cat.id)) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    reinitializeCustomSelect(select);
}

function populateParentOptionsSelect(selectedOptionIds = []) {
    const select = document.getElementById('mapper-char-parent-option');
    if (!select) return;

    const options = getOptions();
    const characteristics = getCharacteristics();

    const charMap = new Map();
    characteristics.forEach(char => {
        charMap.set(char.id, char);
    });

    select.innerHTML = '';

    const optionsByChar = new Map();
    options.forEach(opt => {
        if (!opt.characteristic_id) return;
        if (!optionsByChar.has(opt.characteristic_id)) {
            optionsByChar.set(opt.characteristic_id, []);
        }
        optionsByChar.get(opt.characteristic_id).push(opt);
    });

    optionsByChar.forEach((opts, charId) => {
        const char = charMap.get(charId);
        const charName = char ? (char.name_ua || charId) : charId;

        const optgroup = document.createElement('optgroup');
        optgroup.label = charName;

        opts.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.id;
            option.textContent = opt.value_ua || opt.id;
            if (selectedOptionIds.includes(opt.id)) {
                option.selected = true;
            }
            optgroup.appendChild(option);
        });

        select.appendChild(optgroup);
    });

    reinitializeCustomSelect(select);
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОВ'ЯЗАНІ ЕЛЕМЕНТИ
// ═══════════════════════════════════════════════════════════════════════════

function clearRelatedOptions() {
    const container = document.getElementById('char-related-options');
    const countEl = document.getElementById('char-options-count');
    if (!container) return;

    relatedOptionsTableAPI = null;
    container.innerHTML = `
        <div class="empty-state-container">
            <div class="empty-state-message">Опції з'являться після збереження</div>
        </div>
    `;
    if (countEl) countEl.textContent = '';
}

function populateRelatedOptions(characteristicId) {
    const container = document.getElementById('char-related-options');
    const countEl = document.getElementById('char-options-count');
    if (!container) return;

    const options = getOptions();
    let optionsData = options.filter(opt => opt.characteristic_id === characteristicId);

    if (countEl) countEl.textContent = optionsData.length || '';

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
            id: 'value_ua',
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
                <button class="btn-icon btn-edit-option" data-id="${row.id}" data-tooltip="Редагувати">
                    <span class="material-symbols-outlined">edit</span>
                </button>
            `,
            emptyState: { message: 'Опції відсутні' },
            withContainer: false
        });

        // Обробники для кнопок редагування
        container.querySelectorAll('.btn-edit-option').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const optId = btn.dataset.id;
                const { showEditOptionModal } = await import('./mapper-options.js');
                await showEditOptionModal(optId);
            });
        });
    };

    // Перший рендер
    renderTable(optionsData);

    // Ініціалізація сортування
    initTableSorting(container, {
        dataSource: () => optionsData,
        onSort: (sortedData) => {
            optionsData = sortedData;
            renderTable(optionsData);
        },
        columnTypes: {
            id: 'id-text',
            value_ua: 'string'
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// MP СЕКЦІЇ
// ═══════════════════════════════════════════════════════════════════════════

function renderMappedMpCharacteristicsSections(ownCharId) {
    const nav = document.getElementById('char-section-navigator');
    const content = document.querySelector('.modal-fullscreen-content');
    if (!nav || !content) return;

    nav.querySelectorAll('.sidebar-nav-item.mp-nav-item').forEach(el => el.remove());
    content.querySelectorAll('section.mp-section').forEach(el => el.remove());

    const mappedMpChars = getMappedMpCharacteristics(ownCharId);
    if (mappedMpChars.length === 0) return;

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

    const navMain = nav.querySelector('.sidebar-nav-main');
    const navTarget = navMain || nav;

    Object.entries(byMarketplace).forEach(([mpId, data]) => {
        const navItem = document.createElement('a');
        navItem.href = `#section-mp-char-${mpId}`;
        navItem.className = 'sidebar-nav-item mp-nav-item';
        navItem.setAttribute('aria-label', data.name);
        navItem.innerHTML = `
            <span class="material-symbols-outlined">storefront</span>
            <span class="sidebar-nav-label">${escapeHtml(data.name)} (${data.items.length})</span>
        `;
        navTarget.appendChild(navItem);

        const section = document.createElement('section');
        section.id = `section-mp-char-${mpId}`;
        section.className = 'mp-section';
        section.innerHTML = renderMpCharacteristicSectionContent(data);
        content.appendChild(section);
    });

    content.querySelectorAll('.btn-unmap-char').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const mappingId = btn.dataset.mappingId;
            if (mappingId) {
                try {
                    await deleteCharacteristicMapping(mappingId);
                    showToast('Маппінг видалено', 'success');
                    renderMappedMpCharacteristicsSections(ownCharId);
                    renderCurrentTab();
                } catch (error) {
                    showToast('Помилка видалення маппінгу', 'error');
                }
            }
        });
    });
}

function renderMpCharacteristicSectionContent(marketplaceData) {
    const { name, items } = marketplaceData;

    const itemsHtml = items.map(item => {
        const data = typeof item.data === 'string' ? JSON.parse(item.data) : (item.data || {});
        return `
            <div class="mp-item-card" data-mp-id="${escapeHtml(item.id)}">
                <div class="mp-item-header">
                    <span class="mp-item-id">#${escapeHtml(item.external_id || item.id)}</span>
                    <button class="btn-icon btn-unmap btn-unmap-char" data-mapping-id="${escapeHtml(item._mappingId)}" data-tooltip="Відв'язати">
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
                <h3>Прив'язані характеристики маркетплейсу</h3>
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
    const knownFields = ['name', 'type', 'unit', 'is_global', 'filter_type', 'category_id'];
    const fields = [];

    if (data.name) {
        fields.push(`
            <div class="form-group">
                <label>Назва</label>
                <input type="text" value="${escapeHtml(data.name)}" readonly>
            </div>
        `);
    }

    if (data.type) {
        fields.push(`
            <div class="form-group">
                <label>Тип</label>
                <input type="text" value="${escapeHtml(data.type)}" readonly>
            </div>
        `);
    }

    if (data.unit) {
        fields.push(`
            <div class="form-group">
                <label>Одиниця</label>
                <input type="text" value="${escapeHtml(data.unit)}" readonly>
            </div>
        `);
    }

    if (data.is_global !== undefined) {
        fields.push(`
            <div class="form-group">
                <label>Глобальна</label>
                <input type="text" value="${data.is_global === true || data.is_global === 'Так' ? 'Так' : 'Ні'}" readonly>
            </div>
        `);
    }

    const skipFields = [...knownFields, 'our_char_id', 'our_option_id'];
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

export async function showSelectOwnCharacteristicModal(selectedIds) {
    console.log(`🔗 Batch маппінг характеристик: ${selectedIds.length} обрано`);

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

            if (mapperState.selectedRows.characteristics) {
                mapperState.selectedRows.characteristics.clear();
            }
            const batchBar = getBatchBar('mapper-characteristics');
            if (batchBar) batchBar.deselectAll();

            await renderCurrentTab();

            const targetChar = ownChars.find(c => c.id === targetOwnCharId);
            showToast(`Замаплено ${result.success.length} характеристик до "${targetChar?.name_ua || targetOwnCharId}"`, 'success');
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
                    <h2 class="modal-title">Замапити до власної характеристики</h2>
                    <div class="modal-header-actions">
                        <button class="segment modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <p class="u-mb-16">Обрано <strong>${selectedMpIds.length}</strong> характеристик маркетплейсу.</p>
                    <p class="u-mb-16">Оберіть власну характеристику для прив'язки:</p>
                    <div class="form-group">
                        <label for="select-own-char">Власна характеристика</label>
                        <select id="select-own-char" class="input-main">
                            <option value="">— Оберіть характеристику —</option>
                            ${ownChars.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name_ua || c.id)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-close-btn">Скасувати</button>
                    <button id="btn-apply-char-mapping" class="btn btn-primary">
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
        applyBtn.innerHTML = '<span class="material-symbols-outlined is-spinning">sync</span><span>Обробка...</span>';

        try {
            const result = await batchCreateCharacteristicMapping(selectedMpIds, ownCharId);

            closeThisModal();

            if (mapperState.selectedRows.characteristics) {
                mapperState.selectedRows.characteristics.clear();
            }
            const batchBar = getBatchBar('mapper-characteristics');
            if (batchBar) batchBar.deselectAll();

            await renderCurrentTab();

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
    console.log(`🤖 Автоматичний маппінг характеристик: ${selectedIds.length} обрано`);

    try {
        const result = await autoMapCharacteristics(selectedIds);

        if (mapperState.selectedRows.characteristics) {
            mapperState.selectedRows.characteristics.clear();
        }
        const batchBar = getBatchBar('mapper-characteristics');
        if (batchBar) batchBar.deselectAll();

        await renderCurrentTab();

        showToast(`Автоматично замаплено ${result.mapped} характеристик`, 'success');
    } catch (error) {
        console.error('❌ Помилка автоматичного маппінгу:', error);
        showToast('Помилка автоматичного маппінгу', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПЕРЕГЛЯД MP
// ═══════════════════════════════════════════════════════════════════════════

export async function showViewMpCharacteristicModal(mpCharIdOrData) {
    console.log(`👁️ Перегляд MP характеристики`, mpCharIdOrData);

    let mpChar;

    if (typeof mpCharIdOrData === 'object' && mpCharIdOrData !== null) {
        mpChar = mpCharIdOrData;
    } else {
        const mpChars = getMpCharacteristics();
        mpChar = mpChars.find(c => c.id === mpCharIdOrData);

        if (!mpChar) {
            mpChar = mpChars.find(c => c.external_id === mpCharIdOrData);
        }
    }

    if (!mpChar) {
        showToast('MP характеристику не знайдено', 'error');
        return;
    }

    let charData = mpChar;
    if (mpChar.data && typeof mpChar.data === 'string') {
        try {
            charData = { ...mpChar, ...JSON.parse(mpChar.data) };
        } catch (e) {}
    }

    const marketplaces = getMarketplaces();
    const marketplace = marketplaces.find(m => m.id === mpChar.marketplace_id);
    const mpName = marketplace ? marketplace.name : mpChar.marketplace_id;

    let mappedToName = '';
    if (charData.our_char_id) {
        const ownChars = getCharacteristics();
        const ownChar = ownChars.find(c => c.id === charData.our_char_id);
        mappedToName = ownChar ? (ownChar.name_ua || ownChar.id) : charData.our_char_id;
    }

    const modalHtml = `
        <div class="modal-overlay is-open">
            <div class="modal-container modal-medium">
                <div class="modal-header">
                    <h2 class="modal-title">Характеристика маркетплейсу</h2>
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
                                <input type="text" class="input-main" value="${escapeHtml(mpChar.id)}" readonly>
                            </div>
                            <div class="form-group">
                                <label>External ID</label>
                                <input type="text" class="input-main" value="${escapeHtml(mpChar.external_id || '')}" readonly>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Назва</label>
                            <input type="text" class="input-main" value="${escapeHtml(charData.name || '')}" readonly>
                        </div>
                        <div class="grid2">
                            <div class="form-group">
                                <label>Тип</label>
                                <input type="text" class="input-main" value="${escapeHtml(charData.type || '')}" readonly>
                            </div>
                            <div class="form-group">
                                <label>Одиниця виміру</label>
                                <input type="text" class="input-main" value="${escapeHtml(charData.unit || '')}" readonly>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Глобальна</label>
                            <input type="text" class="input-main" value="${charData.is_global ? 'Так' : 'Ні'}" readonly>
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
