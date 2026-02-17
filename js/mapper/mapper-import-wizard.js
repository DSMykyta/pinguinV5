// js/mapper/mapper-import-wizard.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - IMPORT WIZARD                                ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Wizard імпорту MP довідників як власних                     ║
 * ║                                                                          ║
 * ║  ПРИЗНАЧЕННЯ:                                                            ║
 * ║  Гнучкий імпорт категорій та характеристик з маркетплейсів               ║
 * ║  у власний довідник з можливістю вибору що імпортувати.                  ║
 * ║                                                                          ║
 * ║  ФУНКЦІОНАЛ:                                                             ║
 * ║  - TreeSelect для вибору категорій/характеристик                         ║
 * ║  - Опції імпортуються всі або жодна (без вибору)                         ║
 * ║  - Preview перед імпортом                                                ║
 * ║  - Імпорт як source='Власний'                                            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { mapperState, registerHook, markPluginLoaded } from './mapper-state.js';
import {
    getMpCategories, getMpCharacteristics, getMpOptions,
    getCategories, getCharacteristics, getOptions,
    addCategory, addCharacteristic, addOption,
    getMarketplaces
} from './mapper-data.js';
import { renderCurrentTab } from './mapper-table.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { showToast } from '../common/ui-toast.js';
import { escapeHtml } from '../utils/text-utils.js';

export const PLUGIN_NAME = 'mapper-import-wizard';

// ═══════════════════════════════════════════════════════════════════════════
// СТАН WIZARD
// ═══════════════════════════════════════════════════════════════════════════

