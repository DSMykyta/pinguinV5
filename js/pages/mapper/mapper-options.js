// js/pages/mapper/mapper-options.js

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
    createOptionMapping, batchCreateOptionMapping, deleteOptionMapping,
    autoMapOptions,
    getMapOptions, getOptionDependencies
} from './mapper-data.js';
import { renderCurrentTab } from './mapper-table.js';
import { showModal, closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { showConfirmModal } from '../../components/modal/modal-main.js';
import { initCustomSelects, reinitializeCustomSelect } from '../../components/forms/select.js';
import { getBatchBar } from '../../components/actions/actions-batch.js';
import { escapeHtml } from '../../utils/text-utils.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';
import {
    initSectionNavigation,
    createModalOverlay,
    closeModalOverlay,
    setupModalCloseHandlers,
    buildMpViewModal,
    showMapToMpModal,
    buildCascadeDetails
} from './mapper-utils.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import { initPaginationCharm } from '../../components/charms/pagination/pagination-main.js';
import { initSearchCharm } from '../../components/charms/charm-search.js';
import { initColumnsCharm } from '../../components/charms/charm-columns.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';

export const PLUGIN_NAME = 'mapper-options';

/**
 * Ініціалізація плагіна
 * Реєструє hooks та позначає плагін як завантажений
 */
export function init() {
    // Реєструємо hooks для комунікації з іншими модулями
    registerHook('onTabChange', handleTabChange, { plugin: 'options' });
    registerHook('onDataLoaded', handleDataLoaded, { plugin: 'options' });

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
        saveBtn.onclick = () => handleSaveNewOption(false);
    }

    const saveCloseBtn = document.getElementById('save-close-mapper-option');
    if (saveCloseBtn) {
        saveCloseBtn.onclick = () => handleSaveNewOption(true);
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
        saveBtn.onclick = () => handleUpdateOption(id, false);
    }

    const saveCloseBtn = document.getElementById('save-close-mapper-option');
    if (saveCloseBtn) {
        saveCloseBtn.onclick = () => handleUpdateOption(id, true);
    }
}

