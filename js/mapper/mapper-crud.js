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
    addMarketplace, updateMarketplace, deleteMarketplace, getMarketplaces,
    getMpCharacteristics, getMpOptions,
    batchCreateCharacteristicMapping, batchCreateOptionMapping,
    autoMapCharacteristics, autoMapOptions,
    getMappedMpCharacteristics, getMappedMpOptions,
    deleteCharacteristicMapping, deleteOptionMapping
} from './mapper-data.js';
import { mapperState } from './mapper-init.js';
import { getBatchBar } from '../common/ui-batch-actions.js';
import { renderCurrentTab } from './mapper-table.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { showConfirmModal } from '../common/ui-modal-confirm.js';
import { initCustomSelects, reinitializeCustomSelect } from '../common/ui-select.js';
import { showLoader } from '../common/ui-loading.js';
import { escapeHtml } from '../utils/text-utils.js';

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

    // Заповнюємо список пов'язаних характеристик
    populateRelatedCharacteristics(id);

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
 * Заповнити мульти-селект категорій
 */
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

    // Оновити кастомний селект після заповнення
    reinitializeCustomSelect(select);
}

/**
 * Заповнити мульти-селект батьківських опцій (для залежних характеристик)
 */
function populateParentOptionsSelect(selectedOptionIds = []) {
    const select = document.getElementById('mapper-char-parent-option');
    if (!select) return;

    const options = getOptions();
    const characteristics = getCharacteristics();

    // Створюємо мапу характеристик за ID для швидкого пошуку
    const charMap = new Map();
    characteristics.forEach(char => {
        charMap.set(char.id, char);
    });

    select.innerHTML = '';

    // Групуємо опції за характеристиками
    const optionsByChar = new Map();
    options.forEach(opt => {
        if (!opt.characteristic_id) return;
        if (!optionsByChar.has(opt.characteristic_id)) {
            optionsByChar.set(opt.characteristic_id, []);
        }
        optionsByChar.get(opt.characteristic_id).push(opt);
    });

    // Додаємо опції, згруповані за характеристиками
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

    // Оновити кастомний селект після заповнення
    reinitializeCustomSelect(select);
}

/**
 * Показати модальне вікно для додавання характеристики
 */
export async function showAddCharacteristicModal() {
    console.log('➕ Відкриття модального вікна для додавання характеристики');

    await showModal('mapper-characteristic-edit', null);

    // Ініціалізувати кастомні селекти в модальному вікні
    const modalEl = document.getElementById('modal-mapper-characteristic-edit');
    if (modalEl) initCustomSelects(modalEl);

    // Ініціалізувати перемикач глобальності
    initGlobalToggleHandler();

    const title = document.getElementById('modal-title');
    if (title) title.textContent = 'Додати характеристику';

    const deleteBtn = document.getElementById('delete-mapper-characteristic');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    clearCharacteristicForm();
    populateCategorySelect();
    populateParentOptionsSelect();
    clearRelatedOptions();

    const saveBtn = document.getElementById('save-mapper-characteristic');
    if (saveBtn) {
        saveBtn.onclick = handleSaveNewCharacteristic;
    }
}

/**
 * Очистити список пов'язаних опцій (для нової характеристики)
 */
function clearRelatedOptions() {
    const container = document.getElementById('char-related-options');
    const countEl = document.getElementById('char-options-count');
    if (!container) return;

    container.innerHTML = `
        <div class="modal-related-empty">
            <span class="modal-related-empty-text">Опції з'являться після збереження</span>
        </div>
    `;
    if (countEl) countEl.textContent = '';
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

    // Додати обробник для кнопки закриття (fullscreen модал)
    modalEl?.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        };
    });

    // Ініціалізувати перемикач глобальності
    initGlobalToggleHandler();

    const title = document.getElementById('modal-title');
    if (title) title.textContent = characteristic.name_ua || 'Редагувати характеристику';

    const deleteBtn = document.getElementById('delete-mapper-characteristic');
    if (deleteBtn) {
        deleteBtn.classList.remove('u-hidden');
        deleteBtn.onclick = () => {
            closeModal();
            showDeleteCharacteristicConfirm(id);
        };
    }

    // Заповнюємо селект категорій з вибраними
    const selectedCategoryIds = characteristic.category_ids
        ? characteristic.category_ids.split(',').map(id => id.trim()).filter(id => id)
        : [];
    populateCategorySelect(selectedCategoryIds);

    // Заповнюємо мульти-селект батьківських опцій
    const selectedParentOptionIds = characteristic.parent_option_id
        ? characteristic.parent_option_id.split(',').map(id => id.trim()).filter(id => id)
        : [];
    populateParentOptionsSelect(selectedParentOptionIds);

    fillCharacteristicForm(characteristic);

    // Заповнюємо список пов'язаних опцій
    populateRelatedOptions(id);

    // Отримати прив'язані MP характеристики та відрендерити секції маркетплейсів
    renderMappedMpCharacteristicsSections(id);

    // Ініціалізувати scroll-snap навігацію
    initSectionNavigation('char-section-navigator');

    const saveBtn = document.getElementById('save-mapper-characteristic');
    if (saveBtn) {
        saveBtn.onclick = () => handleUpdateCharacteristic(id);
    }
}

/**
 * Заповнити список пов'язаних опцій для характеристики
 */
function populateRelatedOptions(characteristicId) {
    const container = document.getElementById('char-related-options');
    const countEl = document.getElementById('char-options-count');
    if (!container) return;

    const options = getOptions();
    const relatedOptions = options.filter(opt => opt.characteristic_id === characteristicId);

    if (relatedOptions.length === 0) {
        container.innerHTML = `
            <div class="modal-related-empty">
                <span class="modal-related-empty-text">Опції відсутні</span>
            </div>
        `;
        if (countEl) countEl.textContent = '';
        return;
    }

    if (countEl) countEl.textContent = `(${relatedOptions.length})`;

    container.innerHTML = relatedOptions.map(opt => `
        <div class="modal-related-item" data-id="${opt.id}">
            <span class="modal-related-item-name">${opt.value_ua || opt.id}</span>
            <span class="modal-related-item-id">${opt.id}</span>
        </div>
    `).join('');

    // Додаємо обробники для відкриття опції
    container.querySelectorAll('.modal-related-item').forEach(item => {
        item.addEventListener('click', async () => {
            const optId = item.dataset.id;
            closeModal();
            await showEditOptionModal(optId);
        });
    });
}

/**
 * Рендерити секції маркетплейсів для замаплених MP характеристик
 * @param {string} ownCharId - ID власної характеристики
 */
