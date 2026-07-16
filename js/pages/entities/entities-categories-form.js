// js/pages/entities/entities-categories-form.js

/**
 * Form helpers for the category CRUD modal.
 * This module owns only DOM form state and select/toggle rendering.
 */

import { getCategories } from '../../data/entities-data.js';
import { reinitializeCustomSelect } from '../../components/forms/select.js';

export function getCategoryFormData() {
    const groupingYes = document.getElementById('mapper-category-grouping-yes');
    const isGrouping = groupingYes?.checked ? 'TRUE' : 'FALSE';

    return {
        name_ua: document.getElementById('mapper-category-name-ua')?.value.trim() || '',
        name_ru: document.getElementById('mapper-category-name-ru')?.value.trim() || '',
        parent_id: document.getElementById('mapper-category-parent')?.value || '',
        grouping: isGrouping
    };
}

function updateCategoryGroupingDot(isGrouping) {
    const dot = document.getElementById('category-grouping-dot');
    if (dot) {
        dot.classList.remove('c-green', 'c-yellow');
        dot.classList.add(isGrouping ? 'c-yellow' : 'c-green');
        dot.title = isGrouping ? 'Групуюча' : 'Товарна';
    }
}

export function initGroupingToggleHandler() {
    const groupingYes = document.getElementById('mapper-category-grouping-yes');
    const groupingNo = document.getElementById('mapper-category-grouping-no');
    if (!groupingYes || groupingYes.dataset.toggleInited) return;
    groupingYes.addEventListener('change', () => updateCategoryGroupingDot(true));
    if (groupingNo) groupingNo.addEventListener('change', () => updateCategoryGroupingDot(false));
    groupingYes.dataset.toggleInited = '1';
}

export function fillCategoryForm(category) {
    const nameUaField = document.getElementById('mapper-category-name-ua');
    const nameRuField = document.getElementById('mapper-category-name-ru');
    const parentField = document.getElementById('mapper-category-parent');
    const groupingYes = document.getElementById('mapper-category-grouping-yes');
    const groupingNo = document.getElementById('mapper-category-grouping-no');

    if (nameUaField) nameUaField.value = category.name_ua || '';
    if (nameRuField) nameRuField.value = category.name_ru || '';
    if (parentField) parentField.value = category.parent_id || '';

    const isGrouping = category.grouping === 'TRUE' || category.grouping === true || category.grouping === 'true';
    if (groupingYes) groupingYes.checked = isGrouping;
    if (groupingNo) groupingNo.checked = !isGrouping;
    updateCategoryGroupingDot(isGrouping);
}

export function clearCategoryForm() {
    const nameUaField = document.getElementById('mapper-category-name-ua');
    const nameRuField = document.getElementById('mapper-category-name-ru');
    const parentField = document.getElementById('mapper-category-parent');
    const groupingYes = document.getElementById('mapper-category-grouping-yes');
    const groupingNo = document.getElementById('mapper-category-grouping-no');

    if (nameUaField) nameUaField.value = '';
    if (nameRuField) nameRuField.value = '';
    if (parentField) parentField.value = '';

    if (groupingYes) groupingYes.checked = false;
    if (groupingNo) groupingNo.checked = true;
    updateCategoryGroupingDot(false);
}

export function populateParentCategorySelect(excludeId = null) {
    const select = document.getElementById('mapper-category-parent');
    if (!select) return;

    const categories = getCategories();

    select.innerHTML = '<option value="">— Без батькiвської —</option>';

    categories.forEach(cat => {
        if (cat.id !== excludeId) {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name_ua || cat.id;
            select.appendChild(option);
        }
    });

    reinitializeCustomSelect(select);
}