async function showDeleteOptionConfirm(id) {
    const options = getOptions();
    const option = options.find(o => o.id === id);

    if (!option) {
        showToast('Опцію не знайдено', 'error');
        return;
    }

    // Каскадні попередження
    const deps = getOptionDependencies(id);
    const items = [];
    if (deps.mappings > 0)
        items.push({ icon: 'link_off', text: `<strong>${deps.mappings}</strong> прив'язок до МП буде видалено` });
    if (deps.children > 0)
        items.push({ icon: 'circle', text: `<strong>${deps.children}</strong> дочірніх опцій буде відв'язано` });

    const confirmed = await showConfirmModal({
        action: 'видалити',
        entity: 'опцію',
        name: option.value_ua,
        details: buildCascadeDetails(items)
    });

    if (confirmed) {
        try {
            await deleteOption(id);

            // Каскадне очищення: видалити маппінги
            const optMappings = getMapOptions().filter(m => m.option_id === id);
            for (const mapping of optMappings) {
                await deleteOptionMapping(mapping.id);
            }

            // Каскадне очищення: відв'язати дочірні опції
            const children = getOptions().filter(o => o.parent_option_id === id);
            for (const child of children) {
                await updateOption(child.id, { parent_option_id: '' });
            }

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

async function handleSaveNewOption(shouldClose = true) {
    const data = getOptionFormData();
    try {
        await addOption(data);
        showToast('Опцію додано', 'success');
        if (shouldClose) closeModal();
        renderCurrentTab();
    } catch (error) {
        showToast('Помилка додавання опції', 'error');
    }
}

async function handleUpdateOption(id, shouldClose = true) {
    const data = getOptionFormData();
    try {
        await updateOption(id, data);
        showToast('Опцію оновлено', 'success');
        if (shouldClose) closeModal();
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
 * Формат: {характеристика} | {Опція}
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

    options.forEach(opt => {
        if (!opt.characteristic_id) return;
        const char = charMap.get(opt.characteristic_id);
        const charName = char ? (char.name_ua || opt.characteristic_id) : opt.characteristic_id;
        const optValue = opt.value_ua || opt.id;

        const option = document.createElement('option');
        option.value = opt.id;
        option.textContent = `${charName} | ${optValue}`;
        if (selectedId && opt.id === selectedId) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    reinitializeCustomSelect(select);
}

// ═══════════════════════════════════════════════════════════════════════════
// ПОВ'ЯЗАНІ ЕЛЕМЕНТИ
// ═══════════════════════════════════════════════════════════════════════════

function populateRelatedChildOptions(optionId) {
    if (!document.getElementById('option-related-chars')) return;

    const navItem = document.getElementById('nav-option-dependent');
    const section = document.getElementById('section-option-dependent');

    const loadData = () => getOptions().filter(opt => opt.parent_option_id === optionId);
    let initialData = loadData();

    // Приховуємо/показуємо секцію залежно від наявності дочірніх опцій
    const updateVisibility = (data) => {
        if (data.length === 0) {
            navItem?.classList.add('u-hidden');
            section?.classList.add('u-hidden');
        } else {
            navItem?.classList.remove('u-hidden');
            section?.classList.remove('u-hidden');
        }
    };

    updateVisibility(initialData);
    if (initialData.length === 0) {
        return;
    }

    registerActionHandlers('option-child-options', {
        edit: async (rowId) => {
            await showEditOptionModal(rowId);
        },
        unlink: async (rowId, data) => {
            const confirmed = await showConfirmModal({
                action: 'від\'язати',
                entity: 'дочірню опцію',
                name: data.name,
            });

            if (confirmed) {
                try {
                    await updateOption(rowId, { parent_option_id: '' });
                    showToast('Опцію відв\'язано', 'success');
                    const newData = loadData();
                    updateVisibility(newData);
                    managed.setData(newData);
                } catch (error) {
                    console.error('❌ Помилка відв\'язування опції:', error);
                    showToast('Помилка відв\'язування опції', 'error');
                }
            }
        }
    });

    let optChildCleanup = null;

    const managed = createManagedTable({
        container: 'option-related-chars',
        columns: [
            { ...col('id', 'ID', 'tag'), searchable: true },
            { ...col('value_ua', 'Значення', 'name', { span: 5 }), searchable: true },
            { ...col('value_ru', 'Назва (RU)', 'text', { span: 3 }), searchable: true, checked: true },
            col('action', ' ', 'action', {
                render: (value, row) => actionButton({
                    action: 'unlink', rowId: row.id,
                    data: { name: row.value_ua || row.id }
                })
            })
        ],
        data: initialData,
        statsId: null,
        paginationId: null,
        tableConfig: {
            rowActionsHeader: ' ',
            rowActions: (row) => actionButton({ action: 'edit', rowId: row.id }),
            getRowId: (row) => row.id,
            emptyState: { message: 'Дочірні опції відсутні' },
            withContainer: false,
            onAfterRender: (cont) => {
                if (optChildCleanup) optChildCleanup();
                optChildCleanup = initActionHandlers(cont, 'option-child-options');
            },
            plugins: {
                sorting: { columnTypes: { id: 'id-text', value_ua: 'string' } }
            }
        },
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'opt-chars'
    });

    initPaginationCharm();
    initSearchCharm();
    initColumnsCharm();

    // charm:refresh — оновити таблицю дочірніх опцій
    const container = document.getElementById('option-related-chars');
    if (container) {
        container.addEventListener('charm:refresh', () => {
            const newData = loadData();
            updateVisibility(newData);
            managed.setData(newData);
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MP СЕКЦІЇ
// ═══════════════════════════════════════════════════════════════════════════

function renderMappedMpOptionsSections(ownOptionId) {
    const nav = document.getElementById('option-section-navigator');
    const content = nav?.closest('.modal-fullscreen-container')?.querySelector('.modal-fullscreen-content');
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
    navItem.className = 'btn-icon expand touch mp-nav-item';
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
                    renderCurrentTab();
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
                    renderCurrentTab();
                    showToast('Прив\'язку знято', 'success', undoData ? {
                        duration: 6000,
                        action: {
                            label: 'Відмінити',
                            onClick: async () => {
                                await createOptionMapping(undoData.ownId, undoData.mpId);
                                renderMappedMpOptionsSections(ownOptionId);
                                renderCurrentTab();
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
        <div class="modal-overlay open">
            <div class="modal-container modal-medium">
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
        mappedToName
    });

    const modalOverlay = createModalOverlay(modalHtml);
    setupModalCloseHandlers(modalOverlay, () => closeModalOverlay(modalOverlay));
}

// ═══════════════════════════════════════════════════════════════════════════
// МОДАЛ ПРИВ'ЯЗОК (BINDINGS MODAL)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Витягнути назву з об'єкта MP
 */
function extractMpName(obj) {
    if (!obj || typeof obj !== 'object') return '';
    if (obj.name_ua) return obj.name_ua;
    if (obj.nameUa) return obj.nameUa;
    if (obj.titleUk) return obj.titleUk;
    if (obj.titleRu) return obj.titleRu;
    if (obj.name) return obj.name;
    if (obj.name_ru) return obj.name_ru;
    if (obj.nameRu) return obj.nameRu;
    const nameKey = Object.keys(obj).find(k => {
        const lower = k.toLowerCase();
        return lower.includes('name') || lower.includes('title');
    });
    return nameKey ? obj[nameKey] : '';
}

/**
 * Отримати назву MP опції
 */
function getMpOptionLabel(mpOption) {
    if (!mpOption) return '';
    try {
        const data = typeof mpOption.data === 'string' ? JSON.parse(mpOption.data || '{}') : (mpOption.data || {});
        return extractMpName(data) || extractMpName(mpOption) || mpOption.external_id || mpOption.id;
    } catch {
        return extractMpName(mpOption) || mpOption.external_id || mpOption.id;
    }
}

/**
 * Показати модал прив'язок для власної опції
 * @param {string} ownOptionId - ID власної опції
 * @param {string} ownOptionName - Назва для заголовка
 */
export async function showBindingsModal(ownOptionId, ownOptionName) {
    const MODAL_ID = 'mapper-bindings';

    await showModal(MODAL_ID);

    const modalEl = document.getElementById(`modal-${MODAL_ID}`);
    if (!modalEl) return;

    const titleEl = modalEl.querySelector('#bindings-modal-title');
    if (titleEl) titleEl.textContent = `Прив'язки: ${ownOptionName || ownOptionId}`;

    const rowsContainer = modalEl.querySelector('#bindings-modal-rows');
    if (!rowsContainer) return;

    modalEl.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = () => {
            closeModal(MODAL_ID);
            renderCurrentTab();
        };
    });

    renderBindingsRows(ownOptionId, rowsContainer);
}

/**
 * Рендерити рядки прив'язок опцій
 */
function renderBindingsRows(ownOptionId, container) {
    const marketplaces = getMarketplaces().filter(m =>
        m.is_active === true || String(m.is_active).toLowerCase() === 'true'
    );
    const allMpOpts = getMpOptions();
    const mappedOpts = getMappedMpOptions(ownOptionId);

    let html = '';

    // Існуючі прів'язки
    mappedOpts.forEach(mpOpt => {
        const mp = marketplaces.find(m => m.id === mpOpt.marketplace_id);
        const mpName = mp?.name || mpOpt.marketplace_id;
        const optLabel = getMpOptionLabel(mpOpt);
        const mappingId = mpOpt._mappingId || '';

        html += `
            <div class="binding-row" data-mapping-id="${escapeHtml(mappingId)}">
                <div class="binding-field">
                    <select disabled>
                        <option selected>${escapeHtml(mpName)}</option>
                    </select>
                </div>
                <div class="binding-field binding-field-grow">
                    <select disabled>
                        <option selected>${escapeHtml(optLabel)}</option>
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
                <select class="binding-opt-select" data-custom-select disabled>
                    <option value="">Опція МП</option>
                </select>
            </div>
            <div class="binding-placeholder"></div>
        </div>
    `;

    container.innerHTML = html;
    initCustomSelects(container);

    // Обробник вибору маркетплейсу
    const mpSelect = container.querySelector('.binding-row-new .binding-mp-select');
    const optSelect = container.querySelector('.binding-row-new .binding-opt-select');

    if (mpSelect) {
        mpSelect.onchange = () => {
            const mpId = mpSelect.value;
            if (!mpId) {
                optSelect.innerHTML = '<option value="">Опція МП</option>';
                optSelect.disabled = true;
                reinitializeCustomSelect(optSelect);
                return;
            }

            const mpOpts = allMpOpts.filter(o => o.marketplace_id === mpId);
            optSelect.disabled = false;
            optSelect.innerHTML = '<option value="">Опція МП</option>';
            mpOpts.forEach(o => {
                const label = getMpOptionLabel(o);
                const opt = document.createElement('option');
                opt.value = o.id;
                opt.textContent = `#${o.external_id} — ${label}`;
                optSelect.appendChild(opt);
            });
            reinitializeCustomSelect(optSelect);
        };
    }

    // Обробник вибору опції → авто-збереження
    if (optSelect) {
        optSelect.onchange = async () => {
            const mpOptionId = optSelect.value;
            if (!mpOptionId) return;

            optSelect.disabled = true;
            try {
                await createOptionMapping(ownOptionId, mpOptionId);
                showToast('Прив\'язку створено', 'success');
                renderBindingsRows(ownOptionId, container);
            } catch (err) {
                showToast('Помилка створення прив\'язки', 'error');
                optSelect.disabled = false;
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
                const mapping = getMapOptions().find(m => m.id === mappingId);
                const undoData = mapping ? { ownId: mapping.option_id, mpId: mapping.mp_option_id } : null;
                await deleteOptionMapping(mappingId);
                renderBindingsRows(ownOptionId, container);
                showToast('Прив\'язку знято', 'success', undoData ? {
                    duration: 6000,
                    action: {
                        label: 'Відмінити',
                        onClick: async () => {
                            await createOptionMapping(undoData.ownId, undoData.mpId);
                            renderBindingsRows(ownOptionId, container);
                        }
                    }
                } : 3000);
            } catch (err) {
                showToast('Помилка видалення', 'error');
                btn.disabled = false;
            }
        };
    });
}