function renderMappedMpCharacteristicsSections(ownCharId) {
    const nav = document.getElementById('char-section-navigator');
    const content = document.querySelector('.modal-fullscreen-content');
    if (!nav || !content) return;

    // Очистити динамічні елементи
    nav.querySelectorAll('.sidebar-nav-item.mp-nav-item').forEach(el => el.remove());
    content.querySelectorAll('.mapper-section.mp-section').forEach(el => el.remove());

    // Отримати замаплені MP характеристики
    const mappedMpChars = getMappedMpCharacteristics(ownCharId);
    if (mappedMpChars.length === 0) return;

    // Згрупувати по маркетплейсах
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

    // Додати секції по маркетплейсах
    Object.entries(byMarketplace).forEach(([mpId, data]) => {
        // Меню
        const navItem = document.createElement('a');
        navItem.href = `#section-mp-char-${mpId}`;
        navItem.className = 'sidebar-nav-item mp-nav-item';
        navItem.setAttribute('aria-label', data.name);
        navItem.innerHTML = `
            <span class="material-symbols-outlined">storefront</span>
            <span class="sidebar-nav-label">${escapeHtml(data.name)} (${data.items.length})</span>
        `;
        nav.appendChild(navItem);

        // Секція
        const section = document.createElement('section');
        section.id = `section-mp-char-${mpId}`;
        section.className = 'mapper-section mp-section';
        section.innerHTML = renderMpCharacteristicSectionContent(data);
        content.appendChild(section);
    });

    // Додати обробники для кнопок відв'язування
    content.querySelectorAll('.btn-unmap-char').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const mappingId = btn.dataset.mappingId;
            if (mappingId) {
                try {
                    await deleteCharacteristicMapping(mappingId);
                    showToast('Маппінг видалено', 'success');
                    // Перерендерити секції
                    renderMappedMpCharacteristicsSections(ownCharId);
                    renderCurrentTab();
                } catch (error) {
                    showToast('Помилка видалення маппінгу', 'error');
                }
            }
        });
    });
}

/**
 * Рендерити контент секції маркетплейсу для характеристик
 */
function renderMpCharacteristicSectionContent(marketplaceData) {
    const { name, items } = marketplaceData;

    const itemsHtml = items.map(item => {
        const data = typeof item.data === 'string' ? JSON.parse(item.data) : (item.data || {});
        return `
            <div class="mp-item-card" data-mp-id="${escapeHtml(item.id)}">
                <div class="mp-item-header">
                    <span class="mp-item-id">#${escapeHtml(item.external_id || item.id)}</span>
                    <button class="btn-icon btn-unmap btn-unmap-char" data-mapping-id="${escapeHtml(item._mappingId)}" title="Відв'язати">
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
                    <span class="badge badge-neutral">${items.length}</span>
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

/**
 * Рендерити JSON дані як read-only поля
 */
function renderMpDataFields(data) {
    const knownFields = ['name', 'type', 'unit', 'is_global', 'filter_type', 'category_id'];
    const fields = [];

    // Спочатку відомі поля
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

    // Решта полів (крім службових)
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

/**
 * Ініціалізувати scroll-snap навігацію
 * @param {string} navId - ID навігаційного елемента
 */
function initSectionNavigation(navId) {
    const nav = document.getElementById(navId);
    const content = document.querySelector('.modal-fullscreen-content');
    if (!nav || !content) return;

    const navItems = nav.querySelectorAll('.sidebar-nav-item');

    // Клік по меню - прокрутка до секції
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('href')?.slice(1);
            if (!targetId) return;
            const section = document.getElementById(targetId);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // При скролі - оновлювати active в меню
    const sections = content.querySelectorAll('.mapper-section');
    if (sections.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                navItems.forEach(item => {
                    const href = item.getAttribute('href');
                    item.classList.toggle('active', href === `#${sectionId}`);
                });
            }
        });
    }, { threshold: 0.5, root: content });

    sections.forEach(section => {
        observer.observe(section);
    });
}

/**
 * Рендерити секції маркетплейсів для замаплених MP опцій
 * @param {string} ownOptionId - ID власної опції
 */
function renderMappedMpOptionsSections(ownOptionId) {
    const nav = document.getElementById('option-section-navigator');
    const content = document.querySelector('.modal-fullscreen-content');
    if (!nav || !content) return;

    // Очистити динамічні елементи
    nav.querySelectorAll('.sidebar-nav-item.mp-nav-item').forEach(el => el.remove());
    content.querySelectorAll('.mapper-section.mp-section').forEach(el => el.remove());

    // Отримати замаплені MP опції
    const mappedMpOpts = getMappedMpOptions(ownOptionId);
    if (mappedMpOpts.length === 0) return;

    // Згрупувати по маркетплейсах
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

    // Додати секції по маркетплейсах
    Object.entries(byMarketplace).forEach(([mpId, data]) => {
        // Меню
        const navItem = document.createElement('a');
        navItem.href = `#section-mp-opt-${mpId}`;
        navItem.className = 'sidebar-nav-item mp-nav-item';
        navItem.setAttribute('aria-label', data.name);
        navItem.innerHTML = `
            <span class="material-symbols-outlined">storefront</span>
            <span class="sidebar-nav-label">${escapeHtml(data.name)} (${data.items.length})</span>
        `;
        nav.appendChild(navItem);

        // Секція
        const section = document.createElement('section');
        section.id = `section-mp-opt-${mpId}`;
        section.className = 'mapper-section mp-section';
        section.innerHTML = renderMpOptionSectionContent(data);
        content.appendChild(section);
    });

    // Додати обробники для кнопок відв'язування
    content.querySelectorAll('.btn-unmap-opt').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const mappingId = btn.dataset.mappingId;
            if (mappingId) {
                try {
                    await deleteOptionMapping(mappingId);
                    showToast('Маппінг видалено', 'success');
                    // Перерендерити секції
                    renderMappedMpOptionsSections(ownOptionId);
                    renderCurrentTab();
                } catch (error) {
                    showToast('Помилка видалення маппінгу', 'error');
                }
            }
        });
    });
}

/**
 * Рендерити контент секції маркетплейсу для опцій
 */
