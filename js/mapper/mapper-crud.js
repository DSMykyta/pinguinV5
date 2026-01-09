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

// ═══════════════════════════════════════════════════════════════════════════
// КАТЕГОРІЇ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модальне вікно для додавання категорії
 */
export async function showAddCategoryModal() {
    console.log('➕ Відкриття модального вікна для додавання категорії');

    await showModal('mapper-category-edit', null);

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

/**
 * Показати модальне вікно імпорту
 */
export async function showImportModal() {
    console.log('📥 Відкриття модального вікна імпорту');

    await showModal('mapper-import', null);

    const marketplaceSelect = document.getElementById('mapper-import-marketplace');
    if (marketplaceSelect) {
        populateMarketplaceSelect(marketplaceSelect);
    }

    // Ініціалізувати drag & drop для файлу
    initFileDropzone();
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
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');

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

    // TODO: Парсинг файлу та показ попереднього перегляду
    showToast(`Файл "${file.name}" обрано`, 'info');
}