const wizardState = {
    step: 1,                    // 1: Вибір MP, 2: TreeSelect, 3: Preview, 4: Import
    selectedMp: null,           // { id, name, slug }

    // Дані з MP
    mpData: {
        categories: [],         // MP категорії
        characteristics: [],    // MP характеристики
        options: []             // MP опції
    },

    // Вибрані елементи
    selection: {
        categories: new Set(),      // ID вибраних категорій
        characteristics: new Set()  // ID вибраних характеристик
    },

    // Expanded nodes в дереві
    expandedNodes: new Set(),

    // Статистика для preview
    stats: {
        categories: 0,
        characteristics: 0,
        options: 0
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// ІНІЦІАЛІЗАЦІЯ
// ═══════════════════════════════════════════════════════════════════════════

export function init() {
    registerHook('onDataLoaded', handleDataLoaded);
    markPluginLoaded(PLUGIN_NAME);
}

function handleDataLoaded() {
    // Оновити дані якщо потрібно
}

// ═══════════════════════════════════════════════════════════════════════════
// ГОЛОВНА ФУНКЦІЯ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати wizard імпорту MP як власний довідник
 */
export async function showImportAsOwnWizard() {
    // Скидаємо стан
    resetWizardState();

    // Показуємо модальне вікно
    await showModal('mapper-import-wizard', null, {
        title: 'Імпорт довідника як власний',
        size: 'large'
    });

    // Ініціалізуємо UI
    initWizardUI();
}

function resetWizardState() {
    wizardState.step = 1;
    wizardState.selectedMp = null;
    wizardState.mpData = { categories: [], characteristics: [], options: [] };
    wizardState.selection = { categories: new Set(), characteristics: new Set() };
    wizardState.expandedNodes = new Set();
    wizardState.stats = { categories: 0, characteristics: 0, options: 0 };
}

// ═══════════════════════════════════════════════════════════════════════════
// UI WIZARD
// ═══════════════════════════════════════════════════════════════════════════

function initWizardUI() {
    const modal = document.getElementById('modal-mapper-import-wizard');
    if (!modal) return;

    // Рендеримо крок 1
    renderStep1();
}

/**
 * Крок 1: Вибір маркетплейсу
 */
function renderStep1() {
    const container = document.getElementById('wizard-content');
    if (!container) return;

    const marketplaces = getMarketplaces().filter(mp => {
        // Тільки активні маркетплейси з даними
        const isActive = mp.is_active === true || String(mp.is_active).toLowerCase() === 'true';
        return isActive;
    });

    container.innerHTML = `
        <div class="wizard-step wizard-step-1">
            <h3 class="wizard-step-title title-l">Крок 1: Оберіть маркетплейс</h3>
            <p class="wizard-step-desc body-m">Виберіть маркетплейс, довідник якого хочете імпортувати як власний</p>

            <div class="mp-select-grid">
                ${marketplaces.map(mp => `
                    <button class="mp-select-card" data-mp-id="${mp.id}" data-mp-name="${escapeHtml(mp.name || mp.slug)}" data-mp-slug="${mp.slug || ''}">
                        <span class="mp-name">${escapeHtml(mp.name || mp.slug)}</span>
                        <span class="mp-stats">${getMpStats(mp.id)}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    // Обробники
    container.querySelectorAll('.mp-select-card').forEach(card => {
        card.addEventListener('click', () => selectMarketplace(card));
    });

    updateWizardButtons();
}

function getMpStats(mpId) {
    const cats = getMpCategories().filter(c => c.mp_id?.startsWith(`mp-${mpId}`) || c.marketplace_id === mpId);
    const chars = getMpCharacteristics().filter(c => c.mp_id?.startsWith(`mp-${mpId}`) || c.marketplace_id === mpId);
    return `${cats.length} категорій, ${chars.length} характеристик`;
}

function selectMarketplace(card) {
    // Знімаємо вибір з інших
    document.querySelectorAll('.mp-select-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');

    wizardState.selectedMp = {
        id: card.dataset.mpId,
        name: card.dataset.mpName,
        slug: card.dataset.mpSlug
    };

    updateWizardButtons();
}

/**
 * Крок 2: TreeSelect вибору категорій/характеристик
 */
function renderStep2() {
    const container = document.getElementById('wizard-content');
    if (!container) return;

    // Завантажуємо дані MP
    loadMpData();

    container.innerHTML = `
        <div class="wizard-step wizard-step-2">
            <h3 class="wizard-step-title title-l">Крок 2: Оберіть що імпортувати</h3>
            <p class="wizard-step-desc body-m">
                Розгорніть категорії щоб побачити характеристики.
                <strong>Опції імпортуються автоматично разом з характеристиками.</strong>
            </p>

            <div class="tree-toolbar">
                <button class="btn-text" id="tree-select-all">
                    <span class="material-symbols-outlined">check_box</span>
                    Вибрати все
                </button>
                <button class="btn-text" id="tree-deselect-all">
                    <span class="material-symbols-outlined">check_box_outline_blank</span>
                    Зняти все
                </button>
                <button class="btn-text" id="tree-expand-all">
                    <span class="material-symbols-outlined">unfold_more</span>
                    Розгорнути
                </button>
                <button class="btn-text" id="tree-collapse-all">
                    <span class="material-symbols-outlined">unfold_less</span>
                    Згорнути
                </button>
            </div>

            <div class="tree-container" id="tree-container">
                ${renderTreeNodes()}
            </div>

            <div class="tree-selection-summary" id="tree-selection-summary">
                ${renderSelectionSummary()}
            </div>
        </div>
    `;

    // Обробники
    initTreeSelectHandlers();
    updateWizardButtons();
}

function loadMpData() {
    const mpId = wizardState.selectedMp?.id;
    if (!mpId) return;

    // Завантажуємо категорії MP
    wizardState.mpData.categories = getMpCategories().filter(cat => {
        // Фільтруємо по marketplace_id
        return cat.marketplace_id === mpId;
    }).map(cat => {
        let data = cat.data;
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) { data = {}; }
        }
        return {
            id: cat.id,
            mp_id: cat.mp_id,
            name: data?.name || cat.mp_id,
            parent_id: data?.parent_id || null
        };
    });

    // Завантажуємо характеристики MP
    wizardState.mpData.characteristics = getMpCharacteristics().filter(char => {
        return char.marketplace_id === mpId;
    }).map(char => {
        let data = char.data;
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) { data = {}; }
        }
        // category_id може бути списком через кому
        const categoryIds = (data?.category_id || '').split(',').map(id => id.trim()).filter(Boolean);
        return {
            id: char.id,
            mp_id: char.mp_id,
            name: data?.name || char.mp_id,
            type: data?.type || 'text',
            category_ids: categoryIds,
            is_global: data?.is_global === true || String(data?.is_global).toLowerCase() === 'true'
        };
    });

    // Завантажуємо опції MP
    wizardState.mpData.options = getMpOptions().filter(opt => {
        return opt.marketplace_id === mpId;
    }).map(opt => {
        let data = opt.data;
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) { data = {}; }
        }
        return {
            id: opt.id,
            mp_id: opt.mp_id,
            name: data?.name || data?.value || opt.mp_id,
            characteristic_id: data?.characteristic_id
        };
    });
}

