// js/mapper/mapper-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - CRUD OPERATIONS                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Модальні вікна для додавання, редагування та видалення в Mapper.
 */

import {
    addCategory, updateCategory, deleteCategory, getCategories,
    addCharacteristic, updateCharacteristic, deleteCharacteristic, getCharacteristics,
    addOption, updateOption, deleteOption, getOptions,
    addMarketplace, updateMarketplace, deleteMarketplace, getMarketplaces
} from './mapper-data.js';
import { renderCurrentTab } from './mapper-table.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { showConfirmModal } from '../common/ui-modal-confirm.js';
import { initCustomSelects, reinitializeCustomSelect } from '../common/ui-select.js';
import { showLoader } from '../common/ui-loading.js';

// ═══════════════════════════════════════════════════════════════════════════
// КАТЕГОРІЇ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модальне вікно для додавання категорії
 */
export async function showAddCategoryModal() {
    console.log('➕ Відкриття модального вікна для додавання категорії');

    await showModal('mapper-category-edit', null);

    // Ініціалізувати кастомні селекти в модальному вікні
    const modalEl = document.getElementById('modal-mapper-category-edit');
    if (modalEl) initCustomSelects(modalEl);

    const title = document.getElementById('modal-title');
    if (title) title.textContent = 'Додати категорію';

    const deleteBtn = document.getElementById('delete-mapper-category');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    clearCategoryForm();
    populateParentCategorySelect();

    const saveBtn = document.getElementById('save-mapper-category');
    if (saveBtn) {
        saveBtn.onclick = handleSaveNewCategory;
    }
}

/**
 * Показати модальне вікно для редагування категорії
 */
export async function showEditCategoryModal(id) {
    console.log(`✏️ Відкриття модального вікна для редагування категорії ${id}`);

    const categories = getCategories();
    const category = categories.find(c => c.id === id);

    if (!category) {
        showToast('Категорію не знайдено', 'error');
        return;
    }

    await showModal('mapper-category-edit', null);

    // Ініціалізувати кастомні селекти в модальному вікні
    const modalEl = document.getElementById('modal-mapper-category-edit');
    if (modalEl) initCustomSelects(modalEl);

    const title = document.getElementById('modal-title');
    if (title) title.textContent = 'Редагувати категорію';

    const deleteBtn = document.getElementById('delete-mapper-category');
    if (deleteBtn) {
        deleteBtn.classList.remove('u-hidden');
        deleteBtn.onclick = () => {
            closeModal();
            showDeleteCategoryConfirm(id);
        };
    }

    populateParentCategorySelect(id);
    fillCategoryForm(category);

    const saveBtn = document.getElementById('save-mapper-category');
    if (saveBtn) {
        saveBtn.onclick = () => handleUpdateCategory(id);
    }
}

/**
 * Показати підтвердження видалення категорії
 */
async function showDeleteCategoryConfirm(id) {
    const categories = getCategories();
    const category = categories.find(c => c.id === id);

    if (!category) {
        showToast('Категорію не знайдено', 'error');
        return;
    }

    const confirmed = await showConfirmModal({
        title: 'Видалити категорію?',
        message: `Ви впевнені, що хочете видалити категорію "${category.name_ua}"?`,
        confirmText: 'Видалити',
        cancelText: 'Скасувати',
        confirmClass: 'btn-danger'
    });

    if (confirmed) {
        try {
            await deleteCategory(id);
            showToast('Категорію видалено', 'success');
            renderCurrentTab();
        } catch (error) {
            showToast('Помилка видалення категорії', 'error');
        }
    }
}

async function handleSaveNewCategory() {
    const data = getCategoryFormData();

    if (!data.name_ua) {
        showToast('Введіть назву категорії', 'error');
        return;
    }

    try {
        await addCategory(data);
        showToast('Категорію додано', 'success');
        closeModal();
        renderCurrentTab();
    } catch (error) {
        showToast('Помилка додавання категорії', 'error');
    }
}

async function handleUpdateCategory(id) {
    const data = getCategoryFormData();

    if (!data.name_ua) {
        showToast('Введіть назву категорії', 'error');
        return;
    }

    try {
        await updateCategory(id, data);
        showToast('Категорію оновлено', 'success');
        closeModal();
        renderCurrentTab();
    } catch (error) {
        showToast('Помилка оновлення категорії', 'error');
    }
}

function getCategoryFormData() {
    return {
        name_ua: document.getElementById('mapper-category-name-ua')?.value.trim() || '',
        name_ru: document.getElementById('mapper-category-name-ru')?.value.trim() || '',
        parent_id: document.getElementById('mapper-category-parent')?.value || ''
    };
}

function fillCategoryForm(category) {
    const nameUaField = document.getElementById('mapper-category-name-ua');
    const nameRuField = document.getElementById('mapper-category-name-ru');
    const parentField = document.getElementById('mapper-category-parent');

    if (nameUaField) nameUaField.value = category.name_ua || '';
    if (nameRuField) nameRuField.value = category.name_ru || '';
    if (parentField) parentField.value = category.parent_id || '';
}

function clearCategoryForm() {
    const nameUaField = document.getElementById('mapper-category-name-ua');
    const nameRuField = document.getElementById('mapper-category-name-ru');
    const parentField = document.getElementById('mapper-category-parent');

    if (nameUaField) nameUaField.value = '';
    if (nameRuField) nameRuField.value = '';
    if (parentField) parentField.value = '';
}

function populateParentCategorySelect(excludeId = null) {
    const select = document.getElementById('mapper-category-parent');
    if (!select) return;

    const categories = getCategories();

    select.innerHTML = '<option value="">— Без батьківської —</option>';

    categories.forEach(cat => {
        if (cat.id !== excludeId) {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name_ua || cat.id;
            select.appendChild(option);
        }
    });

    // Оновити кастомний селект після заповнення
    reinitializeCustomSelect(select);
}

// ═══════════════════════════════════════════════════════════════════════════
// ХАРАКТЕРИСТИКИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модальне вікно для додавання характеристики
 */
