// js/mapper/mapper-marketplaces.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - MARKETPLACES PLUGIN                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Маркетплейси: CRUD операції + модалки + перегляд даних      ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Управління маркетплейсами та перегляд їх даних (категорії, харак-ки).   ║
 * ║                                                                          ║
 * ║  ЕКСПОРТОВАНІ ФУНКЦІЇ:                                                   ║
 * ║  - init() — Ініціалізація плагіна (реєстрація hooks)                     ║
 * ║  - showAddMarketplaceModal() — Модалка додавання                         ║
 * ║  - showEditMarketplaceModal(id) — Модалка редагування + дані             ║
 * ║  - showMarketplaceDataModal(id) — Alias → showEditMarketplaceModal       ║
 * ║                                                                          ║
 * ║  ЗАЛЕЖНОСТІ:                                                             ║
 * ║  - mapper-state.js (state, hooks)                                        ║
 * ║  - mapper-data.js (API операції)                                         ║
 * ║  - mapper-table.js (рендеринг)                                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { mapperState, registerHook, markPluginLoaded, runHook } from './mapper-state.js';
import {
    addMarketplace, updateMarketplace, deleteMarketplace, getMarketplaces,
    getCategories, getCharacteristics, getOptions,
    getMpCategories, getMpCharacteristics, getMpOptions,
    loadMpCategories, loadMpCharacteristics, loadMpOptions,
    createCategoryMapping, deleteCategoryMapping, getMapCategories,
    createCharacteristicMapping, deleteCharacteristicMapping,
    getCharacteristicMappingByMpId,
    createOptionMapping, deleteOptionMapping,
    getOptionMappingByMpId,
    deleteCategoryMappingByMpId, deleteCharacteristicMappingByMpId, deleteOptionMappingByMpId,
    getMarketplaceDependencies
} from './mapper-data.js';
import { renderCurrentTab } from './mapper-table.js';
import { initSectionNavigation, buildCascadeDetails } from './mapper-utils.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { showConfirmModal } from '../common/ui-modal-confirm.js';
import { escapeHtml } from '../utils/text-utils.js';
import { renderAvatarState } from '../common/avatar/avatar-ui-states.js';
import { renderTable as renderTableLego, col } from '../common/table/table-main.js';
import { filterData as applyColumnFilters } from '../common/table/table-filters.js';
import { initPagination } from '../common/ui-pagination.js';
import { listReferenceFiles, deleteReferenceFile } from '../utils/api-client.js';
import { createBatchActionsBar, getBatchBar } from '../common/ui-batch-actions.js';

export const PLUGIN_NAME = 'mapper-marketplaces';

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
    if (newTab === 'marketplaces') {
        // Таб маркетплейсів активовано
    }
}

/**
 * Обробник завантаження даних
 */
function handleDataLoaded() {
    // Оновити залежні дані якщо потрібно
}

// ═══════════════════════════════════════════════════════════════════════════
// ЄДИНА МОДАЛКА МАРКЕТПЛЕЙСУ (fullscreen)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модалку для додавання маркетплейсу
 */
export async function showAddMarketplaceModal() {
    await showModal('mapper-mp-data', null);
    await new Promise(resolve => requestAnimationFrame(resolve));

    const title = document.getElementById('mp-data-modal-title');
    if (title) title.textContent = 'Додати маркетплейс';

    const deleteBtn = document.getElementById('delete-mapper-marketplace');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    clearMarketplaceForm();
    initMpStatusToggle();

    const saveBtn = document.getElementById('save-mapper-marketplace');
    if (saveBtn) saveBtn.onclick = handleSaveNewMarketplace;

    initSectionNavigation('mp-data-section-navigator');
}

/**
 * Показати модалку для редагування / перегляду маркетплейсу
 */
export async function showEditMarketplaceModal(id) {
    const marketplaces = getMarketplaces();
    const marketplace = marketplaces.find(m => m.id === id);

    if (!marketplace) {
        showToast('Маркетплейс не знайдено', 'error');
        return;
    }

    await showModal('mapper-mp-data', null);
    await new Promise(resolve => requestAnimationFrame(resolve));

    const title = document.getElementById('mp-data-modal-title');
    if (title) title.textContent = marketplace.name;

    // Кнопка видалення
    const deleteBtn = document.getElementById('delete-mapper-marketplace');
    if (deleteBtn) {
        deleteBtn.classList.remove('u-hidden');
        deleteBtn.onclick = () => {
            closeModal();
            showDeleteMarketplaceConfirm(id);
        };
    }

    // Заповнити форму
    fillMarketplaceForm(marketplace);
    initMpStatusToggle();

    // Кнопка збереження
    const saveBtn = document.getElementById('save-mapper-marketplace');
    if (saveBtn) saveBtn.onclick = () => handleUpdateMarketplace(id);

    // Завантажити дані
    if (getMpCategories().length === 0) await loadMpCategories();
    if (getMpCharacteristics().length === 0) await loadMpCharacteristics();
    if (getMpOptions().length === 0) await loadMpOptions();

    const categories = getMpCategories().filter(c => c.marketplace_id === id);
    const characteristics = getMpCharacteristics().filter(c => c.marketplace_id === id);
    const options = getMpOptions().filter(o => o.marketplace_id === id);

    // Оновити лічильники в sidebar
    const catCount = document.getElementById('mp-data-cat-count');
    const charCount = document.getElementById('mp-data-char-count');
    const optCount = document.getElementById('mp-data-opt-count');
    if (catCount) catCount.textContent = categories.length;
    if (charCount) charCount.textContent = characteristics.length;
    if (optCount) optCount.textContent = options.length;

    // Ініціалізувати scroll-snap навігацію
    initSectionNavigation('mp-data-section-navigator');

    // Парсити column_mapping маркетплейсу
    let columnMapping = {};
    try { columnMapping = JSON.parse(marketplace.column_mapping || '{}'); }
    catch { columnMapping = {}; }

    // Заповнити кожну секцію незалежно
    populateMpCategories(categories, columnMapping.categories);
    populateMpCharacteristics(characteristics, columnMapping.characteristics);
    populateMpOptions(options, columnMapping.options);

    // Довідники (файли на Google Drive)
    populateMpReferences(marketplace.slug);

    // Refresh кнопки
    const refreshCatsBtn = document.getElementById('refresh-mp-data-cats');
    if (refreshCatsBtn) {
        refreshCatsBtn.onclick = async () => {
            const icon = refreshCatsBtn.querySelector('.material-symbols-outlined');
            icon?.classList.add('is-spinning');
            try {
                await loadMpCategories();
                const freshCats = getMpCategories().filter(c => c.marketplace_id === id);
                if (catCount) catCount.textContent = freshCats.length;
                populateMpCategories(freshCats, columnMapping.categories);
            } finally { icon?.classList.remove('is-spinning'); }
        };
    }

    const refreshCharsBtn = document.getElementById('refresh-mp-data-chars');
    if (refreshCharsBtn) {
        refreshCharsBtn.onclick = async () => {
            const icon = refreshCharsBtn.querySelector('.material-symbols-outlined');
            icon?.classList.add('is-spinning');
            try {
                await loadMpCharacteristics();
                const freshChars = getMpCharacteristics().filter(c => c.marketplace_id === id);
                if (charCount) charCount.textContent = freshChars.length;
                populateMpCharacteristics(freshChars, columnMapping.characteristics);
            } finally { icon?.classList.remove('is-spinning'); }
        };
    }

    const refreshOptsBtn = document.getElementById('refresh-mp-data-opts');
    if (refreshOptsBtn) {
        refreshOptsBtn.onclick = async () => {
            const icon = refreshOptsBtn.querySelector('.material-symbols-outlined');
            icon?.classList.add('is-spinning');
            try {
                await loadMpOptions();
                const freshOpts = getMpOptions().filter(o => o.marketplace_id === id);
                if (optCount) optCount.textContent = freshOpts.length;
                populateMpOptions(freshOpts, columnMapping.options);
            } finally { icon?.classList.remove('is-spinning'); }
        };
    }

    const refreshRefsBtn = document.getElementById('refresh-mp-data-refs');
    if (refreshRefsBtn) {
        refreshRefsBtn.onclick = async () => {
            const icon = refreshRefsBtn.querySelector('.material-symbols-outlined');
            icon?.classList.add('is-spinning');
            try {
                await populateMpReferences(marketplace.slug);
            } finally { icon?.classList.remove('is-spinning'); }
        };
    }
}