function renderTreeNodes() {
    const { categories, characteristics } = wizardState.mpData;

    if (categories.length === 0) {
        return '<div class="tree-empty">Немає категорій для імпорту</div>';
    }

    // Групуємо характеристики по категоріям
    const charsByCategory = new Map();
    characteristics.forEach(char => {
        char.category_ids.forEach(catId => {
            if (!charsByCategory.has(catId)) {
                charsByCategory.set(catId, []);
            }
            charsByCategory.get(catId).push(char);
        });
    });

    // Глобальні характеристики (без категорії або is_global)
    const globalChars = characteristics.filter(c => c.is_global || c.category_ids.length === 0);

    let html = '';

    // Глобальні характеристики
    if (globalChars.length > 0) {
        html += `
            <div class="tree-node tree-node-global">
                <div class="tree-node-header">
                    <span class="tree-expand-icon"></span>
                    <label class="tree-checkbox">
                        <input type="checkbox" data-type="global" ${isAllGlobalSelected() ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                    <span class="tree-node-label">🌐 Глобальні характеристики</span>
                    <span class="tree-node-count">${globalChars.length}</span>
                </div>
                <div class="tree-node-children tree-expanded">
                    ${globalChars.map(char => renderCharacteristicNode(char)).join('')}
                </div>
            </div>
        `;
    }

    // Категорії
    categories.forEach(cat => {
        const catChars = charsByCategory.get(cat.mp_id) || [];
        const isExpanded = wizardState.expandedNodes.has(cat.id);
        const isSelected = wizardState.selection.categories.has(cat.id);
        const optionsCount = countOptionsForCategory(cat.mp_id);

        html += `
            <div class="tree-node tree-node-category" data-category-id="${cat.id}">
                <div class="tree-node-header">
                    <span class="tree-expand-icon ${catChars.length > 0 ? 'has-children' : ''} ${isExpanded ? 'expanded' : ''}"
                          data-toggle-category="${cat.id}">
                        ${catChars.length > 0 ? '<span class="material-symbols-outlined">chevron_right</span>' : ''}
                    </span>
                    <label class="tree-checkbox">
                        <input type="checkbox" data-type="category" data-id="${cat.id}" ${isSelected ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                    <span class="tree-node-label">${escapeHtml(cat.name)}</span>
                    <span class="tree-node-count" title="${catChars.length} характеристик, ${optionsCount} опцій">
                        ${catChars.length} хар. / ${optionsCount} опц.
                    </span>
                </div>
                <div class="tree-node-children ${isExpanded ? 'tree-expanded' : 'tree-collapsed'}">
                    ${catChars.map(char => renderCharacteristicNode(char, cat.id)).join('')}
                </div>
            </div>
        `;
    });

    return html;
}

function renderCharacteristicNode(char, categoryId = null) {
    const isSelected = wizardState.selection.characteristics.has(char.id);
    const optionsCount = countOptionsForCharacteristic(char.mp_id);

    return `
        <div class="tree-node tree-node-characteristic" data-char-id="${char.id}">
            <div class="tree-node-header tree-node-leaf">
                <label class="tree-checkbox">
                    <input type="checkbox" data-type="characteristic" data-id="${char.id}"
                           data-category-id="${categoryId || ''}" ${isSelected ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>
                <span class="tree-node-label">${escapeHtml(char.name)}</span>
                <span class="tree-node-type">${char.type}</span>
                <span class="tree-node-count" title="${optionsCount} опцій">${optionsCount} опц.</span>
            </div>
        </div>
    `;
}

