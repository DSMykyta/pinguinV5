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
 * ║  - showEditMarketplaceModal(id) — Модалка редагування                    ║
 * ║  - showMarketplaceDataModal(id) — Перегляд даних маркетплейсу            ║
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
    createCategoryMapping, deleteCategoryMapping, getMapCategories
} from './mapper-data.js';
import { renderCurrentTab } from './mapper-table.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { showConfirmModal } from '../common/ui-modal-confirm.js';
import { escapeHtml } from '../utils/text-utils.js';

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
// CRUD МОДАЛКИ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модальне вікно для додавання маркетплейсу
 */
export async function showAddMarketplaceModal() {

    await showModal('mapper-marketplace-edit', null);
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
    if (activeYes) activeYes.checked = true;
    if (activeNo) activeNo.checked = false;
}

// ═══════════════════════════════════════════════════════════════════════════
// ПЕРЕГЛЯД ДАНИХ МАРКЕТПЛЕЙСУ
// ═══════════════════════════════════════════════════════════════════════════

const mpDataModalState = {
    marketplaceId: null,
    marketplaceName: '',
    activeTab: 'categories',
    filter: 'all',
    searchQuery: '',
    categories: [],
    characteristics: [],
    options: []
};

const MP_DATA_PAGE_SIZE = 100;

/**
 * Показати дані маркетплейсу
 */
export async function showMarketplaceDataModal(id) {

    const marketplaces = getMarketplaces();
    const marketplace = marketplaces.find(m => m.id === id);

    if (!marketplace) {
        showToast('Маркетплейс не знайдено', 'error');
        return;
    }

    mpDataModalState.marketplaceId = id;
    mpDataModalState.marketplaceName = marketplace.name;
    mpDataModalState.activeTab = 'categories';
    mpDataModalState.filter = 'all';
    mpDataModalState.searchQuery = '';

    await showModal('mapper-mp-data', null);
    await new Promise(resolve => requestAnimationFrame(resolve));

    const title = document.getElementById('mp-data-modal-title');
    if (title) title.textContent = `${marketplace.name} - Дані`;

    await loadMpDataForModal(id);
    initMpDataModalEvents();
    renderMpDataModalTable();
}

async function loadMpDataForModal(marketplaceId) {
    const allCats = getMpCategories();
    const allChars = getMpCharacteristics();
    const allOpts = getMpOptions();

    if (allCats.length === 0) await loadMpCategories();
    if (allChars.length === 0) await loadMpCharacteristics();
    if (allOpts.length === 0) await loadMpOptions();

    mpDataModalState.categories = getMpCategories().filter(c => c.marketplace_id === marketplaceId);
    mpDataModalState.characteristics = getMpCharacteristics().filter(c => c.marketplace_id === marketplaceId);
    mpDataModalState.options = getMpOptions().filter(o => o.marketplace_id === marketplaceId);

    const catCount = document.getElementById('mp-data-cat-count');
    const charCount = document.getElementById('mp-data-char-count');
    const optCount = document.getElementById('mp-data-opt-count');

    if (catCount) catCount.textContent = mpDataModalState.categories.length;
    if (charCount) charCount.textContent = mpDataModalState.characteristics.length;
    if (optCount) optCount.textContent = mpDataModalState.options.length;

}

function initMpDataModalEvents() {
    const tabButtons = document.querySelectorAll('#mp-data-tabs [data-mp-tab]');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mpDataModalState.activeTab = btn.dataset.mpTab;
            renderMpDataModalTable();
        });
    });

    const filterButtons = document.querySelectorAll('#mp-data-filter-pills [data-mp-filter]');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mpDataModalState.filter = btn.dataset.mpFilter;
            renderMpDataModalTable();
        });
    });

    const searchInput = document.getElementById('mp-data-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            mpDataModalState.searchQuery = e.target.value.toLowerCase();
            renderMpDataModalTable();
        });
    }
}