function renderMpOptionSectionContent(marketplaceData) {
    const { name, items } = marketplaceData;

    const itemsHtml = items.map(item => {
        const data = typeof item.data === 'string' ? JSON.parse(item.data) : (item.data || {});
        return `
            <div class="mp-item-card" data-mp-id="${escapeHtml(item.id)}">
                <div class="mp-item-header">
                    <span class="mp-item-id">#${escapeHtml(item.external_id || item.id)}</span>
                    <button class="btn-icon btn-unmap btn-unmap-opt" data-mapping-id="${escapeHtml(item._mappingId)}" title="Відв'язати">
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
                    <span class="badge badge-neutral">${items.length}</span>
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

/**
 * Заповнити список пов'язаних характеристик для категорії
 */
function populateRelatedCharacteristics(categoryId) {
    const container = document.getElementById('category-related-chars');
    const countEl = document.getElementById('category-chars-count');
    if (!container) return;

    const characteristics = getCharacteristics();
    // Характеристики, у яких ця категорія вибрана в category_ids
    const relatedChars = characteristics.filter(char => {
        if (!char.category_ids) return false;
        const ids = Array.isArray(char.category_ids)
            ? char.category_ids
            : String(char.category_ids).split(',').map(id => id.trim());
        return ids.includes(categoryId);
    });

    if (relatedChars.length === 0) {
        container.innerHTML = `
            <div class="modal-related-empty">
                <span class="modal-related-empty-text">Характеристики відсутні</span>
            </div>
        `;
        if (countEl) countEl.textContent = '';
        return;
    }

    if (countEl) countEl.textContent = `(${relatedChars.length})`;

    container.innerHTML = relatedChars.map(char => `
        <div class="modal-related-item" data-id="${char.id}">
            <span class="modal-related-item-name">${escapeHtml(char.name_ua || char.id)}</span>
            <span class="modal-related-item-id">${char.id}</span>
        </div>
    `).join('');

    // Додаємо обробники для відкриття характеристики
    container.querySelectorAll('.modal-related-item').forEach(item => {
        item.addEventListener('click', async () => {
            const charId = item.dataset.id;
            closeModal();
            await showEditCharacteristicModal(charId);
        });
    });
}

/**
 * Заповнити список залежних характеристик для опції
 */
function populateRelatedDependentCharacteristics(optionId) {
    const container = document.getElementById('option-related-chars');
    const countEl = document.getElementById('option-chars-count');
    if (!container) return;

    const characteristics = getCharacteristics();
    // Характеристики, у яких ця опція вибрана в parent_option_id
    const dependentChars = characteristics.filter(char => {
        if (!char.parent_option_id) return false;
        const ids = Array.isArray(char.parent_option_id)
            ? char.parent_option_id
            : String(char.parent_option_id).split(',').map(id => id.trim());
        return ids.includes(optionId);
    });

    if (dependentChars.length === 0) {
        container.innerHTML = `
            <div class="modal-related-empty">
                <span class="modal-related-empty-text">Залежних характеристик немає</span>
            </div>
        `;
        if (countEl) countEl.textContent = '';
        return;
    }

    if (countEl) countEl.textContent = `(${dependentChars.length})`;

    container.innerHTML = dependentChars.map(char => `
        <div class="modal-related-item" data-id="${char.id}">
            <span class="modal-related-item-name">${escapeHtml(char.name_ua || char.id)}</span>
            <span class="modal-related-item-id">${char.id}</span>
        </div>
    `).join('');

    // Додаємо обробники для відкриття характеристики
    container.querySelectorAll('.modal-related-item').forEach(item => {
        item.addEventListener('click', async () => {
            const charId = item.dataset.id;
            closeModal();
            await showEditCharacteristicModal(charId);
        });
    });
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
    // Отримуємо вибрані категорії з мульти-селекту
    const categoriesSelect = document.getElementById('mapper-char-categories');
    const selectedCategories = categoriesSelect
        ? Array.from(categoriesSelect.selectedOptions).map(opt => opt.value)
        : [];

    // Отримуємо значення глобальності з radio buttons
    const globalYes = document.getElementById('mapper-char-global-yes');
    const isGlobal = globalYes?.checked ?? false;

    // Отримуємо вибрані батьківські опції з мульти-селекту
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
        is_global: isGlobal,
        // Якщо глобальна - категорії не потрібні
        category_ids: isGlobal ? '' : selectedCategories.join(','),
        parent_option_id: selectedParentOptions.join(',')
    };
}

/**
 * Перемикач видимості поля категорій залежно від глобальності
 */
function toggleCategoriesField(isGlobal) {
    const categoriesGroup = document.getElementById('mapper-char-categories')?.closest('.form-group');
    if (categoriesGroup) {
        if (isGlobal) {
            categoriesGroup.style.display = 'none';
        } else {
            categoriesGroup.style.display = '';
        }
    }
}

/**
 * Ініціалізувати обробники для перемикача глобальності
 */
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

function fillCharacteristicForm(characteristic) {
    const nameUaField = document.getElementById('mapper-char-name-ua');
    const nameRuField = document.getElementById('mapper-char-name-ru');
    const typeField = document.getElementById('mapper-char-type');
    const unitField = document.getElementById('mapper-char-unit');
    const filterField = document.getElementById('mapper-char-filter');
    const globalYes = document.getElementById('mapper-char-global-yes');
    const globalNo = document.getElementById('mapper-char-global-no');

    // Підтримуємо обидві назви полів (нові та старі)
    if (nameUaField) nameUaField.value = characteristic.name_ua || characteristic.name_uk || '';
    if (nameRuField) nameRuField.value = characteristic.name_ru || '';
    if (unitField) unitField.value = characteristic.unit || '';

    // Встановлюємо значення та оновлюємо кастомні селекти
    // Підтримуємо type та param_type
    if (typeField) {
        const typeValue = characteristic.type || characteristic.param_type || 'TextInput';
        typeField.value = typeValue;
        reinitializeCustomSelect(typeField);
    }
    if (filterField) {
        filterField.value = characteristic.filter_type || 'disable';
        reinitializeCustomSelect(filterField);
    }

    // Підтримуємо різні формати: true, 'true', 'TRUE', TRUE
    const isGlobal = characteristic.is_global === true ||
        String(characteristic.is_global).toLowerCase() === 'true';
    if (globalYes) globalYes.checked = isGlobal;
    if (globalNo) globalNo.checked = !isGlobal;

    // Ховаємо категорії якщо глобальна
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
    // За замовчуванням - не глобальна
    if (globalYes) globalYes.checked = false;
    if (globalNo) globalNo.checked = true;

    // Встановлюємо значення та оновлюємо кастомні селекти
    if (typeField) {
        typeField.value = 'TextInput';
        reinitializeCustomSelect(typeField);
    }
    if (filterField) {
        filterField.value = 'disable';
        reinitializeCustomSelect(filterField);
    }

    // Скидаємо вибір категорій
    if (categoriesSelect) {
        Array.from(categoriesSelect.options).forEach(opt => opt.selected = false);
        reinitializeCustomSelect(categoriesSelect);
    }

    // Скидаємо вибір батьківських опцій
    const parentOptionSelect = document.getElementById('mapper-char-parent-option');
    if (parentOptionSelect) {
        Array.from(parentOptionSelect.options).forEach(opt => opt.selected = false);
        reinitializeCustomSelect(parentOptionSelect);
    }

    // Показуємо поле категорій (бо за замовчуванням не глобальна)
    toggleCategoriesField(false);
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

    // Додати обробник для кнопки закриття (fullscreen модал)
    modalEl?.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        };
    });

    const title = document.getElementById('modal-title');
    if (title) title.textContent = option.value_ua || 'Редагувати опцію';

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

    // Заповнюємо список залежних характеристик
    populateRelatedDependentCharacteristics(id);

    // Отримати прив'язані MP опції та відрендерити секції маркетплейсів
    renderMappedMpOptionsSections(id);

    // Ініціалізувати scroll-snap навігацію
    initSectionNavigation('option-section-navigator');

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

    // Затримка для коректного рендерингу DOM
    await new Promise(resolve => requestAnimationFrame(resolve));

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
 * Стан модалки даних маркетплейсу
 */
const mpDataModalState = {
    marketplaceId: null,
    marketplaceName: '',
    activeTab: 'categories', // categories | characteristics | options
    filter: 'all', // all | mapped | unmapped
    searchQuery: '',
    categories: [],
    characteristics: [],
    options: []
};

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

    // Ініціалізуємо стан
    mpDataModalState.marketplaceId = id;
    mpDataModalState.marketplaceName = marketplace.name;
    mpDataModalState.activeTab = 'categories';
    mpDataModalState.filter = 'all';
    mpDataModalState.searchQuery = '';

    // Відкриваємо модалку
    await showModal('mapper-mp-data', null);
    await new Promise(resolve => requestAnimationFrame(resolve));

    // Встановлюємо заголовок
    const title = document.getElementById('mp-data-modal-title');
    if (title) title.textContent = `${marketplace.name} - Дані`;

    // Завантажуємо дані
    await loadMpDataForModal(id);

    // Ініціалізуємо обробники
    initMpDataModalEvents();

    // Рендеримо таблицю
    renderMpDataModalTable();
}

/**
 * Завантажити MP дані для модалки
 */
async function loadMpDataForModal(marketplaceId) {
    const { loadMpCategories, loadMpCharacteristics, loadMpOptions, getMpCategories, getMpCharacteristics, getMpOptions } = await import('./mapper-data.js');

    // Завантажуємо якщо ще не завантажено
    const allCats = getMpCategories();
    const allChars = getMpCharacteristics();
    const allOpts = getMpOptions();

    if (allCats.length === 0) await loadMpCategories();
    if (allChars.length === 0) await loadMpCharacteristics();
    if (allOpts.length === 0) await loadMpOptions();

    // Фільтруємо по маркетплейсу
    mpDataModalState.categories = getMpCategories().filter(c => c.marketplace_id === marketplaceId);
    mpDataModalState.characteristics = getMpCharacteristics().filter(c => c.marketplace_id === marketplaceId);
    mpDataModalState.options = getMpOptions().filter(o => o.marketplace_id === marketplaceId);

    // Оновлюємо бейджі кількості
    const catCount = document.getElementById('mp-data-cat-count');
    const charCount = document.getElementById('mp-data-char-count');
    const optCount = document.getElementById('mp-data-opt-count');

    if (catCount) catCount.textContent = mpDataModalState.categories.length;
    if (charCount) charCount.textContent = mpDataModalState.characteristics.length;
    if (optCount) optCount.textContent = mpDataModalState.options.length;

    console.log(`✅ Завантажено: ${mpDataModalState.categories.length} категорій, ${mpDataModalState.characteristics.length} характеристик, ${mpDataModalState.options.length} опцій`);
}

/**
 * Ініціалізувати обробники подій модалки
 */
function initMpDataModalEvents() {
    // Таби
    const tabButtons = document.querySelectorAll('#mp-data-tabs [data-mp-tab]');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mpDataModalState.activeTab = btn.dataset.mpTab;
            renderMpDataModalTable();
        });
    });

    // Фільтри
    const filterButtons = document.querySelectorAll('#mp-data-filter-pills [data-mp-filter]');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mpDataModalState.filter = btn.dataset.mpFilter;
            renderMpDataModalTable();
        });
    });

    // Пошук
    const searchInput = document.getElementById('mp-data-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            mpDataModalState.searchQuery = e.target.value.toLowerCase();
            renderMpDataModalTable();
        });
    }
}

/**
 * Рендерити таблицю в модалці
 */
const MP_DATA_PAGE_SIZE = 100; // Ліміт рядків на сторінку

function renderMpDataModalTable() {
    const container = document.getElementById('mp-data-table-container');
    if (!container) {
        console.error('❌ Container not found: mp-data-table-container');
        return;
    }

    const { activeTab, filter, searchQuery } = mpDataModalState;
    console.log(`📊 Rendering tab: ${activeTab}, filter: ${filter}, search: "${searchQuery}"`);

    // Отримуємо дані для поточного табу
    let data = [];
    let columns = [];

    if (activeTab === 'categories') {
        data = [...mpDataModalState.categories];
        columns = getMpCategoriesColumns();
    } else if (activeTab === 'characteristics') {
        data = [...mpDataModalState.characteristics];
        columns = getMpCharacteristicsColumns();
    } else if (activeTab === 'options') {
        data = [...mpDataModalState.options];
        columns = getMpOptionsColumns();
    }

    console.log(`📊 Initial data count: ${data.length}`);

    // Фільтр по прив'язці
    if (filter === 'mapped') {
        data = data.filter(item => {
            if (activeTab === 'categories') return !!item.our_cat_id;
            if (activeTab === 'characteristics') return !!item.our_char_id;
            if (activeTab === 'options') return !!item.our_option_id;
            return true;
        });
    } else if (filter === 'unmapped') {
        data = data.filter(item => {
            if (activeTab === 'categories') return !item.our_cat_id;
            if (activeTab === 'characteristics') return !item.our_char_id;
            if (activeTab === 'options') return !item.our_option_id;
            return true;
        });
    }

    // Пошук
    if (searchQuery) {
        data = data.filter(item => {
            const name = (item.name || '').toLowerCase();
            const extId = (item.external_id || '').toLowerCase();
            return name.includes(searchQuery) || extId.includes(searchQuery);
        });
    }

    const filteredCount = data.length;
    console.log(`📊 After filters: ${filteredCount}`);

    // Оновлюємо статистику
    const statsEl = document.getElementById('mp-data-stats-text');
    const totalCount = activeTab === 'categories' ? mpDataModalState.categories.length :
        activeTab === 'characteristics' ? mpDataModalState.characteristics.length :
            mpDataModalState.options.length;

    // Рендеримо таблицю
    if (data.length === 0) {
        container.innerHTML = `
            <div class="empty-state-container">
                <div class="avatar-state-message">Дані відсутні</div>
            </div>
        `;
        if (statsEl) statsEl.textContent = `Показано 0 з ${totalCount}`;
        return;
    }

    // Обмежуємо кількість рядків для продуктивності
    const displayData = data.slice(0, MP_DATA_PAGE_SIZE);
    const hasMore = data.length > MP_DATA_PAGE_SIZE;

    if (statsEl) {
        if (hasMore) {
            statsEl.textContent = `Показано ${displayData.length} з ${filteredCount} (всього ${totalCount})`;
        } else {
            statsEl.textContent = `Показано ${filteredCount} з ${totalCount}`;
        }
    }

    try {
        // Формуємо HTML таблиці
        const headerHtml = columns.map(col => `<div class="cell ${col.className || ''}">${col.label}</div>`).join('');
        const rowsHtml = displayData.map(item => {
            const cellsHtml = columns.map(col => {
                const value = item[col.id];
                const rendered = col.render ? col.render(value, item) : escapeHtml(value || '-');
                return `<div class="cell ${col.className || ''}">${rendered}</div>`;
            }).join('');
            return `<div class="pseudo-table-row" data-id="${escapeHtml(item.id || '')}">${cellsHtml}</div>`;
        }).join('');

        let tableHtml = `
            <div class="pseudo-table">
                <div class="pseudo-table-header">${headerHtml}</div>
                <div class="pseudo-table-body">${rowsHtml}</div>
            </div>
        `;

        // Додаємо повідомлення якщо є ще дані
        if (hasMore) {
            tableHtml += `
                <div class="mp-data-more-hint" style="text-align: center; padding: 1rem; color: var(--color-text-tertiary);">
                    Показано перші ${MP_DATA_PAGE_SIZE} записів. Використовуйте пошук для фільтрації.
                </div>
            `;
        }

        container.innerHTML = tableHtml;
        console.log(`✅ Table rendered with ${displayData.length} rows`);
    } catch (error) {
        console.error('❌ Error rendering table:', error);
        container.innerHTML = `
            <div class="empty-state-container">
                <div class="avatar-state-message">Помилка відображення: ${error.message}</div>
            </div>
        `;
    }
}

/**
 * Колонки для категорій MP
 */
function getMpCategoriesColumns() {
    const categories = getCategories();
    return [
        { id: 'external_id', label: 'ID', className: 'cell-id' },
        { id: 'name', label: 'Назва', className: 'cell-main-name', render: (v) => `<strong>${escapeHtml(v || '')}</strong>` },
        { id: 'parent_name', label: 'Батьківська' },
        {
            id: 'our_cat_id',
            label: 'Наша категорія',
            render: (v) => {
                if (!v) return '<span class="severity-badge severity-high">Не прив\'язано</span>';
                const cat = categories.find(c => c.id === v);
                return `<span class="severity-badge severity-low">${escapeHtml(cat?.name_ua || v)}</span>`;
            }
        }
    ];
}

/**
 * Колонки для характеристик MP
 */
function getMpCharacteristicsColumns() {
    const characteristics = getCharacteristics();
    return [
        { id: 'external_id', label: 'ID', className: 'cell-id' },
        { id: 'name', label: 'Назва', className: 'cell-main-name', render: (v) => `<strong>${escapeHtml(v || '')}</strong>` },
        { id: 'type', label: 'Тип', render: (v) => `<code>${escapeHtml(v || '-')}</code>` },
        {
            id: 'our_char_id',
            label: 'Наша характ.',
            render: (v) => {
                if (!v) return '<span class="severity-badge severity-high">Не прив\'язано</span>';
                const char = characteristics.find(c => c.id === v);
                return `<span class="severity-badge severity-low">${escapeHtml(char?.name_ua || v)}</span>`;
            }
        }
    ];
}

/**
 * Колонки для опцій MP
 */
function getMpOptionsColumns() {
    const options = getOptions();
    return [
        { id: 'external_id', label: 'ID', className: 'cell-id' },
        { id: 'name', label: 'Назва', className: 'cell-main-name', render: (v) => `<strong>${escapeHtml(v || '')}</strong>` },
        { id: 'char_id', label: 'Характеристика' },
        {
            id: 'our_option_id',
            label: 'Наша опція',
            render: (v) => {
                if (!v) return '<span class="severity-badge severity-high">Не прив\'язано</span>';
                const opt = options.find(o => o.id === v);
                return `<span class="severity-badge severity-low">${escapeHtml(opt?.value_ua || v)}</span>`;
            }
        }
    ];
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
    // Отримуємо значення з radio buttons
    const activeYes = document.getElementById('mapper-mp-active-yes');
    const isActive = activeYes?.checked ?? true;
    console.log('getMarketplaceFormData: is_active =', isActive);

    return {
        name: document.getElementById('mapper-mp-name')?.value.trim() || '',
        slug: document.getElementById('mapper-mp-slug')?.value.trim() || '',
        is_active: isActive
    };
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
}

function clearMarketplaceForm() {
    const nameField = document.getElementById('mapper-mp-name');
    const slugField = document.getElementById('mapper-mp-slug');
    const activeYes = document.getElementById('mapper-mp-active-yes');
    const activeNo = document.getElementById('mapper-mp-active-no');

    if (nameField) nameField.value = '';
    if (slugField) slugField.value = '';
    // За замовчуванням - активний
    if (activeYes) activeYes.checked = true;
    if (activeNo) activeNo.checked = false;
    console.log('clearMarketplaceForm: form cleared, active = true');
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
        // Слухаємо зміну призначення (маркетплейс або свій довідник)
        marketplaceSelect.addEventListener('change', handleMarketplaceChange);
    }

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

    // Спочатку базові опції
    select.innerHTML = `
        <option value="">— Оберіть призначення —</option>
        <option value="own">📁 Свій довідник</option>
    `;

    // Додаємо активні маркетплейси
    marketplaces.forEach(mp => {
        if (mp.is_active === true || String(mp.is_active).toLowerCase() === 'true') {
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
    const selectedValue = e.target.value;

    if (selectedValue === 'own') {
        // Обрано "Свій довідник"
        importState.importTarget = 'own';
        importState.marketplaceId = 'own';
    } else {
        // Обрано маркетплейс
        importState.importTarget = 'marketplace';
        importState.marketplaceId = selectedValue;

        if (selectedValue) {
            // Спробуємо завантажити збережений маппінг
            loadSavedMapping(selectedValue);
        }
    }

    // Скидаємо маппінг при зміні призначення
    importState.mapping = {};
    updateMappingSections();

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
    const mpGroup = document.getElementById('marketplace-select-group');

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
        // id та created_at генеруються автоматично
        own_categories: [
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

        // Свій довідник - категорії (id генерується автоматично)
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
async function importCharacteristicsAndOptions(onProgress = () => { }) {
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

    onProgress(30, 'Перевірка існуючих даних...');

    // Завантажуємо існуючі дані для перевірки дублікатів
    const { loadMpCharacteristics, loadMpOptions, getMpCharacteristics, getMpOptions } = await import('./mapper-data.js');
    await loadMpCharacteristics();
    await loadMpOptions();

    const existingChars = getMpCharacteristics();
    const existingOpts = getMpOptions();

    // Створюємо Set існуючих ID для швидкої перевірки
    const existingCharIds = new Set(
        existingChars
            .filter(c => c.marketplace_id === importState.marketplaceId)
            .map(c => c.external_id)
    );
    const existingOptIds = new Set(
        existingOpts
            .filter(o => o.marketplace_id === importState.marketplaceId)
            .map(o => `${o.char_id || ''}-${o.external_id}`)
    );

    // Фільтруємо тільки нові характеристики
    const newCharacteristics = characteristicsList.filter(c => !existingCharIds.has(c.mp_char_id));
    const newOptions = mpOptions.filter(o => !existingOptIds.has(`${o.mp_char_id}-${o.mp_option_id}`));

    console.log(`🆕 Нових характеристик: ${newCharacteristics.length} (з ${characteristicsList.length})`);
    console.log(`🆕 Нових опцій: ${newOptions.length} (з ${mpOptions.length})`);

    onProgress(50, `Запис ${newCharacteristics.length} нових характеристик...`);

    // Записуємо характеристики маркетплейса
    // Структура таблиці: id | marketplace_id | external_id | source | data | created_at | updated_at
    // data - JSON з усіма полями характеристики (різні для кожного маркетплейсу)
    if (newCharacteristics.length > 0) {
        const timestamp = new Date().toISOString();
        const charRows = newCharacteristics.map((c) => {
            // Генеруємо унікальний ID для кожного запису
            const uniqueId = `mpc-${importState.marketplaceId}-${c.mp_char_id}`;

            // Всі дані характеристики зберігаємо в JSON
            const dataJson = JSON.stringify({
                name: c.mp_char_name || '',
                type: c.mp_char_type || '',
                filter_type: c.mp_char_filter_type || '',
                unit: c.mp_char_unit || '',
                is_global: c.mp_char_is_global || '',
                category_id: c.mp_category_id || '',
                category_name: c.mp_category_name || '',
                our_char_id: '' // для маппінгу
            });

            return [
                uniqueId,
                importState.marketplaceId,
                c.mp_char_id,           // external_id
                'import',               // source
                dataJson,               // data (JSON)
                timestamp,              // created_at
                timestamp               // updated_at
            ];
        });

        await callSheetsAPI('append', {
            range: 'Mapper_MP_Characteristics!A:G',
            values: charRows,
            spreadsheetType: 'main'
        });
    } else {
        console.log('⏭️ Всі характеристики вже існують, пропускаємо');
    }

    onProgress(75, `Запис ${newOptions.length} нових опцій...`);

    // Записуємо опції маркетплейса
    // Структура: id | marketplace_id | external_id | source | data | created_at | updated_at
    if (newOptions.length > 0) {
        const timestamp = new Date().toISOString();
        const optRows = newOptions.map(o => {
            // Генеруємо унікальний ID для кожного запису
            const uniqueId = `mpo-${importState.marketplaceId}-${o.mp_char_id}-${o.mp_option_id}`;

            // Всі дані опції зберігаємо в JSON
            const dataJson = JSON.stringify({
                char_id: o.mp_char_id || '',
                name: o.mp_option_name || '',
                our_option_id: '' // для маппінгу
            });

            return [
                uniqueId,
                importState.marketplaceId,
                o.mp_option_id,         // external_id
                'import',               // source
                dataJson,               // data (JSON)
                timestamp,              // created_at
                timestamp               // updated_at
            ];
        });

        await callSheetsAPI('append', {
            range: 'Mapper_MP_Options!A:G',
            values: optRows,
            spreadsheetType: 'main'
        });
    } else {
        console.log('⏭️ Всі опції вже існують, пропускаємо');
    }

    onProgress(100, 'Готово!');
}

/**
 * Імпорт категорій
 * @param {Function} onProgress - Callback для оновлення прогресу (percent, message)
 */
async function importCategories(onProgress = () => { }) {
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

    onProgress(30, 'Перевірка існуючих даних...');

    // Завантажуємо існуючі дані для перевірки дублікатів
    const { loadMpCategories, getMpCategories } = await import('./mapper-data.js');
    await loadMpCategories();

    const existingCats = getMpCategories();

    // Створюємо Set існуючих ID для швидкої перевірки
    const existingCatIds = new Set(
        existingCats
            .filter(c => c.marketplace_id === importState.marketplaceId)
            .map(c => c.external_id)
    );

    // Фільтруємо тільки нові категорії
    const newCategories = mpCategories.filter(c => !existingCatIds.has(c.mp_cat_id));

    console.log(`🆕 Нових категорій: ${newCategories.length} (з ${mpCategories.length})`);

    onProgress(50, `Запис ${newCategories.length} нових категорій...`);

    // Структура таблиці: id | marketplace_id | external_id | source | data | created_at | updated_at
    // data - JSON з усіма полями категорії (різні для кожного маркетплейсу)
    if (newCategories.length > 0) {
        const timestamp = new Date().toISOString();
        const catRows = newCategories.map(c => {
            // Генеруємо унікальний ID для кожного запису
            const uniqueId = `mpcat-${importState.marketplaceId}-${c.mp_cat_id}`;

            // Всі дані категорії зберігаємо в JSON
            const dataJson = JSON.stringify({
                name: c.mp_cat_name || '',
                parent_id: c.mp_parent_id || '',
                parent_name: c.mp_parent_name || '',
                our_cat_id: '' // для маппінгу
            });

            return [
                uniqueId,
                importState.marketplaceId,
                c.mp_cat_id,        // external_id
                'import',           // source
                dataJson,           // data (JSON)
                timestamp,          // created_at
                timestamp           // updated_at
            ];
        });

        await callSheetsAPI('append', {
            range: 'Mapper_MP_Categories!A:G',
            values: catRows,
            spreadsheetType: 'main'
        });
    } else {
        console.log('⏭️ Всі категорії вже існують, пропускаємо');
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
async function importOwnCharacteristicsAndOptions(onProgress = () => { }) {
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
    const categoryNamesToCreate = new Set(); // Унікальні назви категорій для створення

    importState.parsedData.forEach(row => {
        const nameUa = nameUaCol !== undefined ? String(row[nameUaCol] || '').trim() : '';
        const nameRu = nameRuCol !== undefined ? String(row[nameRuCol] || '').trim() : '';

        if (nameUa) {
            // Отримуємо категорії з рядка
            const categoryIdsRaw = categoryIdsCol !== undefined ? String(row[categoryIdsCol] || '').trim() : '';

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
                    category_names: categoryIdsRaw // Зберігаємо назви категорій
                });

                // Збираємо унікальні категорії для створення
                if (categoryIdsRaw) {
                    categoryIdsRaw.split(',').forEach(catName => {
                        const trimmed = catName.trim();
                        if (trimmed) categoryNamesToCreate.add(trimmed);
                    });
                }
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

    console.log(`📊 Характеристик: ${characteristics.size}, Опцій: ${options.length}, Категорій: ${categoryNamesToCreate.size}`);

    // === КРОК 1: Створюємо категорії, яких немає ===
    const existingCategories = getCategories();
    const categoryNameToId = new Map(); // Назва -> ID

    // Заповнюємо карту існуючими категоріями
    existingCategories.forEach(cat => {
        categoryNameToId.set(cat.name_ua.toLowerCase(), cat.id);
    });

    // Створюємо нові категорії
    const newCategoryNames = Array.from(categoryNamesToCreate).filter(
        name => !categoryNameToId.has(name.toLowerCase())
    );

    if (newCategoryNames.length > 0) {
        onProgress(10, `Створюю ${newCategoryNames.length} нових категорій...`);

        for (let i = 0; i < newCategoryNames.length; i++) {
            const catName = newCategoryNames[i];
            const catPercent = Math.round(10 + (i / newCategoryNames.length) * 10);
            onProgress(catPercent, `Категорія: ${catName}`);

            try {
                const newCat = await addCategory({
                    name_ua: catName,
                    name_ru: '',
                    parent_id: ''
                });
                categoryNameToId.set(catName.toLowerCase(), newCat.id);
                console.log(`✅ Створено категорію: ${catName} -> ${newCat.id}`);
            } catch (e) {
                console.warn(`⚠️ Не вдалося створити категорію "${catName}":`, e);
            }
        }
    }

    // === КРОК 2: Конвертуємо назви категорій в ID ===
    function convertCategoryNamesToIds(categoryNamesStr) {
        if (!categoryNamesStr) return '';
        const names = categoryNamesStr.split(',').map(n => n.trim()).filter(n => n);
        const ids = names
            .map(name => categoryNameToId.get(name.toLowerCase()))
            .filter(id => id);
        return ids.join(',');
    }

    // === КРОК 3: Додаємо характеристики ===
    const charIdMap = new Map(); // name_ua -> id
    const totalChars = characteristics.size;
    let charIndex = 0;

    for (const [nameUa, char] of characteristics) {
        charIndex++;
        const charPercent = Math.round(20 + (charIndex / totalChars) * 40);
        onProgress(charPercent, `Характеристика ${charIndex}/${totalChars}: ${nameUa}`);

        // Конвертуємо назви категорій в ID
        const categoryIds = convertCategoryNamesToIds(char.category_names);

        try {
            const newChar = await addCharacteristic({
                name_ua: char.name_ua,
                name_ru: char.name_ru,
                type: char.type,
                unit: char.unit,
                filter_type: char.filter_type,
                is_global: char.is_global,
                category_ids: categoryIds
            });
            charIdMap.set(nameUa, newChar.id);
        } catch (e) {
            console.warn(`⚠️ Не вдалося додати характеристику "${nameUa}":`, e);
        }
    }

    // === КРОК 4: Додаємо опції ===
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
async function importOwnCategories(onProgress = () => { }) {
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

// ═══════════════════════════════════════════════════════════════════════════
// BATCH МАППІНГ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модалку вибору власної характеристики для batch маппінгу
 * @param {Array<string>} selectedIds - Масив ID вибраних MP характеристик
 */
export async function showSelectOwnCharacteristicModal(selectedIds) {
    console.log(`🔗 Batch маппінг характеристик: ${selectedIds.length} обрано`);

    // Фільтруємо тільки MP характеристики (не власні)
    const mpIds = selectedIds.filter(id => {
        const mpChars = getMpCharacteristics();
        return mpChars.some(c => c.id === id);
    });

    if (mpIds.length === 0) {
        showToast('Оберіть характеристики маркетплейсу для маппінгу', 'warning');
        return;
    }

    // Створюємо просту модалку зі списком характеристик
    const ownChars = getCharacteristics();

    const modalHtml = `
        <div class="modal-overlay">
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
                    <p class="u-mb-16">Обрано <strong>${mpIds.length}</strong> характеристик маркетплейсу.</p>
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
                    <button id="btn-apply-char-mapping" class="btn-main">
                        <span class="material-symbols-outlined">link</span>
                        Замапити
                    </button>
                </div>
            </div>
        </div>
    `;

    // Показуємо модалку
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = modalHtml;
    const modalOverlay = tempContainer.firstElementChild;
    document.body.appendChild(modalOverlay);

    // Обробники
    const closeBtn = modalOverlay.querySelector('.modal-close-btn');
    const applyBtn = modalOverlay.querySelector('#btn-apply-char-mapping');
    const selectEl = modalOverlay.querySelector('#select-own-char');

    const closeThisModal = () => {
        modalOverlay.remove();
    };

    closeBtn.addEventListener('click', closeThisModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeThisModal();
    });

    applyBtn.addEventListener('click', async () => {
        const ownCharId = selectEl.value;
        if (!ownCharId) {
            showToast('Оберіть характеристику', 'warning');
            return;
        }

        applyBtn.disabled = true;
        applyBtn.innerHTML = '<span class="material-symbols-outlined is-spinning">sync</span> Обробка...';

        try {
            const result = await batchUpdateMpCharacteristicMapping(mpIds, ownCharId);

            closeThisModal();

            // Очищуємо вибір
            if (mapperState.selectedRows.characteristics) {
                mapperState.selectedRows.characteristics.clear();
            }
            const batchBar = getBatchBar('mapper-characteristics');
            if (batchBar) batchBar.deselectAll();

            // Оновлюємо таблицю
            await renderCurrentTab();

            showToast(`Замаплено ${result.success.length} характеристик`, 'success');
        } catch (error) {
            console.error('❌ Помилка batch маппінгу:', error);
            showToast('Помилка при маппінгу', 'error');
            applyBtn.disabled = false;
            applyBtn.innerHTML = '<span class="material-symbols-outlined">link</span> Замапити';
        }
    });
}

/**
 * Показати модалку вибору власної опції для batch маппінгу
 * @param {Array<string>} selectedIds - Масив ID вибраних MP опцій
 */
export async function showSelectOwnOptionModal(selectedIds) {
    console.log(`🔗 Batch маппінг опцій: ${selectedIds.length} обрано`);

    // Фільтруємо тільки MP опції (не власні)
    const mpIds = selectedIds.filter(id => {
        const mpOpts = getMpOptions();
        return mpOpts.some(o => o.id === id);
    });

    if (mpIds.length === 0) {
        showToast('Оберіть опції маркетплейсу для маппінгу', 'warning');
        return;
    }

    // Створюємо просту модалку зі списком опцій
    const ownOptions = getOptions();

    const modalHtml = `
        <div class="modal-overlay">
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
                    <p class="u-mb-16">Обрано <strong>${mpIds.length}</strong> опцій маркетплейсу.</p>
                    <p class="u-mb-16">Оберіть власну опцію для прив'язки:</p>

                    <div class="form-group">
                        <label for="select-own-option">Власна опція</label>
                        <select id="select-own-option" class="input-main">
                            <option value="">— Оберіть опцію —</option>
                            ${ownOptions.map(o => `<option value="${escapeHtml(o.id)}">${escapeHtml(o.value_ua || o.id)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="btn-apply-option-mapping" class="btn-main">
                        <span class="material-symbols-outlined">link</span>
                        Замапити
                    </button>
                </div>
            </div>
        </div>
    `;

    // Показуємо модалку
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = modalHtml;
    const modalOverlay = tempContainer.firstElementChild;
    document.body.appendChild(modalOverlay);

    // Обробники
    const closeBtn = modalOverlay.querySelector('.modal-close-btn');
    const applyBtn = modalOverlay.querySelector('#btn-apply-option-mapping');
    const selectEl = modalOverlay.querySelector('#select-own-option');

    const closeThisModal = () => {
        modalOverlay.remove();
    };

    closeBtn.addEventListener('click', closeThisModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeThisModal();
    });

    applyBtn.addEventListener('click', async () => {
        const ownOptionId = selectEl.value;
        if (!ownOptionId) {
            showToast('Оберіть опцію', 'warning');
            return;
        }

        applyBtn.disabled = true;
        applyBtn.innerHTML = '<span class="material-symbols-outlined is-spinning">sync</span> Обробка...';

        try {
            const result = await batchUpdateMpOptionMapping(mpIds, ownOptionId);

            closeThisModal();

            // Очищуємо вибір
            if (mapperState.selectedRows.options) {
                mapperState.selectedRows.options.clear();
            }
            const batchBar = getBatchBar('mapper-options');
            if (batchBar) batchBar.deselectAll();

            // Оновлюємо таблицю
            await renderCurrentTab();

            showToast(`Замаплено ${result.success.length} опцій`, 'success');
        } catch (error) {
            console.error('❌ Помилка batch маппінгу:', error);
            showToast('Помилка при маппінгу', 'error');
            applyBtn.disabled = false;
            applyBtn.innerHTML = '<span class="material-symbols-outlined">link</span> Замапити';
        }
    });
}

/**
 * Авто-маппінг характеристик за назвою
 * @param {Array<string>} selectedIds - Масив ID вибраних MP характеристик
 */
export async function handleAutoMapCharacteristics(selectedIds) {
    console.log(`🤖 Авто-маппінг характеристик: ${selectedIds.length} обрано`);

    // Фільтруємо тільки MP характеристики
    const mpIds = selectedIds.filter(id => {
        const mpChars = getMpCharacteristics();
        return mpChars.some(c => c.id === id);
    });

    if (mpIds.length === 0) {
        showToast('Оберіть характеристики маркетплейсу для авто-маппінгу', 'warning');
        return;
    }

    showToast('Авто-маппінг...', 'info');

    try {
        const result = await autoMapCharacteristics(mpIds);

        // Очищуємо вибір
        if (mapperState.selectedRows.characteristics) {
            mapperState.selectedRows.characteristics.clear();
        }
        const batchBar = getBatchBar('mapper-characteristics');
        if (batchBar) batchBar.deselectAll();

        // Оновлюємо таблицю
        await renderCurrentTab();

        if (result.mapped.length > 0) {
            showToast(`Авто-замаплено ${result.mapped.length} з ${mpIds.length} характеристик`, 'success');
        } else {
            showToast(`Не знайдено відповідностей серед ${mpIds.length} характеристик`, 'warning');
        }
    } catch (error) {
        console.error('❌ Помилка авто-маппінгу:', error);
        showToast('Помилка при авто-маппінгу', 'error');
    }
}

/**
 * Авто-маппінг опцій за назвою
 * @param {Array<string>} selectedIds - Масив ID вибраних MP опцій
 */
export async function handleAutoMapOptions(selectedIds) {
    console.log(`🤖 Авто-маппінг опцій: ${selectedIds.length} обрано`);

    // Фільтруємо тільки MP опції
    const mpIds = selectedIds.filter(id => {
        const mpOpts = getMpOptions();
        return mpOpts.some(o => o.id === id);
    });

    if (mpIds.length === 0) {
        showToast('Оберіть опції маркетплейсу для авто-маппінгу', 'warning');
        return;
    }

    showToast('Авто-маппінг...', 'info');

    try {
        const result = await autoMapOptions(mpIds);

        // Очищуємо вибір
        if (mapperState.selectedRows.options) {
            mapperState.selectedRows.options.clear();
        }
        const batchBar = getBatchBar('mapper-options');
        if (batchBar) batchBar.deselectAll();

        // Оновлюємо таблицю
        await renderCurrentTab();

        if (result.mapped.length > 0) {
            showToast(`Авто-замаплено ${result.mapped.length} з ${mpIds.length} опцій`, 'success');
        } else {
            showToast(`Не знайдено відповідностей серед ${mpIds.length} опцій`, 'warning');
        }
    } catch (error) {
        console.error('❌ Помилка авто-маппінгу:', error);
        showToast('Помилка при авто-маппінгу', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ПЕРЕГЛЯД MP ДАНИХ (READ-ONLY)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати read-only модалку для MP характеристики
 * @param {string|Object} mpCharIdOrData - ID MP характеристики або об'єкт з даними
 */
export async function showViewMpCharacteristicModal(mpCharIdOrData) {
    console.log(`👁️ Перегляд MP характеристики`, mpCharIdOrData);

    let mpChar;

    // Приймаємо як ID (string), так і об'єкт
    if (typeof mpCharIdOrData === 'object' && mpCharIdOrData !== null) {
        mpChar = mpCharIdOrData;
    } else {
        const mpChars = getMpCharacteristics();
        console.log(`📊 Всього MP характеристик: ${mpChars.length}, шукаємо ID: ${mpCharIdOrData}`);
        mpChar = mpChars.find(c => c.id === mpCharIdOrData);

        if (!mpChar) {
            // Спробуємо пошук за external_id
            mpChar = mpChars.find(c => c.external_id === mpCharIdOrData);
            if (mpChar) {
                console.log(`✅ Знайдено за external_id`);
            }
        }
    }

    if (!mpChar) {
        showToast('MP характеристику не знайдено', 'error');
        console.error(`❌ MP характеристику не знайдено: ${mpCharIdOrData}`);
        return;
    }

    // Парсимо data якщо потрібно
    let charData = mpChar;
    if (mpChar.data && typeof mpChar.data === 'string') {
        try {
            charData = { ...mpChar, ...JSON.parse(mpChar.data) };
        } catch (e) {
            // Залишаємо як є
        }
    }

    // Знаходимо назву маркетплейсу
    const marketplaces = getMarketplaces();
    const marketplace = marketplaces.find(m => m.id === mpChar.marketplace_id);
    const mpName = marketplace ? marketplace.name : mpChar.marketplace_id;

    // Знаходимо назву прив'язаної характеристики
    let mappedToName = '';
    if (charData.our_char_id) {
        const ownChars = getCharacteristics();
        const ownChar = ownChars.find(c => c.id === charData.our_char_id);
        mappedToName = ownChar ? (ownChar.name_ua || ownChar.id) : charData.our_char_id;
    }

    const modalHtml = `
        <div class="modal-overlay">
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
            </div>
        </div>
    `;

    // Показуємо модалку
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = modalHtml;
    const modalOverlay = tempContainer.firstElementChild;
    document.body.appendChild(modalOverlay);

    // Обробники
    const closeBtn = modalOverlay.querySelector('.modal-close-btn');
    const closeThisModal = () => modalOverlay.remove();

    closeBtn.addEventListener('click', closeThisModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeThisModal();
    });
}

/**
 * Показати read-only модалку для MP опції
 * @param {string|Object} mpOptionIdOrData - ID MP опції або об'єкт з даними
 */
export async function showViewMpOptionModal(mpOptionIdOrData) {
    console.log(`👁️ Перегляд MP опції`, mpOptionIdOrData);

    let mpOption;

    // Приймаємо як ID (string), так і об'єкт
    if (typeof mpOptionIdOrData === 'object' && mpOptionIdOrData !== null) {
        mpOption = mpOptionIdOrData;
    } else {
        const mpOpts = getMpOptions();
        console.log(`📊 Всього MP опцій: ${mpOpts.length}, шукаємо ID: ${mpOptionIdOrData}`);
        mpOption = mpOpts.find(o => o.id === mpOptionIdOrData);

        if (!mpOption) {
            // Спробуємо пошук за external_id
            mpOption = mpOpts.find(o => o.external_id === mpOptionIdOrData);
            if (mpOption) {
                console.log(`✅ Знайдено за external_id`);
            }
        }
    }

    if (!mpOption) {
        showToast('MP опцію не знайдено', 'error');
        console.error(`❌ MP опцію не знайдено: ${mpOptionIdOrData}`);
        return;
    }

    // Парсимо data якщо потрібно
    let optData = mpOption;
    if (mpOption.data && typeof mpOption.data === 'string') {
        try {
            optData = { ...mpOption, ...JSON.parse(mpOption.data) };
        } catch (e) {
            // Залишаємо як є
        }
    }

    // Знаходимо назву маркетплейсу
    const marketplaces = getMarketplaces();
    const marketplace = marketplaces.find(m => m.id === mpOption.marketplace_id);
    const mpName = marketplace ? marketplace.name : mpOption.marketplace_id;

    // Знаходимо назву прив'язаної опції
    let mappedToName = '';
    if (optData.our_option_id) {
        const ownOpts = getOptions();
        const ownOpt = ownOpts.find(o => o.id === optData.our_option_id);
        mappedToName = ownOpt ? (ownOpt.value_ua || ownOpt.id) : optData.our_option_id;
    }

    const modalHtml = `
        <div class="modal-overlay">
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
            </div>
        </div>
    `;

    // Показуємо модалку
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = modalHtml;
    const modalOverlay = tempContainer.firstElementChild;
    document.body.appendChild(modalOverlay);

    // Обробники
    const closeBtn = modalOverlay.querySelector('.modal-close-btn');
    const closeThisModal = () => modalOverlay.remove();

    closeBtn.addEventListener('click', closeThisModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeThisModal();
    });
}
