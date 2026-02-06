// js/mapper/mapper-options.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - OPTIONS PLUGIN                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Опції: CRUD операції + модалки                              ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Управління власними опціями та маппінг MP опцій.                        ║
 * ║                                                                          ║
 * ║  ЕКСПОРТОВАНІ ФУНКЦІЇ:                                                   ║
 * ║  - init() — Ініціалізація плагіна (реєстрація hooks)                     ║
 * ║  - showAddOptionModal(charId?) — Модалка додавання                       ║
 * ║  - showEditOptionModal(id) — Модалка редагування                         ║
 * ║  - showSelectOwnOptionModal(mpIds) — Вибір власної опції                 ║
 * ║  - showViewMpOptionModal(mpId) — Перегляд MP опції                       ║
 * ║  - handleAutoMapOptions(ids) — Авто-маппінг                              ║
 * ║                                                                          ║
 * ║  ЗАЛЕЖНОСТІ:                                                             ║
 * ║  - mapper-state.js (state, hooks)                                        ║
 * ║  - mapper-data.js (API операції)                                         ║
 * ║  - mapper-table.js (рендеринг)                                           ║
 * ║  - mapper-utils.js (утиліти)                                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { mapperState, registerHook, markPluginLoaded, runHook } from './mapper-state.js';
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
    setupModalCloseHandlers,
    buildMpViewModal
} from './mapper-utils.js';
import { renderPseudoTable } from '../common/ui-table.js';
import { initTableSorting } from '../common/ui-table-controls.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../common/ui-actions.js';

export const PLUGIN_NAME = 'mapper-options';

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
 */