function renderMpDataModalTable() {
    const container = document.getElementById('mp-data-table-container');
    if (!container) return;

    const { activeTab, filter, searchQuery } = mpDataModalState;

    let data = [];
    let columns = [];

    if (activeTab === 'categories') {
        data = [...mpDataModalState.categories];
    } else if (activeTab === 'characteristics') {
        data = [...mpDataModalState.characteristics];
        columns = getMpCharacteristicsColumns();
    } else if (activeTab === 'options') {
        data = [...mpDataModalState.options];
        columns = getMpOptionsColumns();
    }

    // Фільтр mapped/unmapped
    if (filter === 'mapped') {
        data = data.filter(item => {
            if (activeTab === 'categories') return isCatMapped(item);
            if (activeTab === 'characteristics') return !!item.our_char_id;
            if (activeTab === 'options') return !!item.our_option_id;
            return true;
        });
    } else if (filter === 'unmapped') {
        data = data.filter(item => {
            if (activeTab === 'categories') return !isCatMapped(item);
            if (activeTab === 'characteristics') return !item.our_char_id;
            if (activeTab === 'options') return !item.our_option_id;
            return true;
        });
    }

    // Пошук
    if (searchQuery) {
        data = data.filter(item => {
            const name = extractMpName(item).toLowerCase();
            const extId = (item.external_id || '').toLowerCase();
            return name.includes(searchQuery) || extId.includes(searchQuery);
        });
    }

    const totalCount = activeTab === 'categories' ? mpDataModalState.categories.length :
        activeTab === 'characteristics' ? mpDataModalState.characteristics.length :
            mpDataModalState.options.length;
    const statsEl = document.getElementById('mp-data-stats-text');

    if (data.length === 0) {
        container.innerHTML = `
            <div class="empty-state-container">
                <div class="avatar-state-message">Дані відсутні</div>
            </div>
        `;
        if (statsEl) statsEl.textContent = `Показано 0 з ${totalCount}`;
        return;
    }

    if (statsEl) statsEl.textContent = `Показано ${data.length} з ${totalCount}`;

    // Категорії — дерево; інші — таблиця
    if (activeTab === 'categories') {
        renderMpCategoryTree(container, data);
        return;
    }

    // Таблиця для характеристик/опцій
    const displayData = data.slice(0, MP_DATA_PAGE_SIZE);
    const hasMore = data.length > MP_DATA_PAGE_SIZE;

    try {
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

        if (hasMore) {
            tableHtml += `
                <div class="mp-data-more-hint" style="text-align: center; padding: 1rem; color: var(--color-text-tertiary);">
                    Показано перші ${MP_DATA_PAGE_SIZE} записів. Використовуйте пошук для фільтрації.
                </div>
            `;
        }

        container.innerHTML = tableHtml;
    } catch (error) {
        console.error('❌ Error rendering table:', error);
        container.innerHTML = `
            <div class="empty-state-container">
                <div class="avatar-state-message">Помилка відображення: ${error.message}</div>
            </div>
        `;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ДЕРЕВО MP КАТЕГОРІЙ
// ═══════════════════════════════════════════════════════════════════════════

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
 * Перевірити чи MP категорія замаплена (через таблицю маппінгів)
 */
function isCatMapped(mpCat) {
    const mapCats = getMapCategories();
    return mapCats.some(m =>
        m.mp_category_id === mpCat.id || m.mp_category_id === mpCat.external_id
    );
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
function renderMpCategoryTree(container, data) {
    const ownCategories = getCategories();

    // Побудувати дерево: parentJsonId → [children]
    const byParent = new Map();    // parentId → [items]
    const byJsonId = new Map();    // _jsonId → item

    data.forEach(item => {
        const jsonId = item._jsonId || item.external_id || '';
        if (jsonId) byJsonId.set(jsonId, item);
    });

    // Визначити кореневі елементи
    const dataSet = new Set(data.map(d => d._jsonId || d.external_id || ''));

    data.forEach(item => {
        const parentId = String(item.parentId || item.parent_id || '');
        // Рут = немає parent або parent не знайдений в даних
        const key = (parentId && dataSet.has(parentId)) ? parentId : 'root';
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key).push(item);
    });

    // Сортувати кожен рівень по назві
    byParent.forEach(children => {
        children.sort((a, b) => extractMpName(a).localeCompare(extractMpName(b), 'uk'));
    });

    // Побудувати опції для select
    const ownOptionsHtml = `<option value="">—</option>` + ownCategories.map(c =>
        `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name_ua || c.id)}</option>`
    ).join('');

    // Рекурсивний рендер
    function buildTree(parentKey, level) {
        const children = byParent.get(parentKey);
        if (!children || children.length === 0) return '';

        const items = children.map(item => {
            const jsonId = item._jsonId || item.external_id || '';
            const hasChildren = byParent.has(jsonId) && byParent.get(jsonId).length > 0;
            const isOpen = level < 1;
            const name = extractMpName(item) || item.external_id || '?';

            // Знайти поточний маппінг
            const mapping = findCatMapping(item);
            const mappedCatId = mapping?.category_id || '';

            const toggleHtml = hasChildren
                ? `<button class="toggle-btn"><span class="material-symbols-outlined">arrow_drop_down</span></button>`
                : `<span class="leaf-placeholder"></span>`;

            const childrenHtml = hasChildren ? buildTree(jsonId, level + 1) : '';

            const classes = [
                hasChildren ? 'has-children' : '',
                isOpen ? 'is-open' : ''
            ].filter(Boolean).join(' ');

            return `
                <li data-id="${escapeHtml(item.id)}" class="${classes}">
                    <div class="tree-item-content mp-tree-item">
                        ${toggleHtml}
                        <span class="tree-item-name">${escapeHtml(name)}</span>
                        <select class="mp-tree-mapping" data-mp-cat-id="${escapeHtml(item.id)}">
                            ${ownOptionsHtml.replace(`value="${escapeHtml(mappedCatId)}"`, `value="${escapeHtml(mappedCatId)}" selected`)}
                        </select>
                    </div>
                    ${childrenHtml}
                </li>
            `;
        }).join('');

        return `<ul class="glossary-tree-level-${Math.min(level, 5)}">${items}</ul>`;
    }

    const treeHtml = buildTree('root', 0);
    container.innerHTML = `<div class="glossary-tree mp-category-tree">${treeHtml || '<p class="u-text-muted u-p-16">Дані відсутні</p>'}</div>`;

    // Toggle expand/collapse
    container.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const li = btn.closest('li');
            if (li) li.classList.toggle('is-open');
        });
    });

    // Mapping dropdown change
    container.querySelectorAll('.mp-tree-mapping').forEach(select => {
        select.addEventListener('change', async () => {
            const mpCatId = select.dataset.mpCatId;
            const newOwnCatId = select.value;

            // Знайти MP категорію
            const mpCat = data.find(c => c.id === mpCatId);
            if (!mpCat) return;

            // Видалити старий маппінг якщо є
            const oldMapping = findCatMapping(mpCat);
            if (oldMapping) {
                try {
                    await deleteCategoryMapping(oldMapping.id);
                } catch (err) {
                    showToast('Помилка видалення маппінгу', 'error');
                    return;
                }
            }

            // Створити новий маппінг якщо обрано категорію
            if (newOwnCatId) {
                try {
                    await createCategoryMapping(newOwnCatId, mpCatId);
                    showToast('Прив\'язано', 'success');
                } catch (err) {
                    showToast('Помилка створення маппінгу', 'error');
                }
            } else if (oldMapping) {
                showToast('Прив\'язку видалено', 'success');
            }
        });
    });
}