function countOptionsForCategory(categoryMpId) {
    const chars = wizardState.mpData.characteristics.filter(c => c.category_ids.includes(categoryMpId));
    return chars.reduce((sum, char) => sum + countOptionsForCharacteristic(char.mp_id), 0);
}

function countOptionsForCharacteristic(charMpId) {
    return wizardState.mpData.options.filter(o => o.characteristic_id === charMpId).length;
}

function isAllGlobalSelected() {
    const globalChars = wizardState.mpData.characteristics.filter(c => c.is_global || c.category_ids.length === 0);
    return globalChars.length > 0 && globalChars.every(c => wizardState.selection.characteristics.has(c.id));
}

function renderSelectionSummary() {
    const { categories, characteristics } = wizardState.selection;
    const selectedChars = wizardState.mpData.characteristics.filter(c => characteristics.has(c.id));
    const optionsCount = selectedChars.reduce((sum, char) => sum + countOptionsForCharacteristic(char.mp_id), 0);

    wizardState.stats = {
        categories: categories.size,
        characteristics: characteristics.size,
        options: optionsCount
    };

    return `
        <div class="tree-summary-item">
            <span class="tree-summary-label">Категорій:</span>
            <span class="tree-summary-value">${categories.size}</span>
        </div>
        <div class="tree-summary-item">
            <span class="tree-summary-label">Характеристик:</span>
            <span class="tree-summary-value">${characteristics.size}</span>
        </div>
        <div class="tree-summary-item">
            <span class="tree-summary-label">Опцій:</span>
            <span class="tree-summary-value">${optionsCount}</span>
        </div>
    `;
}

function initTreeSelectHandlers() {
    const container = document.getElementById('tree-container');
    if (!container) return;

    // Toggle expand/collapse
    container.addEventListener('click', (e) => {
        const toggle = e.target.closest('[data-toggle-category]');
        if (toggle) {
            const categoryId = toggle.dataset.toggleCategory;
            toggleCategoryExpand(categoryId);
            return;
        }
    });

    // Checkbox changes
    container.addEventListener('change', (e) => {
        const checkbox = e.target;
        if (!checkbox.matches('input[type="checkbox"]')) return;

        const type = checkbox.dataset.type;
        const id = checkbox.dataset.id;
        const checked = checkbox.checked;

        if (type === 'category') {
            handleCategoryToggle(id, checked);
        } else if (type === 'characteristic') {
            handleCharacteristicToggle(id, checked);
        } else if (type === 'global') {
            handleGlobalToggle(checked);
        }

        updateSelectionSummary();
        updateWizardButtons();
    });

    // Toolbar buttons
    document.getElementById('tree-select-all')?.addEventListener('click', selectAll);
    document.getElementById('tree-deselect-all')?.addEventListener('click', deselectAll);
    document.getElementById('tree-expand-all')?.addEventListener('click', expandAll);
    document.getElementById('tree-collapse-all')?.addEventListener('click', collapseAll);
}

function toggleCategoryExpand(categoryId) {
    if (wizardState.expandedNodes.has(categoryId)) {
        wizardState.expandedNodes.delete(categoryId);
    } else {
        wizardState.expandedNodes.add(categoryId);
    }

    const node = document.querySelector(`[data-category-id="${categoryId}"]`);
    if (node) {
        const icon = node.querySelector('.tree-expand-icon');
        const children = node.querySelector('.tree-node-children');

        if (wizardState.expandedNodes.has(categoryId)) {
            icon?.classList.add('expanded');
            children?.classList.remove('tree-collapsed');
            children?.classList.add('tree-expanded');
        } else {
            icon?.classList.remove('expanded');
            children?.classList.remove('tree-expanded');
            children?.classList.add('tree-collapsed');
        }
    }
}

