// js/mapper/mapper-characteristics.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - CHARACTERISTICS PLUGIN                       ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Характеристики: CRUD операції + модалки                     ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Управління власними характеристиками та маппінг MP характеристик.       ║
 * ║                                                                          ║
 * ║  ЕКСПОРТОВАНІ ФУНКЦІЇ:                                                   ║
 * ║  - init() — Ініціалізація плагіна (реєстрація hooks)                     ║
 * ║  - showAddCharacteristicModal() — Модалка додавання                      ║
 * ║  - showEditCharacteristicModal(id) — Модалка редагування                 ║
 * ║  - showSelectOwnCharacteristicModal(mpIds) — Вибір власної               ║
 * ║  - showViewMpCharacteristicModal(mpId) — Перегляд MP характеристики      ║
 * ║  - handleAutoMapCharacteristics(ids) — Авто-маппінг                      ║
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
    addCharacteristic, updateCharacteristic, deleteCharacteristic, getCharacteristics,
    getCategories, getMarketplaces, getOptions, updateOption,
    getMpCharacteristics, getMappedMpCharacteristics,
    createCharacteristicMapping, batchCreateCharacteristicMapping, deleteCharacteristicMapping,
    autoMapCharacteristics
} from './mapper-data.js';
import { renderCurrentTab } from './mapper-table.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { showConfirmModal } from '../common/ui-modal-confirm.js';
import { initCustomSelects, reinitializeCustomSelect } from '../common/ui-select.js';
import { getBatchBar } from '../common/ui-batch-actions.js';
import { escapeHtml } from '../utils/text-utils.js';
import { renderTable as renderTableLego } from '../common/table/table-main.js';
import {
    initSectionNavigation,
    createModalOverlay,
    closeModalOverlay,
    setupModalCloseHandlers,
    buildMpViewModal,
    showMapToMpModal
} from './mapper-utils.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../common/ui-actions.js';