/**
 * Alias для зворотної сумісності (view = edit)
 */
export const showMarketplaceDataModal = showEditMarketplaceModal;

async function showDeleteMarketplaceConfirm(id) {
    const marketplaces = getMarketplaces();
    const marketplace = marketplaces.find(m => m.id === id);

    if (!marketplace) {
        showToast('Маркетплейс не знайдено', 'error');
        return;
    }

    // Каскадні попередження
    const deps = getMarketplaceDependencies(id);
    const items = [];
    if (deps.mpCategories > 0)
        items.push({ icon: 'square', text: `<strong>${deps.mpCategories}</strong> категорій МП` });
    if (deps.mpCharacteristics > 0)
        items.push({ icon: 'change_history', text: `<strong>${deps.mpCharacteristics}</strong> характеристик МП` });
    if (deps.mpOptions > 0)
        items.push({ icon: 'circle', text: `<strong>${deps.mpOptions}</strong> опцій МП` });
    if (deps.totalMappings > 0)
        items.push({ icon: 'link_off', text: `<strong>${deps.totalMappings}</strong> прив'язок буде видалено` });

    const confirmed = await showConfirmModal({
        title: 'Видалити маркетплейс?',
        message: `Ви впевнені, що хочете видалити маркетплейс "${marketplace.name}"?`,
        confirmText: 'Видалити',
        cancelText: 'Скасувати',
        confirmClass: 'btn-delete',
        details: buildCascadeDetails(items)
    });

    if (confirmed) {
        try {
            // Каскадне очищення: видалити маппінги MP-сутностей
            const mpCats = getMpCategories().filter(c => c.marketplace_id === id);
            const mpChars = getMpCharacteristics().filter(c => c.marketplace_id === id);
            const mpOpts = getMpOptions().filter(o => o.marketplace_id === id);

            for (const mpCat of mpCats) {
                await deleteCategoryMappingByMpId(mpCat.id);
            }
            for (const mpChar of mpChars) {
                await deleteCharacteristicMappingByMpId(mpChar.id);
            }
            for (const mpOpt of mpOpts) {
                await deleteOptionMappingByMpId(mpOpt.id);
            }

            await deleteMarketplace(id);
            showToast('Маркетплейс видалено', 'success');
            renderCurrentTab();
        } catch (error) {
            showToast('Помилка видалення маркетплейсу', 'error');
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ФОРМА
// ═══════════════════════════════════════════════════════════════════════════

async function handleSaveNewMarketplace() {
    const data = getMarketplaceFormData();

    if (!data.name) {
        showToast('Введіть назву маркетплейсу', 'error');
        return;
    }

    if (!data.slug) {
        showToast('Введіть slug маркетплейсу', 'error');
        return;
    }

    try {
        await addMarketplace(data);
        showToast('Маркетплейс додано', 'success');
        closeModal();
        renderCurrentTab();
    } catch (error) {
        showToast('Помилка додавання маркетплейсу', 'error');
    }
}

async function handleUpdateMarketplace(id) {
    const data = getMarketplaceFormData();

    if (!data.name) {
        showToast('Введіть назву маркетплейсу', 'error');
        return;
    }

    try {
        await updateMarketplace(id, data);
        showToast('Маркетплейс оновлено', 'success');
        closeModal();
        renderCurrentTab();
    } catch (error) {
        showToast('Помилка оновлення маркетплейсу', 'error');
    }
}

function getMarketplaceFormData() {
    const activeYes = document.getElementById('mapper-mp-active-yes');
    const isActive = activeYes?.checked ?? true;

    return {
        name: document.getElementById('mapper-mp-name')?.value.trim() || '',
        slug: document.getElementById('mapper-mp-slug')?.value.trim() || '',
        is_active: isActive,
        column_mapping: JSON.stringify(buildColumnMappingFromForm())
    };
}

/**
 * Зібрати column_mapping з полів нормалізації у формі
 */
function buildColumnMappingFromForm() {
    const v = (id) => document.getElementById(id)?.value.trim() || '';

    const categories = {};
    if (v('mapper-mp-cm-cat-name'))   categories.name = v('mapper-mp-cm-cat-name');
    if (v('mapper-mp-cm-cat-parent')) categories.parent_id = v('mapper-mp-cm-cat-parent');

    const characteristics = {};
    if (v('mapper-mp-cm-char-name')) characteristics.name = v('mapper-mp-cm-char-name');
    if (v('mapper-mp-cm-char-type')) characteristics.type = v('mapper-mp-cm-char-type');

    const options = {};
    if (v('mapper-mp-cm-opt-name'))      options.name = v('mapper-mp-cm-opt-name');
    if (v('mapper-mp-cm-opt-char-id'))   options.char_id = v('mapper-mp-cm-opt-char-id');
    if (v('mapper-mp-cm-opt-char-name')) options.char_name = v('mapper-mp-cm-opt-char-name');

    const result = {};
    if (Object.keys(categories).length)      result.categories = categories;
    if (Object.keys(characteristics).length) result.characteristics = characteristics;
    if (Object.keys(options).length)         result.options = options;
    return result;
}

function updateMpStatusDot(isActive) {
    const dot = document.getElementById('mp-data-status-dot');
    if (dot) {
        dot.classList.remove('is-success', 'is-error');
        dot.classList.add(isActive ? 'is-success' : 'is-error');
        dot.title = isActive ? 'Активний' : 'Неактивний';
    }
}

function initMpStatusToggle() {
    const activeYes = document.getElementById('mapper-mp-active-yes');
    const activeNo = document.getElementById('mapper-mp-active-no');
    if (!activeYes || activeYes.dataset.toggleInited) return;
    activeYes.addEventListener('change', () => updateMpStatusDot(true));
    if (activeNo) activeNo.addEventListener('change', () => updateMpStatusDot(false));
    activeYes.dataset.toggleInited = '1';
}

function fillMarketplaceForm(marketplace) {
    const nameField = document.getElementById('mapper-mp-name');
    const slugField = document.getElementById('mapper-mp-slug');
    const activeYes = document.getElementById('mapper-mp-active-yes');
    const activeNo = document.getElementById('mapper-mp-active-no');

    if (nameField) nameField.value = marketplace.name || '';
    if (slugField) slugField.value = marketplace.slug || '';

    const isActive = marketplace.is_active === true || String(marketplace.is_active).toLowerCase() === 'true';
    if (activeYes) activeYes.checked = isActive;
    if (activeNo) activeNo.checked = !isActive;
    updateMpStatusDot(isActive);

    fillColumnMappingForm(marketplace.column_mapping);
}

/**
 * Заповнити поля нормалізації зі збереженого column_mapping
 */
function fillColumnMappingForm(rawMapping) {
    let cm = {};
    try { cm = JSON.parse(typeof rawMapping === 'string' ? rawMapping || '{}' : '{}'); }
    catch { cm = {}; }
    if (typeof rawMapping === 'object' && rawMapping !== null) cm = rawMapping;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

    set('mapper-mp-cm-cat-name',      cm.categories?.name);
    set('mapper-mp-cm-cat-parent',    cm.categories?.parent_id);
    set('mapper-mp-cm-char-name',     cm.characteristics?.name);
    set('mapper-mp-cm-char-type',     cm.characteristics?.type);
    set('mapper-mp-cm-opt-name',      cm.options?.name);
    set('mapper-mp-cm-opt-char-id',   cm.options?.char_id);
    set('mapper-mp-cm-opt-char-name', cm.options?.char_name);
}

function clearMarketplaceForm() {
    const nameField = document.getElementById('mapper-mp-name');
    const slugField = document.getElementById('mapper-mp-slug');
    const activeYes = document.getElementById('mapper-mp-active-yes');
    const activeNo = document.getElementById('mapper-mp-active-no');

    if (nameField) nameField.value = '';
    if (slugField) slugField.value = '';
    if (activeYes) activeYes.checked = true;
    if (activeNo) activeNo.checked = false;
    updateMpStatusDot(true);

    // Очистити поля нормалізації
    ['mapper-mp-cm-cat-name', 'mapper-mp-cm-cat-parent',
     'mapper-mp-cm-char-name', 'mapper-mp-cm-char-type',
     'mapper-mp-cm-opt-name', 'mapper-mp-cm-opt-char-id',
     'mapper-mp-cm-opt-char-name'
    ].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

// ═══════════════════════════════════════════════════════════════════════════
// СЕКЦІЯ: ДОВІДНИКИ (файли на Google Drive)
// ═══════════════════════════════════════════════════════════════════════════

async function populateMpReferences(slug) {
    const container = document.getElementById('mp-data-ref-container');
    const statsEl = document.getElementById('mp-data-ref-stats');
    const countEl = document.getElementById('mp-data-ref-count');
    const searchInput = document.getElementById('mp-data-ref-search');
    const paginationEl = document.getElementById('mp-data-ref-pagination');
    if (!container) return;

    container.innerHTML = renderAvatarState('loading', {
        message: 'Завантаження...', size: 'small',
        containerClass: 'empty-state-container', avatarClass: 'empty-state-avatar',
        messageClass: 'avatar-state-message', showMessage: true
    });

    let allFiles = [];
    try {
        allFiles = await listReferenceFiles(slug);
    } catch (err) {
        console.error('Failed to load reference files:', err);
        container.innerHTML = renderAvatarState('error', {
            message: 'Помилка завантаження файлів', size: 'small',
            containerClass: 'empty-state-container', avatarClass: 'empty-state-avatar',
            messageClass: 'avatar-state-message', showMessage: true
        });
        return;
    }

    if (countEl) countEl.textContent = allFiles.length;

    // Підготувати дані
    const allData = allFiles.map(f => {
        const sizeBytes = Number(f.size) || 0;
        const sizeKb = Math.round(sizeBytes / 1024);
        return {
            ...f,
            id: f.fileId,
            _size: sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`,
            _date: f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString('uk-UA') : ''
        };
    });

    let filteredData = [...allData];
    let currentPage = 1;
    let pageSize = 25;

    const updateStats = (shown, total) => {
        if (statsEl) statsEl.textContent = `Показано ${shown} з ${total}`;
    };

    // Колонки таблиці
    const columns = [
        col('name', 'Назва', 'name'),
        col('_size', 'Розмір', 'code', { className: 'cell-s' }),
        col('_date', 'Дата', 'text', { className: 'cell-s' }),
        {
            id: '_actions', label: ' ', sortable: false, className: 'cell-s',
            render: (value, row) => `
                <div class="mp-item-actions">
                    <a href="${escapeHtml(row.downloadUrl)}" target="_blank" class="btn-icon" title="Завантажити" aria-label="Завантажити">
                        <span class="material-symbols-outlined">download</span>
                    </a>
                    <button class="btn-icon ref-delete-btn" data-file-id="${escapeHtml(row.fileId)}" data-file-name="${escapeHtml(row.name)}" title="Видалити" aria-label="Видалити">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            `
        }
    ];

    const BATCH_TAB = 'mp-references';

    // Batch bar
    const existingBar = getBatchBar(BATCH_TAB);
    if (existingBar) existingBar.destroy();

    const batchBar = createBatchActionsBar({
        tabId: BATCH_TAB,
        actions: [
            {
                label: 'Завантажити',
                icon: 'download',
                primary: true,
                handler: (selectedIds) => {
                    const selectedFiles = allData.filter(f => selectedIds.includes(f.id));
                    selectedFiles.forEach(f => {
                        window.open(f.downloadUrl, '_blank');
                    });
                    batchBar.deselectAll();
                }
            },
            {
                label: 'Видалити',
                icon: 'delete',
                handler: async (selectedIds) => {
                    const confirmed = await showConfirmModal({
                        title: 'Видалити довідники?',
                        message: `Видалити ${selectedIds.length} файлів з Google Drive?`,
                        confirmText: 'Видалити',
                        cancelText: 'Скасувати',
                        confirmClass: 'btn-delete'
                    });
                    if (!confirmed) return;
                    try {
                        for (const fId of selectedIds) {
                            await deleteReferenceFile(fId);
                        }
                        showToast(`Видалено ${selectedIds.length} файлів`, 'success');
                        batchBar.deselectAll();
                        await populateMpReferences(slug);
                    } catch (err) {
                        showToast('Помилка видалення', 'error');
                    }
                }
            }
        ]
    });

    // Table LEGO
    const tableAPI = renderTableLego(container, {
        data: [],
        columns,
        withContainer: false,
        getRowId: row => row.id,
        emptyState: { message: 'Довідники відсутні' },
        onAfterRender: (cont) => {
            cont.querySelectorAll('.ref-delete-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    const fileId = btn.dataset.fileId;
                    const fileName = btn.dataset.fileName;
                    const confirmed = await showConfirmModal({
                        title: 'Видалити довідник?',
                        message: `Видалити файл "${fileName}" з Google Drive?`,
                        confirmText: 'Видалити',
                        cancelText: 'Скасувати',
                        confirmClass: 'btn-delete'
                    });
                    if (!confirmed) return;
                    try {
                        await deleteReferenceFile(fileId);
                        showToast('Файл видалено', 'success');
                        await populateMpReferences(slug);
                    } catch (err) {
                        showToast('Помилка видалення файлу', 'error');
                    }
                };
            });
        },
        plugins: {
            sorting: {
                dataSource: () => filteredData,
                onSort: (sortedData) => {
                    filteredData = sortedData;
                    currentPage = 1;
                    renderPage();
                },
                columnTypes: { name: 'string', _size: 'string', _date: 'string' }
            },
            checkboxes: {
                batchBar: () => getBatchBar(BATCH_TAB)
            }
        }
    });

    const renderPage = () => {
        const start = (currentPage - 1) * pageSize;
        const paginatedData = pageSize > 100000 ? filteredData : filteredData.slice(start, start + pageSize);
        tableAPI.render(paginatedData);
        updateStats(filteredData.length, allData.length);
        if (paginationAPI) paginationAPI.update({ totalItems: filteredData.length, currentPage, pageSize });
    };

    const filterData = (query) => {
        const q = query.toLowerCase().trim();
        if (!q) {
            filteredData = [...allData];
        } else {
            filteredData = allData.filter(row =>
                row.name.toLowerCase().includes(q)
            );
        }
        currentPage = 1;
        renderPage();
    };

    const paginationAPI = paginationEl ? initPagination(paginationEl, {
        currentPage, pageSize,
        totalItems: filteredData.length,
        onPageChange: (page, size) => { currentPage = page; pageSize = size; renderPage(); }
    }) : null;

    if (searchInput) {
        searchInput.value = '';
        searchInput.addEventListener('input', (e) => filterData(e.target.value));
    }

    renderPage();
}

// ═══════════════════════════════════════════════════════════════════════════
// СЕКЦІЯ: КАТЕГОРІЇ (дерево)
// ═══════════════════════════════════════════════════════════════════════════

function populateMpCategories(allData, catMapping) {
    const container = document.getElementById('mp-data-cat-container');
    const statsEl = document.getElementById('mp-data-cat-stats');
    const searchInput = document.getElementById('mp-data-cat-search');
    if (!container) return;

    let filteredData = [...allData];

    const updateStats = (shown, total) => {
        if (statsEl) statsEl.textContent = `Показано ${shown} з ${total}`;
    };

    const render = () => {
        if (filteredData.length === 0) {
            container.innerHTML = renderAvatarState('empty', {
                message: 'Категорії відсутні', size: 'medium',
                containerClass: 'empty-state-container', avatarClass: 'empty-state-avatar',
                messageClass: 'avatar-state-message', showMessage: true
            });
        } else {
            renderMpCategoryTree(container, filteredData, catMapping);
        }
        updateStats(filteredData.length, allData.length);
    };

    const filterData = (query) => {
        const q = query.toLowerCase().trim();
        if (!q) {
            filteredData = [...allData];
        } else {
            filteredData = allData.filter(item => {
                const name = extractMpName(item, catMapping).toLowerCase();
                const extId = (item.external_id || '').toLowerCase();
                return name.includes(q) || extId.includes(q);
            });
        }
        render();
    };

    if (searchInput) {
        searchInput.value = '';
        searchInput.addEventListener('input', (e) => filterData(e.target.value));
    }

    render();
}

// ═══════════════════════════════════════════════════════════════════════════
// СЕКЦІЯ: ХАРАКТЕРИСТИКИ (таблиця)
// ═══════════════════════════════════════════════════════════════════════════

function populateMpCharacteristics(allData, charMapping) {
    const container = document.getElementById('mp-data-char-container');
    const statsEl = document.getElementById('mp-data-char-stats');
    const searchInput = document.getElementById('mp-data-char-search');
    const paginationEl = document.getElementById('mp-data-char-pagination');
    if (!container) return;

    const ownChars = getCharacteristics();
    const allProcessed = preprocessCharsData(allData, ownChars, charMapping);
    let filteredData = [...allProcessed];
    let columnFilters = {};
    let currentPage = 1;
    let pageSize = 25;

    const updateStats = (shown, total) => {
        if (statsEl) statsEl.textContent = `Показано ${shown} з ${total}`;
    };

    const filterColumnsConfig = [
        { id: 'category_name', label: 'Категорія', filterType: 'contains' },
        { id: 'type', label: 'Тип', filterType: 'values' }
    ];

    const columns = [
        col('external_id', 'ID', 'word-chip'),
        {
            id: 'category_name', label: 'Категорія',
            className: 'cell-xs cell-center', sortable: false, filterable: true,
            render: (value) => {
                const names = (value || '').split(',').map(s => s.trim()).filter(Boolean);
                const count = names.length;
                const tooltip = names.join('\n') || "Не прив'язано до категорій";
                const cls = count === 0 ? 'chip' : 'chip chip-active';
                return `<span class="${cls} binding-chip" data-tooltip="${escapeHtml(tooltip)}" data-tooltip-always style="cursor:pointer">${count}</span>`;
            }
        },
        col('_name', 'Назва', 'name'),
        col('type', 'Тип', 'code', { filterable: true }),
        {
            id: '_mapping', label: 'Наша характ.', className: 'cell-l', sortable: false,
            render: (value, row) => {
                const cls = row._mappedId ? 'custom-select-trigger is-mapped' : 'custom-select-trigger';
                return `<div class="${cls}" data-entity-type="characteristic" data-mp-entity-id="${escapeHtml(row.id)}" data-mp-ext-id="${escapeHtml(row.external_id || '')}" data-current-value="${escapeHtml(row._mappedId)}"><span class="mp-tree-mapping-label">${row._mappedLabel ? escapeHtml(row._mappedLabel) : '—'}</span><svg class="custom-select-arrow" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg></div>`;
            }
        }
    ];

    const getFilteredData = () => {
        let data = [...allProcessed];
        if (Object.keys(columnFilters).length > 0) {
            data = applyColumnFilters(data, columnFilters, filterColumnsConfig);
        }
        const q = searchInput?.value?.toLowerCase().trim() || '';
        if (q) {
            data = data.filter(row =>
                (row.external_id && row.external_id.toLowerCase().includes(q)) ||
                (row._name && row._name.toLowerCase().includes(q))
            );
        }
        return data;
    };

    const tableAPI = renderTableLego(container, {
        data: [],
        columns,
        withContainer: false,
        getRowId: row => row.id,
        onAfterRender: (cont) => initMappingTriggerDelegation(cont, 'characteristic'),
        plugins: {
            sorting: {
                dataSource: () => filteredData,
                onSort: (sortedData) => {
                    filteredData = sortedData;
                    currentPage = 1;
                    renderPage();
                },
                columnTypes: { external_id: 'string', _name: 'string', type: 'string' }
            },
            filters: {
                dataSource: () => allProcessed,
                filterColumns: filterColumnsConfig,
                onFilter: (filters) => {
                    columnFilters = filters;
                    filteredData = getFilteredData();
                    currentPage = 1;
                    renderPage();
                }
            }
        }
    });

    const renderPage = () => {
        const start = (currentPage - 1) * pageSize;
        const paginatedData = pageSize > 100000 ? filteredData : filteredData.slice(start, start + pageSize);
        tableAPI.render(paginatedData);
        updateStats(filteredData.length, allData.length);
        if (paginationAPI) paginationAPI.update({ totalItems: filteredData.length, currentPage, pageSize });
    };

    const paginationAPI = paginationEl ? initPagination(paginationEl, {
        currentPage, pageSize,
        totalItems: filteredData.length,
        onPageChange: (page, size) => { currentPage = page; pageSize = size; renderPage(); }
    }) : null;

    if (searchInput) {
        searchInput.value = '';
        searchInput.addEventListener('input', () => {
            filteredData = getFilteredData();
            currentPage = 1;
            renderPage();
        });
    }

    renderPage();
}

function preprocessCharsData(data, ownChars, charMapping) {
    return data.map(item => {
        const mapping = getCharacteristicMappingByMpId(item.id) || getCharacteristicMappingByMpId(item.external_id);
        const mappedId = mapping?.characteristic_id || '';
        const mappedChar = mappedId ? ownChars.find(c => c.id === mappedId) : null;
        return {
            ...item,
            _name: extractMpName(item, charMapping) || item.external_id || '-',
            _mappedId: mappedId,
            _mappedLabel: mappedChar ? (mappedChar.name_ua || mappedChar.id) : ''
        };
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// СЕКЦІЯ: ОПЦІЇ (таблиця)
// ═══════════════════════════════════════════════════════════════════════════

function populateMpOptions(allData, optMapping) {
    const container = document.getElementById('mp-data-opt-container');
    const statsEl = document.getElementById('mp-data-opt-stats');
    const searchInput = document.getElementById('mp-data-opt-search');
    const paginationEl = document.getElementById('mp-data-opt-pagination');
    if (!container) return;

    const ownOpts = getOptions();
    const allProcessed = preprocessOptsData(allData, ownOpts, optMapping);
    let filteredData = [...allProcessed];
    let currentPage = 1;
    let pageSize = 25;

    const updateStats = (shown, total) => {
        if (statsEl) statsEl.textContent = `Показано ${shown} з ${total}`;
    };

    const columns = [
        col('external_id', 'ID', 'word-chip'),
        col('_name', 'Назва', 'name'),
        col('_charName', 'Характ.', 'text', { className: 'cell-m', filterable: true }),
        {
            id: '_mapping', label: 'Наша опція', className: 'cell-l', sortable: false,
            render: (value, row) => {
                const cls = row._mappedId ? 'custom-select-trigger is-mapped' : 'custom-select-trigger';
                return `<div class="${cls}" data-entity-type="option" data-mp-entity-id="${escapeHtml(row.id)}" data-mp-ext-id="${escapeHtml(row.external_id || '')}" data-current-value="${escapeHtml(row._mappedId)}"><span class="mp-tree-mapping-label">${row._mappedLabel ? escapeHtml(row._mappedLabel) : '—'}</span><svg class="custom-select-arrow" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg></div>`;
            }
        }
    ];

    const tableAPI = renderTableLego(container, {
        data: [],
        columns,
        withContainer: false,
        getRowId: row => row.id,
        onAfterRender: (cont) => initMappingTriggerDelegation(cont, 'option'),
        plugins: {
            sorting: {
                dataSource: () => filteredData,
                onSort: (sortedData) => {
                    filteredData = sortedData;
                    currentPage = 1;
                    renderPage();
                },
                columnTypes: { external_id: 'string', _name: 'string', _charName: 'string' }
            },
            filters: {
                dataSource: () => allProcessed,
                filterColumns: [
                    { id: '_charName', label: 'Характеристика', filterType: 'values' }
                ],
                onFilter: (filters) => {
                    columnFilters = filters;
                    currentPage = 1;
                    applyAllFilters();
                }
            }
        }
    });

    let columnFilters = {};
    let searchQuery = '';

    const applyAllFilters = () => {
        let result = [...allProcessed];

        // Текстовий пошук
        if (searchQuery) {
            result = result.filter(row =>
                (row.external_id && row.external_id.toLowerCase().includes(searchQuery)) ||
                (row._name && row._name.toLowerCase().includes(searchQuery)) ||
                (row._charName && row._charName.toLowerCase().includes(searchQuery))
            );
        }

        // Колонкові фільтри
        result = applyColumnFilters(result, columnFilters, [{ id: '_charName', filterType: 'values' }]);

        filteredData = result;
        renderPage();
    };

    const renderPage = () => {
        const start = (currentPage - 1) * pageSize;
        const paginatedData = pageSize > 100000 ? filteredData : filteredData.slice(start, start + pageSize);
        tableAPI.render(paginatedData);
        updateStats(filteredData.length, allData.length);
        if (paginationAPI) paginationAPI.update({ totalItems: filteredData.length, currentPage, pageSize });
    };

    const paginationAPI = paginationEl ? initPagination(paginationEl, {
        currentPage, pageSize,
        totalItems: filteredData.length,
        onPageChange: (page, size) => { currentPage = page; pageSize = size; renderPage(); }
    }) : null;

    if (searchInput) {
        searchInput.value = '';
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            currentPage = 1;
            applyAllFilters();
        });
    }

    renderPage();
}

function preprocessOptsData(data, ownOpts, optMapping) {
    return data.map(item => {
        const mapping = getOptionMappingByMpId(item.id) || getOptionMappingByMpId(item.external_id);
        const mappedId = mapping?.option_id || '';
        const mappedOpt = mappedId ? ownOpts.find(o => o.id === mappedId) : null;
        return {
            ...item,
            _name: extractMpName(item, optMapping) || item.external_id || '-',
            _charName: resolveMpField(item, 'char_name', optMapping)
                || item.char_name
                || resolveMpField(item, 'char_id', optMapping)
                || item.char_id
                || '-',
            _mappedId: mappedId,
            _mappedLabel: mappedOpt ? (mappedOpt.value_ua || mappedOpt.id) : ''
        };
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAPPING TRIGGER DELEGATION (per-container)
// ═══════════════════════════════════════════════════════════════════════════

function initMappingTriggerDelegation(container, entityType) {
    // Cleanup попередній handler щоб не накопичувались
    const key = `_mappingDelegation_${entityType}`;
    if (container[key]) container.removeEventListener('click', container[key]);

    const handler = (e) => {
        const trigger = e.target.closest('.custom-select-trigger[data-entity-type]');
        if (!trigger) return;
        e.stopPropagation();

        const mpEntityId = trigger.dataset.mpEntityId;
        const mpExtId = trigger.dataset.mpExtId;
        const currentValue = trigger.dataset.currentValue || '';

        if (entityType === 'characteristic') {
            const ownChars = getCharacteristics();
            showMappingPicker(trigger, ownChars, currentValue, async (newValue) => {
                const oldMapping = getCharacteristicMappingByMpId(mpEntityId) || getCharacteristicMappingByMpId(mpExtId);
                if (oldMapping) {
                    try { await deleteCharacteristicMapping(oldMapping.id); }
                    catch { showToast('Помилка видалення', 'error'); return; }
                }
                if (newValue) {
                    try { await createCharacteristicMapping(newValue, mpEntityId); showToast('Прив\'язано', 'success'); }
                    catch { showToast('Помилка прив\'язки', 'error'); return; }
                } else if (oldMapping) {
                    const undoOwnId = oldMapping.characteristic_id;
                    const undoMpId = oldMapping.mp_characteristic_id;
                    showToast('Прив\'язку знято', 'success', {
                        duration: 6000,
                        action: {
                            label: 'Відмінити',
                            onClick: async () => {
                                await createCharacteristicMapping(undoOwnId, undoMpId);
                                const restoredChar = ownChars.find(c => c.id === undoOwnId);
                                trigger.dataset.currentValue = undoOwnId;
                                trigger.classList.add('is-mapped');
                                const lbl = trigger.querySelector('.mp-tree-mapping-label');
                                if (lbl) lbl.textContent = restoredChar ? (restoredChar.name_ua || restoredChar.id) : undoOwnId;
                            }
                        }
                    });
                }
                const newChar = newValue ? ownChars.find(c => c.id === newValue) : null;
                trigger.dataset.currentValue = newValue || '';
                trigger.classList.toggle('is-mapped', !!newValue);
                const label = trigger.querySelector('.mp-tree-mapping-label');
                if (label) label.textContent = newChar ? (newChar.name_ua || newChar.id) : '—';
            });
        } else if (entityType === 'option') {
            const ownOpts = getOptions();
            showMappingPicker(trigger, ownOpts, currentValue, async (newValue) => {
                const oldMapping = getOptionMappingByMpId(mpEntityId) || getOptionMappingByMpId(mpExtId);
                if (oldMapping) {
                    try { await deleteOptionMapping(oldMapping.id); }
                    catch { showToast('Помилка видалення', 'error'); return; }
                }
                if (newValue) {
                    try { await createOptionMapping(newValue, mpEntityId); showToast('Прив\'язано', 'success'); }
                    catch { showToast('Помилка прив\'язки', 'error'); return; }
                } else if (oldMapping) {
                    const undoOwnId = oldMapping.option_id;
                    const undoMpId = oldMapping.mp_option_id;
                    showToast('Прив\'язку знято', 'success', {
                        duration: 6000,
                        action: {
                            label: 'Відмінити',
                            onClick: async () => {
                                await createOptionMapping(undoOwnId, undoMpId);
                                const restoredOpt = ownOpts.find(o => o.id === undoOwnId);
                                trigger.dataset.currentValue = undoOwnId;
                                trigger.classList.add('is-mapped');
                                const lbl = trigger.querySelector('.mp-tree-mapping-label');
                                if (lbl) lbl.textContent = restoredOpt ? (restoredOpt.value_ua || restoredOpt.id) : undoOwnId;
                            }
                        }
                    });
                }
                const newOpt = newValue ? ownOpts.find(o => o.id === newValue) : null;
                trigger.dataset.currentValue = newValue || '';
                trigger.classList.toggle('is-mapped', !!newValue);
                const label = trigger.querySelector('.mp-tree-mapping-label');
                if (label) label.textContent = newOpt ? (newOpt.value_ua || newOpt.id) : '—';
            }, (o) => o.value_ua || o.id);
        }
    };
    container.addEventListener('click', handler);
    container[key] = handler;
}

// ═══════════════════════════════════════════════════════════════════════════
// ДЕРЕВО MP КАТЕГОРІЙ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати значення стандартного поля з MP об'єкта через column_mapping
 * @param {object} obj - MP об'єкт
 * @param {string} standardField - Стандартна назва поля (name, parent_id, type, char_id, char_name)
 * @param {object} entityMapping - Маппінг для типу сутності (напр. cm.categories)
 * @returns {string|undefined}
 */
function resolveMpField(obj, standardField, entityMapping) {
    if (!obj || typeof obj !== 'object') return undefined;

    // 1. Перевірити column_mapping
    if (entityMapping && entityMapping[standardField]) {
        const mpFieldName = entityMapping[standardField];
        if (obj[mpFieldName] !== undefined && obj[mpFieldName] !== '') {
            return obj[mpFieldName];
        }
    }

    // 2. Fallback: стандартне ім'я напряму
    if (obj[standardField] !== undefined && obj[standardField] !== '') {
        return obj[standardField];
    }

    return undefined;
}

function extractMpName(obj, entityMapping) {
    if (!obj || typeof obj !== 'object') return '';

    // 1. Перевірити column_mapping
    const mapped = resolveMpField(obj, 'name', entityMapping);
    if (mapped) return mapped;

    // 2. Евристичний fallback
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
 * Знайти маппінг для MP категорії
 */
function findCatMapping(mpCat) {
    const mapCats = getMapCategories();
    return mapCats.find(m =>
        m.mp_category_id === mpCat.id || m.mp_category_id === mpCat.external_id
    );
}

/**
 * Рендерити дерево MP категорій
 */
function renderMpCategoryTree(container, data, catMapping) {
    const ownCategories = getCategories();

    // Побудувати дерево: parentJsonId → [children]
    const byParent = new Map();    // parentId → [items]
    const byJsonId = new Map();    // _jsonId → item

    data.forEach(item => {
        const jsonId = String(item._jsonId || item.external_id || '');
        if (jsonId) byJsonId.set(jsonId, item);
    });

    // Визначити кореневі елементи — додаємо І _jsonId І external_id для надійного пошуку
    const dataSet = new Set();
    data.forEach(d => {
        if (d._jsonId) dataSet.add(String(d._jsonId));
        if (d.external_id) dataSet.add(String(d.external_id));
    });

    data.forEach(item => {
        const rawParent = resolveMpField(item, 'parent_id', catMapping)
            ?? item.parentId ?? item.parent_id ?? '';
        const parentId = rawParent === 0 || rawParent === '0' || rawParent === null ? '' : String(rawParent);
        const key = (parentId && dataSet.has(parentId)) ? parentId : 'root';
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key).push(item);
    });

    // Сортувати кожен рівень по назві
    byParent.forEach(children => {
        children.sort((a, b) => extractMpName(a, catMapping).localeCompare(extractMpName(b, catMapping), 'uk'));
    });

    // Рекурсивний рендер — замість <select> рендеримо клікабельний trigger
    function buildTree(parentKey, level) {
        const children = byParent.get(parentKey);
        if (!children || children.length === 0) return '';

        const items = children.map(item => {
            const jsonId = String(item._jsonId || item.external_id || '');
            const hasChildren = byParent.has(jsonId) && byParent.get(jsonId).length > 0;
            const isOpen = false;
            const name = extractMpName(item, catMapping) || item.external_id || '?';

            // Знайти поточний маппінг
            const mapping = findCatMapping(item);
            const mappedCatId = mapping?.category_id || '';
            const mappedCat = mappedCatId ? ownCategories.find(c => c.id === mappedCatId) : null;
            const mappedLabel = mappedCat ? (mappedCat.name_ua || mappedCat.id) : '';

            const toggleHtml = hasChildren
                ? `<button class="toggle-btn"><span class="material-symbols-outlined">arrow_drop_down</span></button>`
                : `<span class="leaf-placeholder"></span>`;

            const childrenHtml = hasChildren ? buildTree(jsonId, level + 1) : '';

            const classes = [
                hasChildren ? 'has-children' : '',
                isOpen ? 'is-open' : ''
            ].filter(Boolean).join(' ');

            const triggerClass = mappedCatId ? 'custom-select-trigger is-mapped' : 'custom-select-trigger';

            return `
                <li data-id="${escapeHtml(item.id)}" class="${classes}">
                    <div class="tree-item-content">
                        ${toggleHtml}
                        <span class="tree-item-name">${escapeHtml(name)}</span>
                        <div class="${triggerClass}"
                             data-mp-cat-id="${escapeHtml(item.id)}"
                             data-current-cat-id="${escapeHtml(mappedCatId)}">
                            <span class="mp-tree-mapping-label">${mappedLabel ? escapeHtml(mappedLabel) : '—'}</span>
                            <svg class="custom-select-arrow" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
                        </div>
                    </div>
                    ${childrenHtml}
                </li>
            `;
        }).join('');

        return `<ul class="tree-level-${Math.min(level, 5)}">${items}</ul>`;
    }

    const treeHtml = buildTree('root', 0);
    container.innerHTML = `<div class="tree">${treeHtml || renderAvatarState('empty', { message: 'Дані відсутні', size: 'medium', containerClass: 'empty-state-container', avatarClass: 'empty-state-avatar', messageClass: 'avatar-state-message', showMessage: true })}</div>`;

    // Toggle expand/collapse
    container.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const li = btn.closest('li');
            if (li) li.classList.toggle('is-open');
        });
    });

    // Mapping trigger click → shared picker popup (cleanup попередній, щоб не накопичувались)
    if (container._mappingClickHandler) {
        container.removeEventListener('click', container._mappingClickHandler);
    }
    const mappingClickHandler = (e) => {
        const trigger = e.target.closest('.custom-select-trigger');
        if (!trigger) return;
        e.stopPropagation();

        const mpCatId = trigger.dataset.mpCatId;
        const currentCatId = trigger.dataset.currentCatId || '';
        const mpCat = data.find(c => c.id === mpCatId);
        if (!mpCat) return;

        showMappingPicker(trigger, ownCategories, currentCatId, async (newCatId) => {
            // Видалити старий маппінг
            const oldMapping = findCatMapping(mpCat);
            if (oldMapping) {
                try {
                    await deleteCategoryMapping(oldMapping.id);
                } catch (err) {
                    showToast('Помилка видалення маппінгу', 'error');
                    return;
                }
            }

            // Створити новий маппінг
            if (newCatId) {
                try {
                    await createCategoryMapping(newCatId, mpCatId);
                    showToast('Прив\'язано', 'success');
                } catch (err) {
                    showToast('Помилка створення маппінгу', 'error');
                    return;
                }
            } else if (oldMapping) {
                const undoOwnId = oldMapping.category_id;
                const undoMpId = oldMapping.mp_category_id;
                showToast('Прив\'язку знято', 'success', {
                    duration: 6000,
                    action: {
                        label: 'Відмінити',
                        onClick: async () => {
                            await createCategoryMapping(undoOwnId, undoMpId);
                            const restoredCat = ownCategories.find(c => c.id === undoOwnId);
                            trigger.dataset.currentCatId = undoOwnId;
                            trigger.classList.add('is-mapped');
                            const lbl = trigger.querySelector('.mp-tree-mapping-label');
                            if (lbl) lbl.textContent = restoredCat ? (restoredCat.name_ua || restoredCat.id) : undoOwnId;
                        }
                    }
                });
            }

            // Оновити trigger
            const newCat = newCatId ? ownCategories.find(c => c.id === newCatId) : null;
            trigger.dataset.currentCatId = newCatId || '';
            trigger.classList.toggle('is-mapped', !!newCatId);
            const label = trigger.querySelector('.mp-tree-mapping-label');
            if (label) label.textContent = newCat ? (newCat.name_ua || newCat.id) : '—';
        });
    };
    container.addEventListener('click', mappingClickHandler);
    container._mappingClickHandler = mappingClickHandler;
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED MAPPING PICKER (виглядає як custom-select, але один на все дерево)
// ═══════════════════════════════════════════════════════════════════════════

let _mappingPickerEl = null;
let _mappingPickerCleanup = null;

function showMappingPicker(triggerEl, items, currentValue, onSelect, labelFn) {
    closeMappingPicker();
    if (!labelFn) labelFn = (c) => c.name_ua || c.id;

    const picker = getOrCreateMappingPicker();
    const list = picker.querySelector('.custom-select-options');
    const search = picker.querySelector('.custom-select-search');

    // Заповнити список
    list.innerHTML = `<li class="custom-select-option${!currentValue ? ' is-selected' : ''}" data-value="">— Без прив'язки —</li>` +
        items.map(c => {
            const name = labelFn(c);
            const selected = c.id === currentValue ? ' is-selected' : '';
            return `<li class="custom-select-option${selected}" data-value="${escapeHtml(c.id)}">${escapeHtml(name)}</li>`;
        }).join('');

    // Позиціонування
    const rect = triggerEl.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const spaceBelow = viewportH - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const panelHeight = Math.min(280, Math.max(spaceBelow, spaceAbove));
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;

    picker.style.position = 'fixed';
    picker.style.left = `${rect.left}px`;
    picker.style.width = `${Math.max(rect.width, 220)}px`;
    picker.style.maxHeight = `${panelHeight}px`;
    picker.style.zIndex = '10000';

    if (openUp) {
        picker.style.top = 'auto';
        picker.style.bottom = `${viewportH - rect.top + 4}px`;
    } else {
        picker.style.top = `${rect.bottom + 4}px`;
        picker.style.bottom = 'auto';
    }

    picker.style.display = 'flex';
    picker.classList.add('is-open');

    // Автофокус на пошук
    if (search) {
        search.value = '';
        setTimeout(() => search.focus(), 0);
    }

    // Пошук
    const onSearchInput = () => {
        const q = search.value.toLowerCase();
        list.querySelectorAll('.custom-select-option').forEach(li => {
            li.style.display = li.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
    };

    // Вибір
    const onListClick = (e) => {
        const li = e.target.closest('.custom-select-option');
        if (!li) return;
        onSelect(li.dataset.value);
        closeMappingPicker();
    };

    // Закриття по кліку поза
    const onOutsideClick = (e) => {
        if (!picker.contains(e.target) && !triggerEl.contains(e.target)) {
            closeMappingPicker();
        }
    };

    // Закриття по Escape
    const onKeyDown = (e) => {
        if (e.key === 'Escape') {
            closeMappingPicker();
        }
    };

    search?.addEventListener('input', onSearchInput);
    list.addEventListener('click', onListClick);
    setTimeout(() => document.addEventListener('click', onOutsideClick), 0);
    document.addEventListener('keydown', onKeyDown);

    _mappingPickerCleanup = () => {
        search?.removeEventListener('input', onSearchInput);
        list.removeEventListener('click', onListClick);
        document.removeEventListener('click', onOutsideClick);
        document.removeEventListener('keydown', onKeyDown);
    };
}

function closeMappingPicker() {
    if (_mappingPickerCleanup) {
        _mappingPickerCleanup();
        _mappingPickerCleanup = null;
    }
    if (_mappingPickerEl) {
        _mappingPickerEl.style.display = 'none';
        _mappingPickerEl.classList.remove('is-open');
    }
}

function getOrCreateMappingPicker() {
    if (_mappingPickerEl) return _mappingPickerEl;

    const picker = document.createElement('div');
    picker.className = 'custom-select-panel mp-mapping-picker';
    picker.innerHTML = `
        <div class="custom-select-search-wrapper">
            <input type="text" class="custom-select-search" placeholder="Пошук...">
        </div>
        <ul class="custom-select-options" role="listbox"></ul>
    `;
    picker.style.display = 'none';
    document.body.appendChild(picker);

    _mappingPickerEl = picker;
    return picker;
}