function handleCategoryToggle(categoryId, checked) {
    if (checked) {
        wizardState.selection.categories.add(categoryId);
    } else {
        wizardState.selection.categories.delete(categoryId);
    }

    // Також вибираємо/знімаємо всі характеристики цієї категорії
    const cat = wizardState.mpData.categories.find(c => c.id === categoryId);
    if (cat) {
        const catChars = wizardState.mpData.characteristics.filter(c => c.category_ids.includes(cat.mp_id));
        catChars.forEach(char => {
            if (checked) {
                wizardState.selection.characteristics.add(char.id);
            } else {
                wizardState.selection.characteristics.delete(char.id);
            }
        });

        // Оновлюємо чекбокси характеристик
        const categoryNode = document.querySelector(`[data-category-id="${categoryId}"]`);
        if (categoryNode) {
            categoryNode.querySelectorAll('input[data-type="characteristic"]').forEach(cb => {
                cb.checked = checked;
            });
        }
    }
}

function handleCharacteristicToggle(charId, checked) {
    if (checked) {
        wizardState.selection.characteristics.add(charId);
    } else {
        wizardState.selection.characteristics.delete(charId);
    }
}

function handleGlobalToggle(checked) {
    const globalChars = wizardState.mpData.characteristics.filter(c => c.is_global || c.category_ids.length === 0);
    globalChars.forEach(char => {
        if (checked) {
            wizardState.selection.characteristics.add(char.id);
        } else {
            wizardState.selection.characteristics.delete(char.id);
        }
    });

    // Оновлюємо чекбокси
    document.querySelectorAll('.tree-node-global input[data-type="characteristic"]').forEach(cb => {
        cb.checked = checked;
    });
}

function selectAll() {
    wizardState.mpData.categories.forEach(cat => {
        wizardState.selection.categories.add(cat.id);
    });
    wizardState.mpData.characteristics.forEach(char => {
        wizardState.selection.characteristics.add(char.id);
    });

    document.querySelectorAll('#tree-container input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
    });

    updateSelectionSummary();
    updateWizardButtons();
}

