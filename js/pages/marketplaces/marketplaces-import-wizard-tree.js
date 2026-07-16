// js/pages/marketplaces/marketplaces-import-wizard-tree.js

/**
 * Tree selection UI for import-as-own wizard.
 */

import { escapeHtml } from '../../utils/utils-text.js';
import { wizardState } from './marketplaces-import-wizard-state.js';

let onTreeChange = () => {};

export function renderTreeNodes() {
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
                    <span class="tree-node-label">Глобальні характеристики</span>
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

export function renderSelectionSummary() {
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

export function initTreeSelectHandlers(onChange = () => {}) {
    onTreeChange = onChange;
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
        onTreeChange();
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
    onTreeChange();
}

function deselectAll() {
    wizardState.selection.categories.clear();
    wizardState.selection.characteristics.clear();

    document.querySelectorAll('#tree-container input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });

    updateSelectionSummary();
    onTreeChange();
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