export async function showAddCharacteristicModal() {
    console.log('➕ Відкриття модального вікна для додавання характеристики');

    await showModal('mapper-characteristic-edit', null);

    // Ініціалізувати кастомні селекти в модальному вікні
    const modalEl = document.getElementById('modal-mapper-characteristic-edit');
    if (modalEl) initCustomSelects(modalEl);

    const title = document.getElementById('modal-title');
    if (title) title.textContent = 'Додати характеристику';

    const deleteBtn = document.getElementById('delete-mapper-characteristic');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    clearCharacteristicForm();

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

    // Ініціалізувати кастомні селекти в модальному вікні
    const modalEl = document.getElementById('modal-mapper-characteristic-edit');
    if (modalEl) initCustomSelects(modalEl);

    const title = document.getElementById('modal-title');
    if (title) title.textContent = 'Редагувати характеристику';

    const deleteBtn = document.getElementById('delete-mapper-characteristic');
    if (deleteBtn) {
        deleteBtn.classList.remove('u-hidden');
        deleteBtn.onclick = () => {
            closeModal();
            showDeleteCharacteristicConfirm(id);
        };
    }

    fillCharacteristicForm(characteristic);

    const saveBtn = document.getElementById('save-mapper-characteristic');
    if (saveBtn) {
        saveBtn.onclick = () => handleUpdateCharacteristic(id);
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
    return {
        name_ua: document.getElementById('mapper-char-name-ua')?.value.trim() || '',
        name_ru: document.getElementById('mapper-char-name-ru')?.value.trim() || '',
        type: document.getElementById('mapper-char-type')?.value || 'text',
        unit: document.getElementById('mapper-char-unit')?.value.trim() || '',
        filter_type: document.getElementById('mapper-char-filter')?.value || 'none',
        is_global: document.getElementById('mapper-char-global')?.checked || false
    };
}

function fillCharacteristicForm(characteristic) {
    const nameUaField = document.getElementById('mapper-char-name-ua');
    const nameRuField = document.getElementById('mapper-char-name-ru');
    const typeField = document.getElementById('mapper-char-type');
    const unitField = document.getElementById('mapper-char-unit');
    const filterField = document.getElementById('mapper-char-filter');
    const globalField = document.getElementById('mapper-char-global');

    if (nameUaField) nameUaField.value = characteristic.name_ua || '';
    if (nameRuField) nameRuField.value = characteristic.name_ru || '';
    if (typeField) typeField.value = characteristic.type || 'text';
    if (unitField) unitField.value = characteristic.unit || '';
    if (filterField) filterField.value = characteristic.filter_type || 'none';
    if (globalField) globalField.checked = characteristic.is_global === 'true' || characteristic.is_global === true;
}

function clearCharacteristicForm() {
    const nameUaField = document.getElementById('mapper-char-name-ua');
    const nameRuField = document.getElementById('mapper-char-name-ru');
    const typeField = document.getElementById('mapper-char-type');
    const unitField = document.getElementById('mapper-char-unit');
    const filterField = document.getElementById('mapper-char-filter');
    const globalField = document.getElementById('mapper-char-global');

    if (nameUaField) nameUaField.value = '';
    if (nameRuField) nameRuField.value = '';
    if (typeField) typeField.value = 'text';
    if (unitField) unitField.value = '';
    if (filterField) filterField.value = 'none';
    if (globalField) globalField.checked = false;
}

// ═══════════════════════════════════════════════════════════════════════════
// ОПЦІЇ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модальне вікно для додавання опції
 */
export async function showAddOptionModal() {
    console.log('➕ Відкриття модального вікна для додавання опції');

    await showModal('mapper-option-edit', null);

    // Ініціалізувати кастомні селекти в модальному вікні
    const modalEl = document.getElementById('modal-mapper-option-edit');
    if (modalEl) initCustomSelects(modalEl);

    const title = document.getElementById('modal-title');
    if (title) title.textContent = 'Додати опцію';

    const deleteBtn = document.getElementById('delete-mapper-option');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    clearOptionForm();
    populateCharacteristicSelect();

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

    // Ініціалізувати кастомні селекти в модальному вікні
    const modalEl = document.getElementById('modal-mapper-option-edit');
    if (modalEl) initCustomSelects(modalEl);

    const title = document.getElementById('modal-title');
    if (title) title.textContent = 'Редагувати опцію';

    const deleteBtn = document.getElementById('delete-mapper-option');
    if (deleteBtn) {
        deleteBtn.classList.remove('u-hidden');
        deleteBtn.onclick = () => {
            closeModal();
            showDeleteOptionConfirm(id);
        };
    }

    populateCharacteristicSelect();
    fillOptionForm(option);

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

function populateCharacteristicSelect() {
    const select = document.getElementById('mapper-option-char');
    if (!select) return;

    const characteristics = getCharacteristics();

    select.innerHTML = '<option value="">— Оберіть характеристику —</option>';

    characteristics.forEach(char => {
        const option = document.createElement('option');
        option.value = char.id;
        option.textContent = char.name_ua || char.id;
        select.appendChild(option);
    });

    // Оновити кастомний селект після заповнення
    reinitializeCustomSelect(select);
}

// ═══════════════════════════════════════════════════════════════════════════
// МАРКЕТПЛЕЙСИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модальне вікно для додавання маркетплейсу
 */
export async function showAddMarketplaceModal() {
    console.log('➕ Відкриття модального вікна для додавання маркетплейсу');

    await showModal('mapper-marketplace-edit', null);

    const title = document.getElementById('modal-title');
    if (title) title.textContent = 'Додати маркетплейс';

    const deleteBtn = document.getElementById('delete-mapper-marketplace');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    clearMarketplaceForm();

    const saveBtn = document.getElementById('save-mapper-marketplace');
    if (saveBtn) {
        saveBtn.onclick = handleSaveNewMarketplace;
    }
}

/**
 * Показати модальне вікно для редагування маркетплейсу
 */
export async function showEditMarketplaceModal(id) {
    console.log(`✏️ Відкриття модального вікна для редагування маркетплейсу ${id}`);

    const marketplaces = getMarketplaces();
    const marketplace = marketplaces.find(m => m.id === id);

    if (!marketplace) {
        showToast('Маркетплейс не знайдено', 'error');
        return;
    }

    await showModal('mapper-marketplace-edit', null);

    const title = document.getElementById('modal-title');
    if (title) title.textContent = 'Редагувати маркетплейс';

    const deleteBtn = document.getElementById('delete-mapper-marketplace');
    if (deleteBtn) {
        deleteBtn.classList.remove('u-hidden');
        deleteBtn.onclick = () => {
            closeModal();
            showDeleteMarketplaceConfirm(id);
        };
    }

    fillMarketplaceForm(marketplace);

    const saveBtn = document.getElementById('save-mapper-marketplace');
    if (saveBtn) {
        saveBtn.onclick = () => handleUpdateMarketplace(id);
    }
}

/**
 * Показати дані маркетплейсу
 */
export async function showMarketplaceDataModal(id) {
    console.log(`👁️ Перегляд даних маркетплейсу ${id}`);

    const marketplaces = getMarketplaces();
    const marketplace = marketplaces.find(m => m.id === id);

    if (!marketplace) {
        showToast('Маркетплейс не знайдено', 'error');
        return;
    }

    // TODO: Реалізувати модальне вікно перегляду даних маркетплейсу
    showToast(`Перегляд даних: ${marketplace.name}`, 'info');
}

async function showDeleteMarketplaceConfirm(id) {
    const marketplaces = getMarketplaces();
    const marketplace = marketplaces.find(m => m.id === id);

    if (!marketplace) {
        showToast('Маркетплейс не знайдено', 'error');
        return;
    }

    const confirmed = await showConfirmModal({
        title: 'Видалити маркетплейс?',
        message: `Ви впевнені, що хочете видалити маркетплейс "${marketplace.name}"?`,
        confirmText: 'Видалити',
        cancelText: 'Скасувати',
        confirmClass: 'btn-danger'
    });

    if (confirmed) {
        try {
            await deleteMarketplace(id);
            showToast('Маркетплейс видалено', 'success');
            renderCurrentTab();
        } catch (error) {
            showToast('Помилка видалення маркетплейсу', 'error');
        }
    }
}

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
    return {
        name: document.getElementById('mapper-mp-name')?.value.trim() || '',
        slug: document.getElementById('mapper-mp-slug')?.value.trim() || '',
        is_active: document.getElementById('mapper-mp-active')?.checked || false
    };
}

function fillMarketplaceForm(marketplace) {
    const nameField = document.getElementById('mapper-mp-name');
    const slugField = document.getElementById('mapper-mp-slug');
    const activeField = document.getElementById('mapper-mp-active');

    if (nameField) nameField.value = marketplace.name || '';
    if (slugField) slugField.value = marketplace.slug || '';
    if (activeField) activeField.checked = marketplace.is_active === 'true' || marketplace.is_active === true;
}

function clearMarketplaceForm() {
    const nameField = document.getElementById('mapper-mp-name');
    const slugField = document.getElementById('mapper-mp-slug');
    const activeField = document.getElementById('mapper-mp-active');

    if (nameField) nameField.value = '';
    if (slugField) slugField.value = '';
    if (activeField) activeField.checked = true;
}

// ═══════════════════════════════════════════════════════════════════════════
// ІМПОРТ
// ═══════════════════════════════════════════════════════════════════════════

// Стан імпорту
let importState = {
    file: null,
    rawData: [],        // Сирі дані з файлу (всі рядки)
    parsedData: [],     // Дані після визначення заголовків
    fileHeaders: [],
    mapping: {},
    marketplaceId: null,
    dataType: 'characteristics',
    importTarget: 'marketplace',  // 'marketplace' або 'own'
    headerRow: 1        // Номер рядка із заголовками (1-based)
};

/**
 * Показати модальне вікно імпорту
 */
export async function showImportModal() {
    console.log('📥 Відкриття модального вікна імпорту');

    // Скинути стан
    importState = {
        file: null,
        rawData: [],
        parsedData: [],
        fileHeaders: [],
        mapping: {},
        marketplaceId: null,
        dataType: 'characteristics',
        importTarget: 'marketplace',
        headerRow: 1
    };

    await showModal('mapper-import', null);

    // Ініціалізувати кастомні селекти в модальному вікні
    const modalEl = document.getElementById('modal-mapper-import');
    if (modalEl) initCustomSelects(modalEl);

    const marketplaceSelect = document.getElementById('mapper-import-marketplace');
    if (marketplaceSelect) {
        populateMarketplaceSelect(marketplaceSelect);
        // Слухаємо зміну маркетплейса для завантаження збережених маппінгів
        marketplaceSelect.addEventListener('change', handleMarketplaceChange);
    }

    // Слухаємо зміну типу даних
    document.querySelectorAll('input[name="mapper-import-type"]').forEach(radio => {
        radio.addEventListener('change', handleDataTypeChange);
    });

    // Слухаємо зміну призначення імпорту
    document.querySelectorAll('input[name="mapper-import-target"]').forEach(radio => {
        radio.addEventListener('change', handleTargetChange);
    });

    // Ініціалізувати drag & drop для файлу
    initFileDropzone();

    // Кнопка імпорту
    const importBtn = document.getElementById('execute-mapper-import');
    if (importBtn) {
        importBtn.addEventListener('click', executeImport);
    }

    // Кнопка застосування рядка заголовків
    const applyHeaderBtn = document.getElementById('apply-header-row');
    if (applyHeaderBtn) {
        applyHeaderBtn.addEventListener('click', applyHeaderRow);
    }
}

function populateMarketplaceSelect(select) {
    const marketplaces = getMarketplaces();

    select.innerHTML = '<option value="">— Оберіть маркетплейс —</option>';

    marketplaces.forEach(mp => {
        if (mp.is_active === 'true' || mp.is_active === true) {
            const option = document.createElement('option');
            option.value = mp.id;
            option.textContent = mp.name || mp.slug;
            select.appendChild(option);
        }
    });

    // Оновити кастомний селект після заповнення
    reinitializeCustomSelect(select);
}

function handleMarketplaceChange(e) {
    importState.marketplaceId = e.target.value;

    if (importState.marketplaceId) {
        // Спробуємо завантажити збережений маппінг
        loadSavedMapping(importState.marketplaceId);
    }

    validateImport();
    updatePreviewTable();
}

function handleDataTypeChange(e) {
    importState.dataType = e.target.value;
    importState.mapping = {}; // Скидаємо маппінг при зміні типу
    updateMappingSections();
}

function handleTargetChange(e) {
    importState.importTarget = e.target.value;
    importState.mapping = {}; // Скидаємо маппінг при зміні призначення

    // Якщо обрано свій довідник - вимкнути вибір маркетплейса
    const mpSelect = document.getElementById('mapper-import-marketplace');
    const mpGroup = mpSelect?.closest('.form-group');

    if (importState.importTarget === 'own') {
        mpGroup?.classList.add('u-hidden');
        importState.marketplaceId = 'own'; // Псевдо ID для валідації
    } else {
        mpGroup?.classList.remove('u-hidden');
        importState.marketplaceId = mpSelect?.value || null;
    }

    // Перегенеровуємо маппінг з новими полями
    updateMappingSections();
}

function updateMappingSections() {
    // При зміні типу імпорту перегенеровуємо маппінг якщо є дані
    if (importState.fileHeaders.length > 0) {
        importState.mapping = {}; // Скидаємо маппінг
        populateColumnSelects(importState.fileHeaders);
        autoDetectMapping(importState.fileHeaders);
    }
}

function loadSavedMapping(marketplaceId) {
    const marketplaces = getMarketplaces();
    const mp = marketplaces.find(m => m.id === marketplaceId);

    if (mp && mp.column_mapping) {
        try {
            const savedMapping = JSON.parse(mp.column_mapping);
            if (savedMapping[importState.dataType]) {
                importState.mapping = savedMapping[importState.dataType];
                applyMappingToSelects();
                console.log('📋 Завантажено збережений маппінг:', importState.mapping);
            }
        } catch (e) {
            console.warn('⚠️ Помилка парсингу збереженого маппінгу:', e);
        }
    }
}

function applyMappingToSelects() {
    // Використовуємо нову функцію для динамічних селектів
    applyDynamicMappingToSelects();
}

function initFileDropzone() {
    const dropzone = document.getElementById('mapper-import-dropzone');
    const fileInput = document.getElementById('mapper-import-file');

    if (!dropzone || !fileInput) return;

    // Клік на dropzone
    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag & Drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    // Вибір файлу
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
}

async function handleFileSelect(file) {
    console.log('📄 Обрано файл:', file.name);

    const fileNameEl = document.getElementById('mapper-import-filename');
    if (fileNameEl) {
        fileNameEl.textContent = file.name;
    }

    importState.file = file;

    try {
        // Парсимо файл і зберігаємо сирі дані
        const rawData = await parseFileRaw(file);
        importState.rawData = rawData;

        console.log(`✅ Файл прочитано: ${rawData.length} рядків`);

        // Показуємо вибір рядка заголовків
        document.getElementById('header-row-group')?.classList.remove('u-hidden');

        // Скидаємо до рядка 1
        const headerRowInput = document.getElementById('mapper-import-header-row');
        if (headerRowInput) {
            headerRowInput.value = 1;
            headerRowInput.max = rawData.length;
        }
        importState.headerRow = 1;

        // Застосовуємо рядок заголовків
        applyHeaderRow();

        showToast(`Файл прочитано: ${rawData.length} рядків`, 'success');

    } catch (error) {
        console.error('❌ Помилка парсингу файлу:', error);
        showToast('Помилка читання файлу', 'error');
    }
}

/**
 * Застосувати вибраний рядок заголовків
 */
function applyHeaderRow() {
    const headerRowInput = document.getElementById('mapper-import-header-row');
    const headerRow = parseInt(headerRowInput?.value || '1', 10);

    if (headerRow < 1 || headerRow > importState.rawData.length) {
        showToast('Невірний номер рядка', 'error');
        return;
    }

    importState.headerRow = headerRow;
    importState.mapping = {}; // Скидаємо маппінг

    // Заголовки - це рядок headerRow (1-based), дані - всі рядки після нього
    const headerRowData = importState.rawData[headerRow - 1];
    const headers = headerRowData.map((h, i) => ({
        index: i,
        name: String(h || `Колонка ${i + 1}`).trim()
    }));

    const rows = importState.rawData.slice(headerRow).map(row =>
        headers.map((_, i) => String(row[i] || '').trim())
    );

    importState.fileHeaders = headers;
    importState.parsedData = rows;

    console.log(`📋 Заголовки з рядка ${headerRow}: ${headers.map(h => h.name).join(', ')}`);

    // Показуємо крок 2 (маппінг)
    document.getElementById('import-step-2')?.classList.remove('u-hidden');

    // Заповнюємо селекти колонок
    populateColumnSelects(headers);

    // Спробуємо автоматично визначити маппінг
    autoDetectMapping(headers);
}

/**
 * Парсинг файлу (CSV, XLSX, XLS) - повертає сирі дані
 */
async function parseFileRaw(file) {
    const extension = file.name.split('.').pop().toLowerCase();

    if (extension === 'csv') {
        return parseCSVRaw(file);
    } else if (extension === 'xlsx' || extension === 'xls') {
        return parseExcelRaw(file);
    } else {
        throw new Error('Непідтримуваний формат файлу');
    }
}

/**
 * Парсинг CSV файлу - повертає всі рядки як масив
 */
function parseCSVRaw(file) {
    return new Promise((resolve, reject) => {
        if (typeof Papa === 'undefined') {
            reject(new Error('PapaParse library not loaded'));
            return;
        }

        Papa.parse(file, {
            header: false,
            skipEmptyLines: false, // Не пропускаємо порожні рядки для правильної нумерації
            complete: (results) => {
                if (results.data.length === 0) {
                    reject(new Error('Файл порожній'));
                    return;
                }

                // Повертаємо сирі дані як масив масивів
                const rows = results.data.map(row =>
                    row.map(cell => cell || '')
                );

                resolve(rows);
            },
            error: (error) => {
                reject(error);
            }
        });
    });
}

/**
 * Парсинг Excel файлу - повертає всі рядки як масив
 */
function parseExcelRaw(file) {
    return new Promise((resolve, reject) => {
        if (typeof XLSX === 'undefined') {
            reject(new Error('XLSX library not loaded'));
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Беремо перший лист
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

                if (jsonData.length === 0) {
                    reject(new Error('Файл порожній'));
                    return;
                }

                // Нормалізуємо кількість колонок (робимо однаковою для всіх рядків)
                const maxCols = Math.max(...jsonData.map(row => row.length));
                const rows = jsonData.map(row => {
                    const normalized = [];
                    for (let i = 0; i < maxCols; i++) {
                        normalized.push(row[i] !== undefined ? row[i] : '');
                    }
                    return normalized;
                });

                resolve(rows);

            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error('Помилка читання файлу'));
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * Отримати доступні поля системи в залежності від типу імпорту
 */
function getSystemFields() {
    const fields = {
        // Дані маркетплейса - характеристики + опції
        marketplace_characteristics: [
            { key: 'char_id', label: 'ID характеристики', required: true },
            { key: 'char_name', label: 'Назва характеристики', required: true },
            { key: 'char_type', label: 'Тип параметра', required: false },
            { key: 'char_filter_type', label: 'Тип фільтра', required: false },
            { key: 'char_unit', label: 'Одиниця виміру', required: false },
            { key: 'char_is_global', label: 'Наскрізний параметр', required: false },
            { key: 'option_id', label: 'ID опції/значення', required: false },
            { key: 'option_name', label: 'Назва опції/значення', required: false },
            { key: 'category_id', label: 'ID категорії', required: false },
            { key: 'category_name', label: 'Назва категорії', required: false }
        ],
        // Дані маркетплейса - категорії
        marketplace_categories: [
            { key: 'cat_id', label: 'ID категорії', required: true },
            { key: 'cat_name', label: 'Назва категорії', required: true },
            { key: 'parent_id', label: 'ID батьківської категорії', required: false },
            { key: 'parent_name', label: 'Назва батьківської категорії', required: false }
        ],
        // Свій довідник - характеристики + опції
        // Поля БД: id, name_ua, name_ru, type, unit, filter_type, is_global, category_ids, parent_option_id, created_at
        // id та created_at генеруються автоматично
        own_characteristics: [
            { key: 'own_char_name_ua', label: 'name_ua (Назва UA)', required: true },
            { key: 'own_char_name_ru', label: 'name_ru (Назва RU)', required: false },
            { key: 'own_char_type', label: 'type (Тип параметра)', required: false },
            { key: 'own_char_unit', label: 'unit (Одиниця виміру)', required: false },
            { key: 'own_char_filter_type', label: 'filter_type (Тип фільтра)', required: false },
            { key: 'own_char_is_global', label: 'is_global (Наскрізний)', required: false },
            { key: 'own_char_category_ids', label: 'category_ids (ID категорій)', required: false },
            { key: 'own_option_value_ua', label: 'Опція: value_ua', required: false },
            { key: 'own_option_value_ru', label: 'Опція: value_ru', required: false },
            { key: 'own_option_parent_id', label: 'Опція: parent_option_id', required: false }
        ],
        // Свій довідник - категорії
        own_categories: [
            { key: 'own_cat_id', label: 'ID категорії', required: false },
            { key: 'own_cat_name_ua', label: 'Назва категорії (UA)', required: true },
            { key: 'own_cat_name_ru', label: 'Назва категорії (RU)', required: false },
            { key: 'own_cat_parent', label: 'Батьківська категорія', required: false }
        ]
    };

    const key = `${importState.importTarget}_${importState.dataType}`;
    return fields[key] || [];
}

/**
 * Генерувати динамічний маппінг для колонок файлу
 */
function populateColumnSelects(headers) {
    const container = document.getElementById('dynamic-mapping-container');
    if (!container) return;

    // Отримуємо доступні поля системи
    const systemFields = getSystemFields();

    // Очищаємо контейнер (залишаємо заголовок)
    const headerRow = container.querySelector('.mapping-header');
    container.innerHTML = '';
    if (headerRow) container.appendChild(headerRow);

    // Генеруємо рядок для кожної колонки з файлу
    headers.forEach((header, idx) => {
        // Отримуємо приклад даних (перші 3 значення)
        const sampleValues = importState.parsedData
            .slice(0, 3)
            .map(row => row[header.index] || '')
            .filter(v => v)
            .join(', ');

        const row = document.createElement('div');
        row.className = 'mapping-row';
        row.innerHTML = `
            <div class="mapping-label">
                <strong>${header.name}</strong>
            </div>
            <div class="mapping-select">
                <select data-column-index="${header.index}" data-custom-select>
                    <option value="">— Пропустити —</option>
                    ${systemFields.map(f => `
                        <option value="${f.key}"${f.required ? ' data-required="true"' : ''}>
                            ${f.label}${f.required ? ' *' : ''}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="mapping-preview">${sampleValues || '—'}</div>
        `;

        container.appendChild(row);

        // Ініціалізуємо кастомний селект
        const select = row.querySelector('select');
        if (select) {
            reinitializeCustomSelect(select);
            select.addEventListener('change', handleDynamicMappingChange);
        }
    });
}

/**
 * Обробник зміни динамічного маппінгу
 */
function handleDynamicMappingChange(e) {
    const columnIndex = parseInt(e.target.dataset.columnIndex, 10);
    const systemField = e.target.value;

    // Видаляємо старе призначення цього поля (якщо було)
    Object.keys(importState.mapping).forEach(field => {
        if (importState.mapping[field] === columnIndex) {
            delete importState.mapping[field];
        }
    });

    // Додаємо нове призначення
    if (systemField) {
        // Видаляємо це поле з іншої колонки (якщо було)
        Object.keys(importState.mapping).forEach(field => {
            if (field === systemField) {
                // Скидаємо селект іншої колонки
                const oldSelect = document.querySelector(`select[data-column-index="${importState.mapping[field]}"]`);
                if (oldSelect && oldSelect !== e.target) {
                    oldSelect.value = '';
                    reinitializeCustomSelect(oldSelect);
                }
            }
        });

        importState.mapping[systemField] = columnIndex;
    }

    console.log('📋 Оновлений маппінг:', importState.mapping);
    validateImport();
    updatePreviewTable();
}

/**
 * Автоматичне визначення маппінгу
 */
function autoDetectMapping(headers) {
    // Ключові слова для автодетекту - розширений список
    const patterns = {
        // Маркетплейс - характеристики
        char_id: ['id параметра', 'id характеристики', 'характеристика id', 'attr_id', 'attribute_id', 'characteristic_id', 'param_id', 'ідентифікатор параметра'],
        char_name: ['назва параметра', 'назва характеристики', 'характеристика', 'attribute', 'param_name', 'attribute_name', 'параметр'],
        char_type: ['тип параметра', 'тип характеристики', 'param_type', 'attribute_type'],
        char_filter_type: ['тип фільтра', 'filter_type', 'фільтр'],
        char_unit: ['одиниця', 'одиниця виміру', 'unit', 'од.'],
        char_is_global: ['наскрізний', 'глобальний', 'is_global', 'global'],
        option_id: ['id значення', 'id опції', 'опція id', 'option_id', 'value_id'],
        option_name: ['назва значення', 'назва опції', 'опція', 'option', 'value', 'значення'],
        category_id: ['id категорії', 'категорія id', 'category_id', 'cat_id'],
        category_name: ['назва категорії', 'категорія', 'category', 'cat_name'],

        // Маркетплейс - категорії
        cat_id: ['id категорії', 'категорія id', 'category_id', 'cat_id'],
        cat_name: ['назва категорії', 'категорія', 'category', 'cat_name', 'назва'],
        parent_id: ['id батьківської', 'parent_id', 'parent', 'батьківська id'],
        parent_name: ['батьківська категорія', 'parent_name', 'parent category', 'батьківська'],

        // Свій довідник - характеристики (поля БД)
        own_char_name_ua: ['name_ua', 'назва ua', 'назва укр', 'назва'],
        own_char_name_ru: ['name_ru', 'назва ru', 'назва рус'],
        own_char_type: ['type', 'тип параметра', 'тип'],
        own_char_unit: ['unit', 'одиниця', 'од.'],
        own_char_filter_type: ['filter_type', 'тип фільтра', 'filter'],
        own_char_is_global: ['is_global', 'наскрізний', 'глобальний', 'global'],
        own_char_category_ids: ['category_ids', 'id категорій', 'категорії'],
        own_option_value_ua: ['value_ua', 'значення ua', 'значення', 'опція'],
        own_option_value_ru: ['value_ru', 'значення ru'],
        own_option_parent_id: ['parent_option_id', 'parent_id', 'батьківська опція'],

        // Свій довідник - категорії
        own_cat_id: ['id', 'ід'],
        own_cat_name_ua: ['назва ua', 'назва укр', 'name_ua', 'назва'],
        own_cat_name_ru: ['назва ru', 'назва рус', 'name_ru'],
        own_cat_parent: ['батьківська', 'parent', 'parent_id']
    };

    // Отримуємо доступні поля для поточного типу імпорту
    const availableFields = getSystemFields().map(f => f.key);

    const detectedMapping = {};

    // Для кожного заголовка шукаємо відповідне поле
    headers.forEach(header => {
        const headerLower = header.name.toLowerCase().trim();

        // Шукаємо серед доступних полів
        for (const field of availableFields) {
            if (detectedMapping[field] !== undefined) continue; // вже призначено

            const fieldPatterns = patterns[field] || [];

            // Перевіряємо чи заголовок містить один з паттернів
            for (const pattern of fieldPatterns) {
                if (headerLower.includes(pattern.toLowerCase()) ||
                    pattern.toLowerCase().includes(headerLower)) {
                    detectedMapping[field] = header.index;
                    break;
                }
            }

            if (detectedMapping[field] !== undefined) break;
        }
    });

    // Застосувати автодетект якщо немає збереженого маппінгу
    if (Object.keys(importState.mapping).length === 0) {
        importState.mapping = detectedMapping;
        applyDynamicMappingToSelects();
        console.log('🔍 Автовизначений маппінг:', detectedMapping);
    }

    validateImport();
    updatePreviewTable();
}

/**
 * Застосувати маппінг до динамічних селектів
 */
function applyDynamicMappingToSelects() {
    Object.entries(importState.mapping).forEach(([systemField, columnIndex]) => {
        const select = document.querySelector(`select[data-column-index="${columnIndex}"]`);
        if (select) {
            select.value = systemField;
            reinitializeCustomSelect(select);
        }
    });
}

/**
 * Обробник зміни маппінгу (старий - для сумісності)
 */
function handleMappingChange(e) {
    const field = e.target.dataset.mappingField;
    const columnIndex = e.target.value;

    if (columnIndex === '') {
        delete importState.mapping[field];
    } else {
        importState.mapping[field] = parseInt(columnIndex, 10);
    }

    validateImport();
    updatePreviewTable();
}

/**
 * Перевірити валідність імпорту
 */
function validateImport() {
    const importBtn = document.getElementById('execute-mapper-import');
    if (!importBtn) return;

    let isValid = true;

    // Отримуємо обов'язкові поля з системних полів
    const systemFields = getSystemFields();
    const requiredFields = systemFields.filter(f => f.required).map(f => f.key);

    // Перевіряємо чи обрано маркетплейс (якщо імпортуємо для маркетплейса)
    if (importState.importTarget === 'marketplace' && !importState.marketplaceId) {
        isValid = false;
    }

    // Перевіряємо обов'язкові поля
    requiredFields.forEach(field => {
        if (importState.mapping[field] === undefined) {
            isValid = false;
        }
    });

    // Перевіряємо чи є дані
    if (importState.parsedData.length === 0) {
        isValid = false;
    }

    importBtn.disabled = !isValid;

    // Оновлюємо візуальну індикацію обов'язкових полів
    updateRequiredFieldsIndicator(requiredFields);
}

/**
 * Оновити індикатор заповнення обов'язкових полів
 */
function updateRequiredFieldsIndicator(requiredFields) {
    const container = document.getElementById('dynamic-mapping-container');
    if (!container) return;

    // Скидаємо всі попередні підсвітки
    container.querySelectorAll('.mapping-row').forEach(row => {
        row.classList.remove('mapping-row-missing', 'mapping-row-filled');
    });

    // Підсвічуємо заповнені/незаповнені обов'язкові поля
    requiredFields.forEach(field => {
        const columnIndex = importState.mapping[field];
        if (columnIndex !== undefined) {
            const select = container.querySelector(`select[data-column-index="${columnIndex}"]`);
            if (select) {
                select.closest('.mapping-row')?.classList.add('mapping-row-filled');
            }
        }
    });

    // Показуємо які обов'язкові поля ще не призначені
    const missingFields = requiredFields.filter(f => importState.mapping[f] === undefined);
    if (missingFields.length > 0) {
        const systemFields = getSystemFields();
        const missingLabels = missingFields.map(f => {
            const sf = systemFields.find(s => s.key === f);
            return sf ? sf.label : f;
        });
        console.log('⚠️ Не призначені обов\'язкові поля:', missingLabels.join(', '));
    }
}

/**
 * Оновити таблицю попереднього перегляду
 */
function updatePreviewTable() {
    const previewContainer = document.getElementById('mapper-import-preview');
    const thead = document.getElementById('preview-table-head');
    const tbody = document.getElementById('preview-table-body');

    if (!thead || !tbody) return;

    // Отримуємо активні маппінги (тільки ті поля, які призначені)
    const systemFields = getSystemFields();
    const activeMapping = Object.entries(importState.mapping)
        .filter(([field]) => systemFields.some(sf => sf.key === field))
        .map(([field, colIndex]) => {
            const sf = systemFields.find(s => s.key === field);
            return {
                field,
                colIndex,
                label: sf ? sf.label : field,
                required: sf ? sf.required : false
            };
        });

    if (activeMapping.length === 0 || importState.parsedData.length === 0) {
        previewContainer?.classList.add('u-hidden');
        return;
    }

    previewContainer?.classList.remove('u-hidden');

    thead.innerHTML = `
        <tr>
            <th>#</th>
            ${activeMapping.map(m => `<th>${m.label}</th>`).join('')}
            <th>Статус</th>
        </tr>
    `;

    // Показуємо перші 50 рядків
    const previewRows = importState.parsedData.slice(0, 50);
    let newCount = 0, updateCount = 0, sameCount = 0;

    tbody.innerHTML = previewRows.map((row, i) => {
        const status = 'new'; // TODO: Порівняти з існуючими даними
        if (status === 'new') newCount++;
        else if (status === 'update') updateCount++;
        else sameCount++;

        const statusClass = status === 'new' ? 'status-new' : status === 'update' ? 'status-update' : 'status-same';
        const statusIcon = status === 'new' ? 'add_circle' : status === 'update' ? 'sync' : 'check_circle';

        return `
            <tr class="${statusClass}">
                <td>${i + 1}</td>
                ${activeMapping.map(m => `<td>${row[m.colIndex] || ''}</td>`).join('')}
                <td><span class="material-symbols-outlined">${statusIcon}</span></td>
            </tr>
        `;
    }).join('');

    // Оновити лічильники
    const newCountEl = document.getElementById('preview-new-count');
    const updateCountEl = document.getElementById('preview-update-count');
    const sameCountEl = document.getElementById('preview-same-count');

    if (newCountEl) newCountEl.textContent = newCount;
    if (updateCountEl) updateCountEl.textContent = updateCount;
    if (sameCountEl) sameCountEl.textContent = sameCount;
}

/**
 * Виконати імпорт
 */
async function executeImport() {
    console.log('📥 Виконання імпорту...');

    const importBtn = document.getElementById('execute-mapper-import');
    const modalContent = document.querySelector('#modal-mapper-import .modal-body');

    if (importBtn) {
        importBtn.disabled = true;
        importBtn.querySelector('.label').textContent = 'Імпортую...';
    }

    // Показуємо прогрес бар
    const loader = showLoader(modalContent, {
        type: 'progress',
        message: 'Підготовка до імпорту...',
        overlay: true
    });

    try {
        loader.updateProgress(5, 'Підготовка даних...');

        // Зберегти маппінг якщо обрано (тільки для маркетплейса)
        if (importState.importTarget === 'marketplace') {
            const saveMapping = document.getElementById('mapper-import-save-mapping')?.checked;
            if (saveMapping && importState.marketplaceId) {
                loader.updateProgress(10, 'Збереження маппінгу...');
                await saveColumnMapping();
            }
        }

        loader.updateProgress(15, 'Імпортую дані...');

        // Виконати імпорт даних з передачею функції прогресу
        if (importState.importTarget === 'marketplace') {
            // Імпорт для маркетплейса
            if (importState.dataType === 'characteristics') {
                await importCharacteristicsAndOptions((percent, msg) => {
                    loader.updateProgress(15 + percent * 0.8, msg);
                });
            } else {
                await importCategories((percent, msg) => {
                    loader.updateProgress(15 + percent * 0.8, msg);
                });
            }
        } else {
            // Імпорт для свого довідника
            if (importState.dataType === 'characteristics') {
                await importOwnCharacteristicsAndOptions((percent, msg) => {
                    loader.updateProgress(15 + percent * 0.8, msg);
                });
            } else {
                await importOwnCategories((percent, msg) => {
                    loader.updateProgress(15 + percent * 0.8, msg);
                });
            }
        }

        loader.updateProgress(100, 'Імпорт завершено!');

        setTimeout(() => {
            loader.hide();
            showToast('Імпорт завершено успішно!', 'success');
            closeModal();
            renderCurrentTab();
        }, 500);

    } catch (error) {
        console.error('❌ Помилка імпорту:', error);
        loader.hide();
        showToast(`Помилка імпорту: ${error.message}`, 'error');
    } finally {
        if (importBtn) {
            importBtn.disabled = false;
            importBtn.querySelector('.label').textContent = 'Імпортувати';
        }
    }
}

/**
 * Зберегти маппінг колонок
 */
async function saveColumnMapping() {
    const marketplaces = getMarketplaces();
    const mp = marketplaces.find(m => m.id === importState.marketplaceId);

    if (!mp) return;

    let columnMapping = {};
    try {
        columnMapping = JSON.parse(mp.column_mapping || '{}');
    } catch (e) {
        columnMapping = {};
    }

    columnMapping[importState.dataType] = importState.mapping;

    await updateMarketplace(importState.marketplaceId, {
        column_mapping: JSON.stringify(columnMapping)
    });

    console.log('💾 Маппінг збережено');
}

/**
 * Імпорт характеристик та опцій маркетплейса
 * @param {Function} onProgress - Callback для оновлення прогресу (percent, message)
 */
async function importCharacteristicsAndOptions(onProgress = () => {}) {
    const { callSheetsAPI } = await import('../utils/api-client.js');

    onProgress(10, 'Обробка даних файлу...');

    // Отримуємо індекси колонок з маппінгу
    const m = importState.mapping;
    const charIdCol = m.char_id;
    const charNameCol = m.char_name;
    const charTypeCol = m.char_type;
    const charFilterTypeCol = m.char_filter_type;
    const charUnitCol = m.char_unit;
    const charIsGlobalCol = m.char_is_global;
    const optionIdCol = m.option_id;
    const optionNameCol = m.option_name;
    const categoryIdCol = m.category_id;
    const categoryNameCol = m.category_name;

    const mpCharacteristics = new Map(); // mp_char_id -> характеристика
    const mpOptions = [];

    importState.parsedData.forEach(row => {
        const charId = charIdCol !== undefined ? String(row[charIdCol] || '').trim() : '';
        const charName = charNameCol !== undefined ? String(row[charNameCol] || '').trim() : '';

        if (charId && charName) {
            // Додаємо/оновлюємо характеристику
            if (!mpCharacteristics.has(charId)) {
                mpCharacteristics.set(charId, {
                    mp_char_id: charId,
                    mp_char_name: charName,
                    mp_char_type: charTypeCol !== undefined ? String(row[charTypeCol] || '').trim() : '',
                    mp_char_filter_type: charFilterTypeCol !== undefined ? String(row[charFilterTypeCol] || '').trim() : '',
                    mp_char_unit: charUnitCol !== undefined ? String(row[charUnitCol] || '').trim() : '',
                    mp_char_is_global: charIsGlobalCol !== undefined ? String(row[charIsGlobalCol] || '').trim() : '',
                    mp_category_id: categoryIdCol !== undefined ? String(row[categoryIdCol] || '').trim() : '',
                    mp_category_name: categoryNameCol !== undefined ? String(row[categoryNameCol] || '').trim() : ''
                });
            }
        }

        // Опції
        const optionId = optionIdCol !== undefined ? String(row[optionIdCol] || '').trim() : '';
        const optionName = optionNameCol !== undefined ? String(row[optionNameCol] || '').trim() : '';

        if (optionId && optionName && charId) {
            // Перевіряємо чи така опція вже є
            const exists = mpOptions.some(o =>
                o.mp_char_id === charId && o.mp_option_id === optionId
            );
            if (!exists) {
                mpOptions.push({
                    mp_char_id: charId,
                    mp_option_id: optionId,
                    mp_option_name: optionName
                });
            }
        }
    });

    const characteristicsList = Array.from(mpCharacteristics.values());
    console.log(`📊 Характеристик: ${characteristicsList.length}, Опцій: ${mpOptions.length}`);

    onProgress(50, `Запис ${characteristicsList.length} характеристик...`);

    // Записуємо характеристики маркетплейса
    // Структура таблиці: marketplace_id, mp_char_id, mp_char_name, mp_char_type, mp_filter_type, mp_unit, mp_is_global, mp_category_id, mp_category_name, our_char_id
    if (characteristicsList.length > 0) {
        const charRows = characteristicsList.map(c => [
            importState.marketplaceId,
            c.mp_char_id,
            c.mp_char_name,
            c.mp_char_type,
            c.mp_char_filter_type,
            c.mp_char_unit,
            c.mp_char_is_global,
            c.mp_category_id,
            c.mp_category_name,
            '' // our_char_id - для маппінгу
        ]);

        await callSheetsAPI('append', {
            range: 'Mapper_MP_Characteristics!A:J',
            values: charRows,
            spreadsheetType: 'main'
        });
    }

    onProgress(75, `Запис ${mpOptions.length} опцій...`);

    // Записуємо опції маркетплейса
    // Структура: marketplace_id, mp_char_id, mp_option_id, mp_option_name, our_option_id
    if (mpOptions.length > 0) {
        const optRows = mpOptions.map(o => [
            importState.marketplaceId,
            o.mp_char_id,
            o.mp_option_id,
            o.mp_option_name,
            '' // our_option_id - для маппінгу
        ]);

        await callSheetsAPI('append', {
            range: 'Mapper_MP_Options!A:E',
            values: optRows,
            spreadsheetType: 'main'
        });
    }

    onProgress(100, 'Готово!');
}

/**
 * Імпорт категорій
 * @param {Function} onProgress - Callback для оновлення прогресу (percent, message)
 */
async function importCategories(onProgress = () => {}) {
    const { callSheetsAPI } = await import('../utils/api-client.js');

    onProgress(10, 'Обробка категорій...');

    const catIdCol = importState.mapping.cat_id;
    const catNameCol = importState.mapping.cat_name;
    const parentIdCol = importState.mapping.parent_id;
    const parentNameCol = importState.mapping.parent_name;

    const mpCategories = [];

    importState.parsedData.forEach(row => {
        const catId = row[catIdCol] || '';
        const catName = row[catNameCol] || '';

        if (catId && catName) {
            mpCategories.push({
                mp_cat_id: catId,
                mp_cat_name: catName,
                mp_parent_id: parentIdCol !== undefined ? row[parentIdCol] : '',
                mp_parent_name: parentNameCol !== undefined ? row[parentNameCol] : ''
            });
        }
    });

    console.log(`📊 Категорій: ${mpCategories.length}`);
    onProgress(50, `Запис ${mpCategories.length} категорій...`);

    if (mpCategories.length > 0) {
        const catRows = mpCategories.map(c => [
            importState.marketplaceId,
            c.mp_cat_id,
            c.mp_cat_name,
            c.mp_parent_id,
            c.mp_parent_name,
            '' // our_cat_id - для маппінгу
        ]);

        await callSheetsAPI('append', {
            range: 'Mapper_MP_Categories!A:F',
            values: catRows,
            spreadsheetType: 'main'
        });
    }

    onProgress(100, 'Готово!');
}

// ═══════════════════════════════════════════════════════════════════════════
// ІМПОРТ ДЛЯ СВОГО ДОВІДНИКА
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Імпорт своїх характеристик та опцій
 * @param {Function} onProgress - Callback для оновлення прогресу (percent, message)
 */
async function importOwnCharacteristicsAndOptions(onProgress = () => {}) {
    onProgress(5, 'Обробка даних файлу...');
    // Отримуємо індекси колонок з маппінгу
    const m = importState.mapping;
    const nameUaCol = m.own_char_name_ua;
    const nameRuCol = m.own_char_name_ru;
    const typeCol = m.own_char_type;
    const filterTypeCol = m.own_char_filter_type;
    const unitCol = m.own_char_unit;
    const isGlobalCol = m.own_char_is_global;
    const categoryIdsCol = m.own_char_category_ids;
    const optionUaCol = m.own_option_value_ua;
    const optionRuCol = m.own_option_value_ru;
    const optionParentIdCol = m.own_option_parent_id;

    const characteristics = new Map(); // name_ua -> char object
    const options = []; // {char_name_ua, value_ua, value_ru, parent_option_id}

    importState.parsedData.forEach(row => {
        const nameUa = nameUaCol !== undefined ? String(row[nameUaCol] || '').trim() : '';
        const nameRu = nameRuCol !== undefined ? String(row[nameRuCol] || '').trim() : '';

        if (nameUa) {
            // Додаємо характеристику якщо ще немає
            if (!characteristics.has(nameUa)) {
                // Визначаємо тип: якщо є опції - select, інакше text
                const hasOptions = optionUaCol !== undefined;
                const charType = typeCol !== undefined ? String(row[typeCol] || '').trim() : (hasOptions ? 'select' : 'text');

                // Визначаємо is_global
                let isGlobal = false;
                if (isGlobalCol !== undefined) {
                    const globalValue = String(row[isGlobalCol] || '').toLowerCase().trim();
                    isGlobal = ['true', '1', 'так', 'yes', '+', 'да'].includes(globalValue);
                }

                characteristics.set(nameUa, {
                    name_ua: nameUa,
                    name_ru: nameRu,
                    type: charType || 'text',
                    filter_type: filterTypeCol !== undefined ? String(row[filterTypeCol] || '').trim() : 'none',
                    unit: unitCol !== undefined ? String(row[unitCol] || '').trim() : '',
                    is_global: isGlobal,
                    category_ids: categoryIdsCol !== undefined ? String(row[categoryIdsCol] || '').trim() : ''
                });
            }

            // Якщо є опція
            if (optionUaCol !== undefined) {
                const optionUa = String(row[optionUaCol] || '').trim();
                const optionRu = optionRuCol !== undefined ? String(row[optionRuCol] || '').trim() : '';
                const parentOptionId = optionParentIdCol !== undefined ? String(row[optionParentIdCol] || '').trim() : '';

                if (optionUa) {
                    // Перевіряємо чи така опція вже є для цієї характеристики
                    const exists = options.some(o =>
                        o.char_name_ua === nameUa && o.value_ua === optionUa
                    );
                    if (!exists) {
                        options.push({
                            char_name_ua: nameUa,
                            value_ua: optionUa,
                            value_ru: optionRu,
                            parent_option_id: parentOptionId
                        });
                    }
                }
            }
        }
    });

    console.log(`📊 Характеристик: ${characteristics.size}, Опцій: ${options.length}`);

    // Додаємо характеристики через існуючу функцію
    const charIdMap = new Map(); // name_ua -> id
    const totalChars = characteristics.size;
    let charIndex = 0;

    for (const [nameUa, char] of characteristics) {
        charIndex++;
        const charPercent = Math.round(20 + (charIndex / totalChars) * 40);
        onProgress(charPercent, `Характеристика ${charIndex}/${totalChars}: ${nameUa}`);

        try {
            const newChar = await addCharacteristic({
                name_ua: char.name_ua,
                name_ru: char.name_ru,
                type: char.type,
                unit: char.unit,
                filter_type: char.filter_type,
                is_global: char.is_global,
                category_ids: char.category_ids
            });
            charIdMap.set(nameUa, newChar.id);
        } catch (e) {
            console.warn(`⚠️ Не вдалося додати характеристику "${nameUa}":`, e);
        }
    }

    // Додаємо опції
    const totalOpts = options.length;
    let optIndex = 0;

    for (const opt of options) {
        optIndex++;
        const optPercent = Math.round(60 + (optIndex / Math.max(totalOpts, 1)) * 35);
        onProgress(optPercent, `Опція ${optIndex}/${totalOpts}: ${opt.value_ua}`);

        const charId = charIdMap.get(opt.char_name_ua);
        if (charId) {
            try {
                await addOption({
                    characteristic_id: charId,
                    value_ua: opt.value_ua,
                    value_ru: opt.value_ru,
                    parent_option_id: opt.parent_option_id,
                    sort_order: '0'
                });
            } catch (e) {
                console.warn(`⚠️ Не вдалося додати опцію "${opt.value_ua}":`, e);
            }
        }
    }

    onProgress(100, 'Готово!');
}

/**
 * Імпорт своїх категорій
 * @param {Function} onProgress - Callback для оновлення прогресу (percent, message)
 */
async function importOwnCategories(onProgress = () => {}) {
    onProgress(5, 'Обробка категорій...');

    const nameUaCol = importState.mapping.own_cat_name_ua;
    const nameRuCol = importState.mapping.own_cat_name_ru;
    const parentCol = importState.mapping.own_cat_parent;

    // Спочатку збираємо всі унікальні категорії
    const categories = new Map(); // name_ua -> {name_ua, name_ru, parent_name}

    importState.parsedData.forEach(row => {
        const nameUa = row[nameUaCol]?.trim() || '';
        const nameRu = nameRuCol !== undefined ? row[nameRuCol]?.trim() : '';
        const parentName = parentCol !== undefined ? row[parentCol]?.trim() : '';

        if (nameUa && !categories.has(nameUa)) {
            categories.set(nameUa, {
                name_ua: nameUa,
                name_ru: nameRu || '',
                parent_name: parentName || ''
            });
        }
    });

    console.log(`📊 Категорій: ${categories.size}`);

    // Створюємо категорії в правильному порядку (спочатку без батьківських)
    const catIdMap = new Map(); // name_ua -> id
    const totalCats = categories.size;
    let catIndex = 0;

    // Перший прохід: категорії без батьківських
    onProgress(20, 'Додаю кореневі категорії...');

    for (const [nameUa, cat] of categories) {
        if (!cat.parent_name) {
            catIndex++;
            onProgress(20 + (catIndex / totalCats) * 35, `Категорія ${catIndex}/${totalCats}: ${nameUa}`);

            try {
                const newCat = await addCategory({
                    name_ua: cat.name_ua,
                    name_ru: cat.name_ru,
                    parent_id: ''
                });
                catIdMap.set(nameUa, newCat.id);
            } catch (e) {
                console.warn(`⚠️ Не вдалося додати категорію "${nameUa}":`, e);
            }
        }
    }

    // Другий прохід: категорії з батьківськими
    onProgress(55, 'Додаю підкатегорії...');

    for (const [nameUa, cat] of categories) {
        if (cat.parent_name && !catIdMap.has(nameUa)) {
            catIndex++;
            onProgress(55 + ((catIndex - catIdMap.size) / Math.max(totalCats - catIdMap.size, 1)) * 40, `Підкатегорія: ${nameUa}`);

            const parentId = catIdMap.get(cat.parent_name) || '';
            try {
                const newCat = await addCategory({
                    name_ua: cat.name_ua,
                    name_ru: cat.name_ru,
                    parent_id: parentId
                });
                catIdMap.set(nameUa, newCat.id);
            } catch (e) {
                console.warn(`⚠️ Не вдалося додати категорію "${nameUa}":`, e);
            }
        }
    }

    onProgress(100, 'Готово!');
}