function getMpCategoriesColumns() {
    const categories = getCategories();
    return [
        { id: 'external_id', label: 'ID', className: 'cell-m' },
        { id: 'name', label: 'Назва', className: 'cell-xl', render: (v) => `<strong>${escapeHtml(v || '')}</strong>` },
        { id: 'parent_name', label: 'Батьківська' },
        {
            id: 'our_category_id',
            label: 'Наша категорія',
            render: (v) => {
                if (!v) return '<span class="severity-badge severity-high">Не прив\'язано</span>';
                const cat = categories.find(c => c.id === v);
                return `<span class="severity-badge severity-low">${escapeHtml(cat?.name_ua || v)}</span>`;
            }
        }
    ];
}

function getMpCharacteristicsColumns() {
    const characteristics = getCharacteristics();
    return [
        { id: 'external_id', label: 'ID', className: 'cell-m' },
        { id: 'name', label: 'Назва', className: 'cell-xl', render: (v) => `<strong>${escapeHtml(v || '')}</strong>` },
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

function getMpOptionsColumns() {
    const options = getOptions();
    return [
        { id: 'external_id', label: 'ID', className: 'cell-m' },
        { id: 'name', label: 'Назва', className: 'cell-xl', render: (v) => `<strong>${escapeHtml(v || '')}</strong>` },
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