function handleTabChange(newTab, prevTab) {
    if (newTab === 'options') {
        // Таб опцій активовано
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
 * Показати модальне вікно для додавання опції
 */
export async function showAddOptionModal(preselectedCharacteristicId = null) {

    await showModal('mapper-option-edit', null);

    const modalEl = document.querySelector('[data-modal-id="mapper-option-edit"]');

    const title = document.getElementById('option-modal-title');
    if (title) title.textContent = 'Додати опцію';

    const deleteBtn = document.getElementById('delete-mapper-option');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    clearOptionForm();
    populateCharacteristicSelect(preselectedCharacteristicId);
    populateParentOptionSelect();

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
    populateParentOptionSelect(option.parent_option_id || null);
    if (modalEl) initCustomSelects(modalEl);
    fillOptionForm(option);
    populateRelatedChildOptions(id);
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
        sort_order: document.getElementById('mapper-option-order')?.value || '0',
        parent_option_id: document.getElementById('mapper-option-parent')?.value || ''
    };
}

function fillOptionForm(option) {
    const charField = document.getElementById('mapper-option-char');
    const valueUaField = document.getElementById('mapper-option-value-ua');
    const valueRuField = document.getElementById('mapper-option-value-ru');
    const orderField = document.getElementById('mapper-option-order');
    const parentField = document.getElementById('mapper-option-parent');

    if (charField) charField.value = option.characteristic_id || '';
    if (valueUaField) valueUaField.value = option.value_ua || '';
    if (valueRuField) valueRuField.value = option.value_ru || '';
    if (orderField) orderField.value = option.sort_order || '0';
    if (parentField) {
        parentField.value = option.parent_option_id || '';
        reinitializeCustomSelect(parentField);
    }
}

function clearOptionForm() {
    const charField = document.getElementById('mapper-option-char');
    const valueUaField = document.getElementById('mapper-option-value-ua');
    const valueRuField = document.getElementById('mapper-option-value-ru');
    const orderField = document.getElementById('mapper-option-order');
    const parentField = document.getElementById('mapper-option-parent');

    if (charField) charField.value = '';
    if (valueUaField) valueUaField.value = '';
    if (valueRuField) valueRuField.value = '';
    if (orderField) orderField.value = '0';
    if (parentField) {
        parentField.value = '';
        reinitializeCustomSelect(parentField);
    }
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

/**
 * Заповнити селект батьківської опції
 * Групує опції по характеристиках (як optgroup)
 */
function populateParentOptionSelect(selectedId = null) {
    const select = document.getElementById('mapper-option-parent');
    if (!select) return;

    const options = getOptions();
    const characteristics = getCharacteristics();

    const charMap = new Map();
    characteristics.forEach(char => {
        charMap.set(char.id, char);
    });

    select.innerHTML = '<option value="">— Без батьківської опції —</option>';

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
            if (selectedId && opt.id === selectedId) {
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

function populateRelatedChildOptions(optionId) {
    const container = document.getElementById('option-related-chars');
    const statsEl = document.getElementById('option-chars-stats');
    const searchInput = document.getElementById('option-chars-search');
    const navItem = document.getElementById('nav-option-dependent');
    const section = document.getElementById('section-option-dependent');

    if (!container) return;

    const options = getOptions();
    const allData = options.filter(opt => opt.parent_option_id === optionId);
    let filteredData = [...allData];

    // Функція оновлення статистики
    const updateStats = (shown, total) => {
        if (statsEl) statsEl.textContent = `Показано ${shown} з ${total}`;
    };

    // Приховуємо/показуємо секцію залежно від наявності дочірніх опцій
    if (allData.length === 0) {
        if (navItem) navItem.classList.add('u-hidden');
        if (section) section.classList.add('u-hidden');
        if (statsEl) statsEl.textContent = 'Показано 0 з 0';
        return;
    }

    if (navItem) navItem.classList.remove('u-hidden');
    if (section) section.classList.remove('u-hidden');

    // Конфігурація колонок
    const columns = [
        {
            id: 'id',
            label: 'ID',
            sortable: true,
            className: 'cell-m',
            render: (value) => `<span class="word-chip">${escapeHtml(value || '')}</span>`
        },
        {
            id: 'value_ua',
            label: 'Значення',
            sortable: true,
            className: 'cell-l',
            render: (value, row) => escapeHtml(value || row.id || '-')
        }
    ];

    // Реєструємо обробники дій
    registerActionHandlers('option-child-options', {
        edit: async (rowId) => {
            await showEditOptionModal(rowId);
        }
    });

    const renderTable = (data) => {
        renderPseudoTable(container, {
            data,
            columns,
            rowActionsCustom: (row) => actionButton({
                action: 'edit',
                rowId: row.id
            }),
            emptyState: { message: 'Дочірні опції відсутні' },
            withContainer: false
        });

        // Оновлюємо статистику
        updateStats(data.length, allData.length);

        // Ініціалізуємо обробники дій
        initActionHandlers(container, 'option-child-options');
    };

    // Функція пошуку
    const filterData = (query) => {
        const q = query.toLowerCase().trim();
        if (!q) {
            filteredData = [...allData];
        } else {
            filteredData = allData.filter(row =>
                (row.id && row.id.toLowerCase().includes(q)) ||
                (row.value_ua && row.value_ua.toLowerCase().includes(q))
            );
        }
        renderTable(filteredData);
    };

    // Підключаємо пошук
    if (searchInput) {
        searchInput.value = '';
        searchInput.addEventListener('input', (e) => filterData(e.target.value));
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
            value_ua: 'string'
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

    // Перезапускаємо навігацію щоб включити нові секції
    initSectionNavigation('option-section-navigator');

    // Реєструємо обробник unmap з замиканням на ownOptionId
    registerActionHandlers('mp-option-mapping', {
        unmap: async (rowId, data) => {
            const mappingId = data.mappingId;
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
        }
    });

    // Ініціалізуємо обробники дій
    initActionHandlers(content, 'mp-option-mapping');
}

function renderMpOptionSectionContent(marketplaceData) {
    const { name, items } = marketplaceData;

    const itemsHtml = items.map(item => {
        const data = typeof item.data === 'string' ? JSON.parse(item.data) : (item.data || {});
        const entityName = data.name || '';
        return `
            <div class="mp-item-card" data-mp-id="${escapeHtml(item.id)}">
                <div class="mp-item-header">
                    <span class="mp-item-id">#${escapeHtml(item.external_id || item.id)}</span>
                    <span>${escapeHtml(entityName)}</span>
                    ${actionButton({ action: 'unmap', rowId: item.id, data: { mappingId: item._mappingId } })}
                </div>
                <div class="mp-item-fields">
                    <div class="form-grid form-grid-2">
                        ${renderMpDataFields(data, item.external_id, entityName)}
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

function renderMpDataFields(data, externalId, entityName) {
    const skipFields = ['id', 'name', 'char_id', 'our_option_id', 'our_char_id', 'our_cat_id'];
    const dupValues = new Set([String(externalId || ''), entityName || ''].filter(Boolean));
    const fields = [];

    Object.entries(data).forEach(([key, value]) => {
        if (skipFields.includes(key)) return;
        if (value === null || value === undefined || value === '') return;
        if (dupValues.has(String(value))) return;
        fields.push(`
            <div class="form-group">
                <label>${escapeHtml(key)}</label>
                <input type="text" value="${escapeHtml(String(value))}" readonly>
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

    try {
        const result = await autoMapOptions(selectedIds);

        if (mapperState.selectedRows.options) {
            mapperState.selectedRows.options.clear();
        }
        const batchBar = getBatchBar('mapper-options');
        if (batchBar) batchBar.deselectAll();

        await renderCurrentTab();

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
    const mapOpts = mapperState.mapOptions || [];
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
        mappedToName,
        extraSkipFields: ['name', 'char_id']
    });

    const modalOverlay = createModalOverlay(modalHtml);
    setupModalCloseHandlers(modalOverlay, () => closeModalOverlay(modalOverlay));
}
