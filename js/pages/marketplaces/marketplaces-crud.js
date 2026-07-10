// js/pages/marketplaces/marketplaces-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MARKETPLACES - CRUD PLUGIN                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  ПЛАГІН — Маркетплейси: CRUD операції + модалки + перегляд даних        ║
 * ║                                                                          ║
 * ║  ЕКСПОРТОВАНІ ФУНКЦІЇ:                                                   ║
 * ║  - init() — Ініціалізація плагіна (реєстрація hooks)                    ║
 * ║  - showAddMarketplaceModal() — Модалка додавання                        ║
 * ║  - showEditMarketplaceModal(id) — Модалка редагування + дані            ║
 * ║  - showMarketplaceDataModal(id) — Alias → showEditMarketplaceModal      ║
 * ║                                                                          ║
 * ║  ЗАЛЕЖНОСТІ:                                                             ║
 * ║  - marketplaces-state.js (state, hooks)                                  ║
 * ║  - ../../data/marketplaces-data.js (API)                                ║
 * ║  - marketplaces-table.js (рендеринг)                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

let _state = null;

import { registerHook, runHook } from './marketplaces-plugins.js';
import {
    addMarketplace, updateMarketplace, deleteMarketplace, getMarketplaces,
    getMarketplaceDependencies
} from '../../data/marketplaces-data.js';
import {
    getMpCategories, getMpCharacteristics, getMpOptions,
    loadMpCategories, loadMpCharacteristics, loadMpOptions,
    deleteAllMpDataForMarketplace
} from '../../data/mp-data.js';
import {
    deleteCategoryMappingByMpId,
    deleteCharacteristicMappingByMpId,
    deleteOptionMappingByMpId,
    loadMapCategories,
    loadMapCharacteristics,
    loadMapOptions,
    getMapCategories,
    getMapCharacteristics,
    getMapOptions
} from '../../data/mappings-data.js';
import { initSectionNavigation, buildCascadeDetails } from '../entities/entities-utils.js';
import { showModal, closeModal, showConfirmModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { initSearchCharm } from '../../components/charms/charm-search.js';
import { initColumnsCharm } from '../../components/charms/charm-columns.js';
import { populateMpReferences } from './marketplaces-crud-references.js';
import { populateMpCategories } from './marketplaces-crud-categories.js';
import {
    populateMpCharacteristics,
    populateMpOptions
} from './marketplaces-crud-mappings.js';

export const PLUGIN_NAME = 'marketplaces-crud';

/**
 * Ініціалізація плагіна
 * Реєструє hooks та позначає плагін як завантажений
 */
export function init(state) {
    _state = state;
    registerHook('onDataLoaded', handleDataLoaded);
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
    if (saveBtn) saveBtn.onclick = () => handleSaveNewMarketplace(false);

    const saveCloseBtn = document.getElementById('save-close-mapper-marketplace');
    if (saveCloseBtn) saveCloseBtn.onclick = () => handleSaveNewMarketplace(true);

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

    // Кнопки збереження
    const saveBtn = document.getElementById('save-mapper-marketplace');
    if (saveBtn) saveBtn.onclick = () => handleUpdateMarketplace(id, false);

    const saveCloseBtn = document.getElementById('save-close-mapper-marketplace');
    if (saveCloseBtn) saveCloseBtn.onclick = () => handleUpdateMarketplace(id, true);

    // Завантажити MP дані + маппінги (lazy — тільки якщо ще не завантажені)
    if (getMpCategories().length === 0) await loadMpCategories();
    if (getMpCharacteristics().length === 0) await loadMpCharacteristics();
    if (getMpOptions().length === 0) await loadMpOptions();
    if (getMapCategories().length === 0) await loadMapCategories();
    if (getMapCharacteristics().length === 0) await loadMapCharacteristics();
    if (getMapOptions().length === 0) await loadMapOptions();

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

    // Ініціалізувати charms для модальних таблиць (ДО populate — потрібен _charmSearchInput)
    initSearchCharm();
    initColumnsCharm();

    // Заповнити кожну секцію незалежно
    populateMpCategories(categories, columnMapping.categories, marketplace.slug, id);
    populateMpCharacteristics(characteristics, columnMapping.characteristics);
    populateMpOptions(options, columnMapping.options);

    // Довідники (файли на Google Drive)
    populateMpReferences(marketplace.slug, id);

    // charm:refresh listeners
    const catContainer = document.getElementById('mp-data-cat-container');
    if (catContainer) {
        catContainer.addEventListener('charm:refresh', (e) => {
            e.detail.waitUntil((async () => {
                await loadMpCategories();
                const freshCats = getMpCategories().filter(c => c.marketplace_id === id);
                if (catCount) catCount.textContent = freshCats.length;
                populateMpCategories(freshCats, columnMapping.categories, marketplace.slug, id);
            })());
        });
    }

    const charContainer = document.getElementById('mp-data-char-container');
    if (charContainer) {
        charContainer.addEventListener('charm:refresh', (e) => {
            e.detail.waitUntil((async () => {
                await loadMpCharacteristics();
                const freshChars = getMpCharacteristics().filter(c => c.marketplace_id === id);
                if (charCount) charCount.textContent = freshChars.length;
                populateMpCharacteristics(freshChars, columnMapping.characteristics);
            })());
        });
    }

    const optContainer = document.getElementById('mp-data-opt-container');
    if (optContainer) {
        optContainer.addEventListener('charm:refresh', (e) => {
            e.detail.waitUntil((async () => {
                await loadMpOptions();
                const freshOpts = getMpOptions().filter(o => o.marketplace_id === id);
                if (optCount) optCount.textContent = freshOpts.length;
                populateMpOptions(freshOpts, columnMapping.options);
            })());
        });
    }

    const refContainer = document.getElementById('mp-data-ref-container');
    if (refContainer) {
        refContainer.addEventListener('charm:refresh', (e) => {
            e.detail.waitUntil(populateMpReferences(marketplace.slug, id));
        });
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
    const deps = getMarketplaceDependencies(id, {
        mpCategories: getMpCategories(),
        mpCharacteristics: getMpCharacteristics(),
        mpOptions: getMpOptions(),
        mapCategories: getMapCategories(),
        mapCharacteristics: getMapCharacteristics(),
        mapOptions: getMapOptions()
    });
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
        action: 'видалити',
        entity: 'маркетплейс',
        name: marketplace.name,
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

            // Видалити самі MP сутності (категорії, характеристики, опції МП)
            await deleteAllMpDataForMarketplace(id);

            await deleteMarketplace(id);
            showToast('Маркетплейс видалено', 'success');
            runHook('onDataChanged');
        } catch (error) {
            showToast('Помилка видалення маркетплейсу', 'error');
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ФОРМА
// ═══════════════════════════════════════════════════════════════════════════

async function handleSaveNewMarketplace(shouldClose = true) {
    const data = getMarketplaceFormData();
    try {
        await addMarketplace(data);
        showToast('Маркетплейс додано', 'success');
        if (shouldClose) closeModal();
        runHook('onDataChanged');
    } catch (error) {
        showToast('Помилка додавання маркетплейсу', 'error');
    }
}

async function handleUpdateMarketplace(id, shouldClose = true) {
    const data = getMarketplaceFormData();
    try {
        await updateMarketplace(id, data);
        showToast('Маркетплейс оновлено', 'success');
        if (shouldClose) closeModal();
        runHook('onDataChanged');
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
        dot.classList.remove('c-green', 'c-red');
        dot.classList.add(isActive ? 'c-green' : 'c-red');
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