export const PLUGIN_NAME = 'mapper-characteristics';

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
    if (newTab === 'characteristics') {
        // Таб характеристик активовано
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
 * Показати модальне вікно для додавання характеристики
 */
export async function showAddCharacteristicModal() {

    await showModal('mapper-characteristic-edit', null);

    const modalEl = document.querySelector('[data-modal-id="mapper-characteristic-edit"]');

    const title = document.getElementById('char-modal-title');
    if (title) title.textContent = 'Додати характеристику';

    const deleteBtn = document.getElementById('delete-mapper-characteristic');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    clearCharacteristicForm();
    populateCategorySelect();

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
        confirmClass: 'btn-delete'
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
    const isGlobal = globalYes?.checked ? 'TRUE' : 'FALSE';

    return {
        name_ua: document.getElementById('mapper-char-name-ua')?.value.trim() || '',
        name_ru: document.getElementById('mapper-char-name-ru')?.value.trim() || '',
        type: document.getElementById('mapper-char-type')?.value || 'TextInput',
        unit: document.getElementById('mapper-char-unit')?.value.trim() || '',
        filter_type: document.getElementById('mapper-char-filter')?.value || 'disable',
        block_number: document.getElementById('mapper-char-block')?.value || '',
        is_global: isGlobal,
        category_ids: isGlobal ? '' : selectedCategories.join(',')
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

// ═══════════════════════════════════════════════════════════════════════════
// ПОВ'ЯЗАНІ ЕЛЕМЕНТИ
// ═══════════════════════════════════════════════════════════════════════════

let relatedOptionsTableAPI = null;

function clearRelatedOptions() {
    const container = document.getElementById('char-related-options');
    const statsEl = document.getElementById('char-options-stats');
    const searchInput = document.getElementById('char-options-search');
    if (!container) return;

    relatedOptionsTableAPI = null;
    container.innerHTML = `
        <div class="empty-state-container">
            <div class="empty-state-message">Опції з'являться після збереження</div>
        </div>
    `;
    if (statsEl) statsEl.textContent = 'Показано 0 з 0';
    if (searchInput) searchInput.value = '';
}

function populateRelatedOptions(characteristicId) {
    const container = document.getElementById('char-related-options');
    const statsEl = document.getElementById('char-options-stats');
    const searchInput = document.getElementById('char-options-search');
    if (!container) return;

    const options = getOptions();
    const allData = options.filter(opt => opt.characteristic_id === characteristicId);
    let filteredData = [...allData];

    const updateStats = (shown, total) => {
        if (statsEl) statsEl.textContent = `Показано ${shown} з ${total}`;
    };

    const columns = [
        {
            id: 'value_ua',
            label: 'Назва',
            sortable: true,
            className: 'cell-l',
            render: (value) => escapeHtml(value || '')
        },
        {
            id: 'id',
            label: 'ID',
            sortable: true,
            className: 'cell-m',
            render: (value) => `<span class="word-chip">${escapeHtml(value || '')}</span>`
        }
    ];

    registerActionHandlers('characteristic-options', {
        edit: async (rowId) => {
            const { showEditOptionModal } = await import('./mapper-options.js');
            await showEditOptionModal(rowId);
        },
        unlink: async (rowId) => {
            const option = allData.find(o => o.id === rowId);
            const optionName = option?.value_ua || rowId;

            const confirmed = await showConfirmModal({
                title: 'Відв\'язати опцію?',
                message: `Ви впевнені, що хочете відв'язати опцію "${optionName}" від цієї характеристики?`,
                confirmText: 'Відв\'язати',
                cancelText: 'Скасувати',
                confirmClass: 'btn-warning'
            });

            if (confirmed) {
                try {
                    await updateOption(rowId, { characteristic_id: '' });
                    showToast('Опцію відв\'язано', 'success');
                    populateRelatedOptions(characteristicId);
                } catch (error) {
                    console.error('❌ Помилка відв\'язування опції:', error);
                    showToast('Помилка відв\'язування опції', 'error');
                }
            }
        }
    });

    // Створюємо Table LEGO API один раз
    const modalTableAPI = renderTableLego(container, {
        data: [],
        columns,
        rowActionsHeader: ' ',
        rowActions: (row) => `
            <button class="btn-icon" data-row-id="${row.id}" data-action="edit" data-tooltip="Редагувати">
                <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon" data-row-id="${row.id}" data-action="unlink" data-tooltip="Відв'язати">
                <span class="material-symbols-outlined">link_off</span>
            </button>
        `,
        emptyState: { message: 'Опції відсутні' },
        withContainer: false,
        onAfterRender: (cont) => initActionHandlers(cont, 'characteristic-options'),
        plugins: {
            sorting: {
                dataSource: () => filteredData,
                onSort: (sortedData) => {
                    filteredData = sortedData;
                    renderTable(filteredData);
                },
                columnTypes: {
                    value_ua: 'string',
                    id: 'id-text'
                }
            }
        }
    });

    const renderTable = (data) => {
        modalTableAPI.render(data);
        updateStats(data.length, allData.length);
    };

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

    if (searchInput) {
        searchInput.value = '';
        searchInput.addEventListener('input', (e) => filterData(e.target.value));
    }

    // Перший рендер (сортування через Table LEGO плагін)
    renderTable(filteredData);
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
    const navItem = document.createElement('a');
    navItem.href = '#section-mp-characteristics';
    navItem.className = 'sidebar-nav-item mp-nav-item';
    navItem.setAttribute('aria-label', 'Маркетплейси');
    navItem.innerHTML = `
        <span class="material-symbols-outlined">storefront</span>
        <span class="sidebar-nav-label">Маркетплейси${mappedMpChars.length ? ` (${mappedMpChars.length})` : ''}</span>
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
                    renderCurrentTab();
                }
            });
        });
    }

    initSectionNavigation('char-section-navigator');

    registerActionHandlers('mp-characteristic-mapping', {
        unmap: async (rowId, data) => {
            if (data.mappingId) {
                await deleteCharacteristicMapping(data.mappingId);
                showToast('Маппінг видалено', 'success');
                renderMappedMpCharacteristicsSections(ownCharId);
                renderCurrentTab();
            }
        }
    });

    initActionHandlers(content, 'mp-characteristic-mapping');
}

function renderMpCharacteristicsSectionContent(byMarketplace, totalCount) {
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
                            ${renderMpDataFields(data)}
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
                <h3>Прив'язані характеристики маркетплейсів</h3>
            </div>
            <div class="tab-controls">
                <button class="btn btn-outline btn-map-mp">
                    <span class="material-symbols-outlined">link</span>
                    <span>Замапити</span>
                </button>
            </div>
        </div>
        <div class="section-content">
            <div class="mp-items-list">
                ${cardsHtml || '<p class="u-text-muted u-p-16">Немає прив\'язок</p>'}
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

    try {
        const result = await autoMapCharacteristics(selectedIds);

        if (mapperState.selectedRows.characteristics) {
            mapperState.selectedRows.characteristics.clear();
        }
        const batchBar = getBatchBar('mapper-characteristics');
        if (batchBar) batchBar.deselectAll();

        await renderCurrentTab();

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
    const mapChars = mapperState.mapCharacteristics || [];
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