function deselectAll() {
    wizardState.selection.categories.clear();
    wizardState.selection.characteristics.clear();

    document.querySelectorAll('#tree-container input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });

    updateSelectionSummary();
    updateWizardButtons();
}

function expandAll() {
    wizardState.mpData.categories.forEach(cat => {
        wizardState.expandedNodes.add(cat.id);
    });

    document.querySelectorAll('.tree-expand-icon').forEach(icon => {
        icon.classList.add('expanded');
    });
    document.querySelectorAll('.tree-node-children').forEach(children => {
        children.classList.remove('tree-collapsed');
        children.classList.add('tree-expanded');
    });
}

function collapseAll() {
    wizardState.expandedNodes.clear();

    document.querySelectorAll('.tree-expand-icon').forEach(icon => {
        icon.classList.remove('expanded');
    });
    document.querySelectorAll('.tree-node-children').forEach(children => {
        children.classList.remove('tree-expanded');
        children.classList.add('tree-collapsed');
    });
}

function updateSelectionSummary() {
    const summary = document.getElementById('tree-selection-summary');
    if (summary) {
        summary.innerHTML = renderSelectionSummary();
    }
}

/**
 * Крок 3: Preview
 */
function renderStep3() {
    const container = document.getElementById('wizard-content');
    if (!container) return;

    const { stats } = wizardState;

    container.innerHTML = `
        <div class="wizard-step wizard-step-3">
            <h3 class="wizard-step-title title-l">Крок 3: Підтвердження</h3>
            <p class="wizard-step-desc body-m">Перевірте що буде імпортовано як власний довідник</p>

            <div class="preview-box">
                <div class="preview-source">
                    <span class="material-symbols-outlined">cloud_download</span>
                    <span>З маркетплейсу: <strong>${escapeHtml(wizardState.selectedMp?.name || '')}</strong></span>
                </div>

                <div class="preview-arrow">
                    <span class="material-symbols-outlined">arrow_downward</span>
                </div>

                <div class="preview-target">
                    <span class="material-symbols-outlined">folder</span>
                    <span>У власний довідник</span>
                </div>

                <div class="preview-stats">
                    <div class="preview-stat">
                        <span class="preview-stat-value">${stats.categories}</span>
                        <span class="preview-stat-label">Категорій</span>
                    </div>
                    <div class="preview-stat">
                        <span class="preview-stat-value">${stats.characteristics}</span>
                        <span class="preview-stat-label">Характеристик</span>
                    </div>
                    <div class="preview-stat">
                        <span class="preview-stat-value">${stats.options}</span>
                        <span class="preview-stat-label">Опцій</span>
                    </div>
                </div>
            </div>

            <div class="preview-warning">
                <span class="material-symbols-outlined">info</span>
                <span>Дублікати (за назвою) будуть пропущені автоматично</span>
            </div>
        </div>
    `;

    updateWizardButtons();
}

/**
 * Крок 4: Імпорт
 */
async function executeImport() {
    const container = document.getElementById('wizard-content');
    if (!container) return;

    container.innerHTML = `
        <div class="wizard-step wizard-step-4">
            <h3 class="wizard-step-title title-l">Імпорт...</h3>
            <div class="import-progress">
                <div class="progress-bar">
                    <div class="progress-fill" id="import-progress-fill"></div>
                </div>
                <div class="progress-text" id="import-progress-text">Підготовка...</div>
            </div>
        </div>
    `;

    // Ховаємо кнопки під час імпорту
    const buttons = document.querySelector('.wizard-buttons');
    if (buttons) buttons.style.display = 'none';

    try {
        await performImport();

        container.innerHTML = `
            <div class="wizard-step wizard-step-complete">
                <div class="success-icon">
                    <span class="material-symbols-outlined">check_circle</span>
                </div>
                <h3 class="wizard-step-title title-l">Імпорт завершено!</h3>
                <p class="wizard-step-desc body-m">Дані успішно імпортовано у власний довідник</p>
            </div>
        `;

        // Показуємо кнопку закриття
        if (buttons) {
            buttons.style.display = 'flex';
            buttons.innerHTML = `
                <button class="btn-primary" id="wizard-close">Закрити</button>
            `;
            document.getElementById('wizard-close')?.addEventListener('click', () => {
                closeModal('mapper-import-wizard');
                renderCurrentTab();
            });
        }

        showToast('Імпорт завершено успішно', 'success');

    } catch (error) {
        console.error('Import error:', error);

        container.innerHTML = `
            <div class="wizard-step wizard-step-error">
                <div class="error-icon">
                    <span class="material-symbols-outlined">error</span>
                </div>
                <h3 class="wizard-step-title title-l">Помилка імпорту</h3>
                <p class="wizard-step-desc body-m">${escapeHtml(error.message || 'Невідома помилка')}</p>
            </div>
        `;

        if (buttons) {
            buttons.style.display = 'flex';
        }

        showToast('Помилка імпорту: ' + error.message, 'error');
    }
}

async function performImport() {
    const progress = document.getElementById('import-progress-fill');
    const progressText = document.getElementById('import-progress-text');

    const selectedCategories = Array.from(wizardState.selection.categories);
    const selectedCharacteristics = Array.from(wizardState.selection.characteristics);

    // Фільтруємо MP дані
    const categoriesToImport = wizardState.mpData.categories.filter(c => selectedCategories.includes(c.id));
    const charsToImport = wizardState.mpData.characteristics.filter(c => selectedCharacteristics.includes(c.id));
    const optionsToImport = wizardState.mpData.options.filter(o => {
        const char = charsToImport.find(c => c.mp_id === o.characteristic_id);
        return !!char;
    });

    const total = categoriesToImport.length + charsToImport.length + optionsToImport.length;
    let current = 0;

    // Існуючі власні дані (для перевірки дублікатів)
    const existingCategories = new Set(getCategories().map(c => (c.name_ua || c.name || '').toLowerCase()));
    const existingChars = new Set(getCharacteristics().map(c => (c.name || '').toLowerCase()));
    const existingOptions = new Set(getOptions().map(o => `${o.characteristic_id}:${(o.value || '').toLowerCase()}`));

    // Мапа для зв'язку MP ID -> наш ID
    const categoryIdMap = new Map();
    const charIdMap = new Map();

    // 1. Імпорт категорій
    progressText.textContent = 'Імпорт категорій...';
    for (const cat of categoriesToImport) {
        if (!existingCategories.has(cat.name.toLowerCase())) {
            const result = await addCategory({
                name_ua: cat.name,
                name_original: cat.name,
                source: 'Власний'
            });
            if (result?.id) {
                categoryIdMap.set(cat.mp_id, result.id);
            }
        }
        current++;
        if (progress) progress.style.width = `${(current / total) * 100}%`;
    }

    // 2. Імпорт характеристик
    progressText.textContent = 'Імпорт характеристик...';
    for (const char of charsToImport) {
        if (!existingChars.has(char.name.toLowerCase())) {
            // Визначаємо category_id для власної характеристики
            let ownCategoryId = '';
            if (char.category_ids.length > 0) {
                const mappedCatId = categoryIdMap.get(char.category_ids[0]);
                if (mappedCatId) ownCategoryId = mappedCatId;
            }

            const result = await addCharacteristic({
                name: char.name,
                type: char.type || 'text',
                category_id: ownCategoryId,
                source: 'Власний',
                is_global: char.is_global ? 'Так' : 'Ні'
            });
            if (result?.id) {
                charIdMap.set(char.mp_id, result.id);
            }
        }
        current++;
        if (progress) progress.style.width = `${(current / total) * 100}%`;
    }

    // 3. Імпорт опцій
    progressText.textContent = 'Імпорт опцій...';
    for (const opt of optionsToImport) {
        const ownCharId = charIdMap.get(opt.characteristic_id);
        if (ownCharId) {
            const optionKey = `${ownCharId}:${opt.name.toLowerCase()}`;
            if (!existingOptions.has(optionKey)) {
                await addOption({
                    value: opt.name,
                    characteristic_id: ownCharId,
                    source: 'Власний'
                });
            }
        }
        current++;
        if (progress) progress.style.width = `${(current / total) * 100}%`;
    }

    progressText.textContent = 'Завершено!';
    if (progress) progress.style.width = '100%';
}

// ═══════════════════════════════════════════════════════════════════════════
// НАВІГАЦІЯ WIZARD
// ═══════════════════════════════════════════════════════════════════════════

function updateWizardButtons() {
    const buttons = document.querySelector('.wizard-buttons');
    if (!buttons) return;

    const canNext = canGoNext();
    const canBack = wizardState.step > 1;
    const isLastStep = wizardState.step === 3;

    buttons.innerHTML = `
        ${canBack ? `
            <button class="btn-text" id="wizard-back">
                <span class="material-symbols-outlined">arrow_back</span>
                Назад
            </button>
        ` : '<div></div>'}

        ${isLastStep ? `
            <button class="btn-primary" id="wizard-import" ${canNext ? '' : 'disabled'}>
                <span class="material-symbols-outlined">download</span>
                Імпортувати
            </button>
        ` : `
            <button class="btn-primary" id="wizard-next" ${canNext ? '' : 'disabled'}>
                Далі
                <span class="material-symbols-outlined">arrow_forward</span>
            </button>
        `}
    `;

    document.getElementById('wizard-back')?.addEventListener('click', goBack);
    document.getElementById('wizard-next')?.addEventListener('click', goNext);
    document.getElementById('wizard-import')?.addEventListener('click', executeImport);
}

function canGoNext() {
    switch (wizardState.step) {
        case 1:
            return !!wizardState.selectedMp;
        case 2:
            return wizardState.selection.characteristics.size > 0;
        case 3:
            return true;
        default:
            return false;
    }
}

function goNext() {
    if (!canGoNext()) return;

    wizardState.step++;

    switch (wizardState.step) {
        case 2:
            renderStep2();
            break;
        case 3:
            renderStep3();
            break;
    }
}

function goBack() {
    if (wizardState.step <= 1) return;

    wizardState.step--;

    switch (wizardState.step) {
        case 1:
            renderStep1();
            break;
        case 2:
            renderStep2();
            break;
    }
}
