// js/pages/mapper/mapper-characteristics.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - CHARACTERISTICS PLUGIN                       ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Характеристики: CRUD операції + модалки                     ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Управління власними характеристиками та маппінг MP характеристик.       ║
 * ║                                                                          ║
 * ║  БЛОКИ ХАРАКТЕРИСТИК (block_number):                                     ║
 * ║  Секція "Характеристики":                                                ║
 * ║    1 — Скільки цього?    (вага, порції, капсули, розмір)                  ║
 * ║    2 — Яке Це?           (вид, тип, матеріал, форма, склад)              ║
 * ║    3 — Кому це?          (стать, вік)                                    ║
 * ║    4 — Навіщо це?        (призначення, дія, особливості)                 ║
 * ║    5 — Звідки це?        (країна, коди, сертифікати, гарантія)           ║
 * ║    6 — Куди це?           (упаковка, габарити, доставка)                  ║
 * ║  Інші секції:                                                            ║
 * ║    8 — Варіант           (смак, колір, EAN варіанту)                     ║
 * ║    9 — Інше              (комплектація, системні поля)                   ║
 * ║  Детальніше: docs/CHARACTERISTICS-BLOCKS.md                              ║
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
    getCategories, getMarketplaces, getOptions, updateOption, addOption,
    getMpCharacteristics, getMappedMpCharacteristics,
    createCharacteristicMapping, batchCreateCharacteristicMapping, deleteCharacteristicMapping,
    autoMapCharacteristics,
    getMapCharacteristics, getCharacteristicDependencies
} from './mapper-data.js';
import { renderCurrentTab } from './mapper-table.js';
import { showModal, closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { showConfirmModal } from '../../components/modal/modal-main.js';
import { initCustomSelects, reinitializeCustomSelect } from '../../components/forms/select.js';
import { getBatchBar } from '../../components/actions/actions-batch.js';
import { escapeHtml } from '../../utils/utils-text.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import { initPaginationCharm } from '../../components/charms/pagination/pagination-main.js';
import { initSearchCharm } from '../../components/charms/charm-search.js';
import { initColumnsCharm } from '../../components/charms/charm-columns.js';
import {
    initSectionNavigation,
    createModalOverlay,
    closeModalOverlay,
    setupModalCloseHandlers,
    buildMpViewModal,
    showMapToMpModal,
    buildCascadeDetails
} from './mapper-utils.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';

export const PLUGIN_NAME = 'mapper-characteristics';

/**
 * Ініціалізація плагіна
 * Реєструє hooks та позначає плагін як завантажений
 */
export function init() {
    // Реєструємо hooks для комунікації з іншими модулями
    registerHook('onTabChange', handleTabChange, { plugin: 'characteristics' });
    registerHook('onDataLoaded', handleDataLoaded, { plugin: 'characteristics' });

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
        saveBtn.onclick = () => handleSaveNewCharacteristic(false);
    }

    const saveCloseBtn = document.getElementById('save-close-mapper-characteristic');
    if (saveCloseBtn) {
        saveCloseBtn.onclick = () => handleSaveNewCharacteristic(true);
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
        saveBtn.onclick = () => handleUpdateCharacteristic(id, false);
    }

    const saveCloseBtn = document.getElementById('save-close-mapper-characteristic');
    if (saveCloseBtn) {
        saveCloseBtn.onclick = () => handleUpdateCharacteristic(id, true);
    }
}

