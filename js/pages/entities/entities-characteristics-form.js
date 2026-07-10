// js/pages/entities/entities-characteristics-form.js

/**
 * Form helpers for the characteristic CRUD modal.
 * This module owns only DOM form state and select/toggle rendering.
 */

import { getCategories } from '../../data/entities-data.js';
import { reinitializeCustomSelect } from '../../components/forms/select.js';

export function getCharacteristicFormData() {
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

export function fillCharacteristicForm(characteristic) {
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

export function clearCharacteristicForm() {
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

export function initGlobalToggleHandler() {
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

export function populateCategorySelect(selectedIds = []) {
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