async function showDeleteCharacteristicConfirm(id) {
    const characteristics = getCharacteristics();
    const characteristic = characteristics.find(c => c.id === id);

    if (!characteristic) {
        showToast('Характеристику не знайдено', 'error');
        return;
    }

    // Каскадні попередження
    const deps = getCharacteristicDependencies(id);
    const items = [];
    if (deps.mappings > 0)
        items.push({ icon: 'link_off', text: `<strong>${deps.mappings}</strong> прив'язок до МП буде видалено` });
    if (deps.options > 0)
        items.push({ icon: 'circle', text: `<strong>${deps.options}</strong> опцій буде відв'язано` });

    const confirmed = await showConfirmModal({
        action: 'видалити',
        entity: 'характеристику',
        name: characteristic.name_ua,
        details: buildCascadeDetails(items)
    });

    if (confirmed) {
        try {
            await deleteCharacteristic(id);

            // Каскадне очищення: видалити маппінги
            const charMappings = getMapCharacteristics().filter(m => m.characteristic_id === id);
            for (const mapping of charMappings) {
                await deleteCharacteristicMapping(mapping.id);
            }

            // Каскадне очищення: відв'язати опції
            const orphanOptions = getOptions().filter(o => o.characteristic_id === id);
            for (const opt of orphanOptions) {
                await updateOption(opt.id, { characteristic_id: '' });
            }

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

async function handleSaveNewCharacteristic(shouldClose = true) {
    const data = getCharacteristicFormData();
    try {
        await addCharacteristic(data);
        showToast('Характеристику додано', 'success');
        if (shouldClose) closeModal();
        renderCurrentTab();
    } catch (error) {
        showToast('Помилка додавання характеристики', 'error');
    }
}

async function handleUpdateCharacteristic(id, shouldClose = true) {
    const data = getCharacteristicFormData();
    try {
        await updateCharacteristic(id, data);
        showToast('Характеристику оновлено', 'success');
        if (shouldClose) closeModal();
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
        category_ids: isGlobal === 'TRUE' ? '' : selectedCategories.join(','),
        sort_order: document.getElementById('mapper-char-sort-order')?.value || '',
        col_size: document.getElementById('mapper-char-col-size')?.value || '',
        hint: document.getElementById('mapper-char-hint')?.value.trim() || ''
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
    const sortOrderField = document.getElementById('mapper-char-sort-order');
    const colSizeField = document.getElementById('mapper-char-col-size');
    const hintField = document.getElementById('mapper-char-hint');

    if (nameUaField) nameUaField.value = characteristic.name_ua || characteristic.name_uk || '';
    if (nameRuField) nameRuField.value = characteristic.name_ru || '';
    if (unitField) unitField.value = characteristic.unit || '';
    if (sortOrderField) sortOrderField.value = characteristic.sort_order || '';
    if (hintField) hintField.value = characteristic.hint || '';

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
    if (colSizeField) {
        colSizeField.value = characteristic.col_size || '';
        reinitializeCustomSelect(colSizeField);
    }

    const isGlobal = characteristic.is_global === true ||
        String(characteristic.is_global).toLowerCase() === 'true';
    if (globalYes) globalYes.checked = isGlobal;
    if (globalNo) globalNo.checked = !isGlobal;

    toggleCategoriesField(isGlobal);
    updateCharGlobalDot(isGlobal);
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
    const sortOrderField = document.getElementById('mapper-char-sort-order');
    const colSizeField = document.getElementById('mapper-char-col-size');
    const hintField = document.getElementById('mapper-char-hint');

    if (nameUaField) nameUaField.value = '';
    if (nameRuField) nameRuField.value = '';
    if (unitField) unitField.value = '';
    if (sortOrderField) sortOrderField.value = '';
    if (hintField) hintField.value = '';
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
    if (colSizeField) {
        colSizeField.value = '';
        reinitializeCustomSelect(colSizeField);
    }

    if (categoriesSelect) {
        Array.from(categoriesSelect.options).forEach(opt => opt.selected = false);
        reinitializeCustomSelect(categoriesSelect);
    }

    toggleCategoriesField(false);
    updateCharGlobalDot(false);
}

function toggleCategoriesField(isGlobal) {
    const categoriesGroup = document.getElementById('mapper-char-categories')?.closest('.group.column');
    if (categoriesGroup) {
        categoriesGroup.style.display = isGlobal ? 'none' : '';
    }
}

function updateCharGlobalDot(isGlobal) {
    const dot = document.getElementById('char-global-dot');
    if (dot) {
        dot.classList.remove('c-green', 'c-red');
        dot.classList.add(isGlobal ? 'c-green' : 'c-red');
        dot.title = isGlobal ? 'Глобальна' : 'Категорійна';
    }
}

function initGlobalToggleHandler() {
    const globalYes = document.getElementById('mapper-char-global-yes');
    const globalNo = document.getElementById('mapper-char-global-no');
    if (!globalYes || globalYes.dataset.toggleInited) return;

    globalYes.addEventListener('change', () => {
        if (globalYes.checked) {
            toggleCategoriesField(true);
            updateCharGlobalDot(true);
        }
    });
    if (globalNo) {
        globalNo.addEventListener('change', () => {
            if (globalNo.checked) {
                toggleCategoriesField(false);
                updateCharGlobalDot(false);
            }
        });
    }
    globalYes.dataset.toggleInited = '1';
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
    if (!container) return;

    relatedOptionsTableAPI = null;
    container.innerHTML = renderAvatarState('empty', { message: "Опції з'являться після збереження", size: 'medium', containerClass: 'empty-state', avatarClass: 'empty-state-avatar', messageClass: 'avatar-state-message', showMessage: true });
    const searchInput = container._charmSearchInput;
    if (searchInput) searchInput.value = '';
}

function populateRelatedOptions(characteristicId) {
    if (!document.getElementById('char-related-options')) return;

    const loadData = () => getOptions().filter(opt => opt.characteristic_id === characteristicId);

    registerActionHandlers('characteristic-options', {
        edit: async (rowId) => {
            const { showEditOptionModal } = await import('./mapper-options.js');
            await showEditOptionModal(rowId);
        },
        unlink: async (rowId) => {
            const options = getOptions();
            const option = options.find(o => o.id === rowId);
            const optionName = option?.value_ua || rowId;

            const confirmed = await showConfirmModal({
                action: 'від\'язати',
                entity: 'опцію',
                name: optionName,
            });

            if (confirmed) {
                try {
                    await updateOption(rowId, { characteristic_id: '' });
                    showToast('Опцію відв\'язано', 'success');
                    managed.setData(loadData());
                } catch (error) {
                    console.error('❌ Помилка відв\'язування опції:', error);
                    showToast('Помилка відв\'язування опції', 'error');
                }
            }
        }
    });

    let charOptsCleanup = null;

    const managed = createManagedTable({
        container: 'char-related-options',
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
        data: loadData(),
        statsId: null,
        paginationId: null,
        tableConfig: {
            rowActionsHeader: ' ',
            rowActions: (row) => actionButton({ action: 'edit', rowId: row.id }),
            getRowId: (row) => row.id,
            emptyState: { message: 'Опції відсутні' },
            withContainer: false,
            onAfterRender: (cont) => {
                if (charOptsCleanup) charOptsCleanup();
                charOptsCleanup = initActionHandlers(cont, 'characteristic-options');
            },
            plugins: {
                sorting: { columnTypes: { id: 'id-text', value_ua: 'string' } }
            }
        },
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'char-opts'
    });

    initPaginationCharm();
    initSearchCharm();
    initColumnsCharm();

    // charm:refresh — оновити таблицю опцій
    const container = document.getElementById('char-related-options');
    if (container) {
        container.addEventListener('charm:refresh', () => {
            managed.setData(loadData());
        });
    }

    // Кнопка "Додати опцію"
    const addOptionBtn = document.getElementById('btn-add-char-option');
    if (addOptionBtn) {
        addOptionBtn.onclick = () => {
            showAddOptionToCharacteristicModal(characteristicId, () => managed.setData(loadData()));
        };
    }
}

/**
 * Inline модалка для швидкого додавання опції до характеристики
 * (без закриття основної модалки редагування)
 */
function showAddOptionToCharacteristicModal(characteristicId, onSuccess) {
    const modalHtml = `
        <div class="modal-overlay open">
            <div class="modal-container modal-small">
                <div class="modal-header">
                    <h2 class="modal-title">Додати опцію</h2>
                    <div class="group">
                        <button class="btn-icon modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="group column">
                        <label for="inline-option-value-ua">
                            Значення (UA) <span class="required">*</span>
                        </label>
                        <input type="text" id="inline-option-value-ua" class="input-main" placeholder="Значення українською" required>
                    </div>
                    <div class="group column">
                        <label for="inline-option-value-ru">Значення (RU)</label>
                        <input type="text" id="inline-option-value-ru" class="input-main" placeholder="Значення російською">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary modal-close-btn">Скасувати</button>
                    <button class="btn-primary" id="inline-option-confirm">
                        <span class="material-symbols-outlined">add</span>
                        <span>Додати</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    const modalOverlay = createModalOverlay(modalHtml);
    const cleanup = () => closeModalOverlay(modalOverlay);

    setupModalCloseHandlers(modalOverlay, cleanup);

    const confirmBtn = document.getElementById('inline-option-confirm');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const valueUa = document.getElementById('inline-option-value-ua')?.value.trim();
            const valueRu = document.getElementById('inline-option-value-ru')?.value.trim();

            if (!valueUa) {
                showToast('Введіть значення опції', 'error');
                return;
            }

            try {
                await addOption({
                    characteristic_id: characteristicId,
                    value_ua: valueUa,
                    value_ru: valueRu || '',
                    sort_order: '0'
                });
                showToast('Опцію додано', 'success');
                cleanup();
                if (onSuccess) onSuccess();
            } catch (error) {
                console.error('❌ Помилка додавання опції:', error);
                showToast('Помилка додавання опції', 'error');
            }
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MP СЕКЦІЇ
// ═══════════════════════════════════════════════════════════════════════════

function renderMappedMpCharacteristicsSections(ownCharId) {
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
                    renderCurrentTab();
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
                renderCurrentTab();
                showToast('Прив\'язку знято', 'success', undoData ? {
                    duration: 6000,
                    action: {
                        label: 'Відмінити',
                        onClick: async () => {
                            await createCharacteristicMapping(undoData.ownId, undoData.mpId);
                            renderMappedMpCharacteristicsSections(ownCharId);
                            renderCurrentTab();
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
 * Отримати назву MP характеристики
 */
function getMpCharacteristicLabel(mpChar) {
    if (!mpChar) return '';
    try {
        const data = typeof mpChar.data === 'string' ? JSON.parse(mpChar.data || '{}') : (mpChar.data || {});
        return extractMpName(data) || extractMpName(mpChar) || mpChar.external_id || mpChar.id;
    } catch {
        return extractMpName(mpChar) || mpChar.external_id || mpChar.id;
    }
}

/**
 * Показати модал прив'язок для власної характеристики
 * @param {string} ownCharId - ID власної характеристики
 * @param {string} ownCharName - Назва для заголовка
 */
export async function showBindingsModal(ownCharId, ownCharName) {
    const MODAL_ID = 'mapper-bindings';

    await showModal(MODAL_ID);

    const modalEl = document.getElementById(`modal-${MODAL_ID}`);
    if (!modalEl) return;

    const titleEl = modalEl.querySelector('#bindings-modal-title');
    if (titleEl) titleEl.textContent = `Прив'язки: ${ownCharName || ownCharId}`;

    const rowsContainer = modalEl.querySelector('#bindings-modal-rows');
    if (!rowsContainer) return;

    modalEl.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = () => {
            closeModal(MODAL_ID);
            renderCurrentTab();
        };
    });

    renderBindingsRows(ownCharId, rowsContainer);
}

/**
 * Рендерити рядки прив'язок характеристик
 */
function renderBindingsRows(ownCharId, container) {
    const marketplaces = getMarketplaces().filter(m =>
        m.is_active === true || String(m.is_active).toLowerCase() === 'true'
    );
    const allMpChars = getMpCharacteristics();
    const mappedChars = getMappedMpCharacteristics(ownCharId);

    let html = '';

    // Існуючі прив'язки
    mappedChars.forEach(mpChar => {
        const mp = marketplaces.find(m => m.id === mpChar.marketplace_id);
        const mpName = mp?.name || mpChar.marketplace_id;
        const charLabel = getMpCharacteristicLabel(mpChar);
        const mappingId = mpChar._mappingId || '';

        html += `
            <div class="binding-row" data-mapping-id="${escapeHtml(mappingId)}">
                <div class="binding-field">
                    <select disabled>
                        <option selected>${escapeHtml(mpName)}</option>
                    </select>
                </div>
                <div class="binding-field binding-field-grow">
                    <select disabled>
                        <option selected>${escapeHtml(charLabel)}</option>
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
                <select class="binding-char-select" data-custom-select disabled>
                    <option value="">Характеристика МП</option>
                </select>
            </div>
            <div class="binding-placeholder"></div>
        </div>
    `;

    container.innerHTML = html;
    initCustomSelects(container);

    // Обробник вибору маркетплейсу
    const mpSelect = container.querySelector('.binding-row-new .binding-mp-select');
    const charSelect = container.querySelector('.binding-row-new .binding-char-select');

    if (mpSelect) {
        mpSelect.onchange = () => {
            const mpId = mpSelect.value;
            if (!mpId) {
                charSelect.innerHTML = '<option value="">Характеристика МП</option>';
                charSelect.disabled = true;
                reinitializeCustomSelect(charSelect);
                return;
            }

            const mpChars = allMpChars.filter(c => c.marketplace_id === mpId);
            charSelect.disabled = false;
            charSelect.innerHTML = '<option value="">Характеристика МП</option>';
            mpChars.forEach(c => {
                const label = getMpCharacteristicLabel(c);
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `#${c.external_id} — ${label}`;
                charSelect.appendChild(opt);
            });
            reinitializeCustomSelect(charSelect);
        };
    }

    // Обробник вибору характеристики → авто-збереження
    if (charSelect) {
        charSelect.onchange = async () => {
            const mpCharId = charSelect.value;
            if (!mpCharId) return;

            charSelect.disabled = true;
            try {
                await createCharacteristicMapping(ownCharId, mpCharId);
                showToast('Прив\'язку створено', 'success');
                renderBindingsRows(ownCharId, container);
            } catch (err) {
                showToast('Помилка створення прив\'язки', 'error');
                charSelect.disabled = false;
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
                const mapping = getMapCharacteristics().find(m => m.id === mappingId);
                const undoData = mapping ? { ownId: mapping.characteristic_id, mpId: mapping.mp_characteristic_id } : null;
                await deleteCharacteristicMapping(mappingId);
                renderBindingsRows(ownCharId, container);
                showToast('Прив\'язку знято', 'success', undoData ? {
                    duration: 6000,
                    action: {
                        label: 'Відмінити',
                        onClick: async () => {
                            await createCharacteristicMapping(undoData.ownId, undoData.mpId);
                            renderBindingsRows(ownCharId, container);
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
