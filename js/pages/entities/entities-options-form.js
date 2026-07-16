// js/pages/entities/entities-options-form.js

/**
 * Form helpers for the option CRUD modal.
 * This module owns only DOM form state and select rendering.
 */

import {
    getCharacteristics,
    getOptions
} from '../../data/entities-data.js';
import { reinitializeCustomSelect } from '../../components/forms/select.js';

export function getOptionFormData() {
    return {
        characteristic_id: document.getElementById('mapper-option-char')?.value || '',
        value_ua: document.getElementById('mapper-option-value-ua')?.value.trim() || '',
        value_ru: document.getElementById('mapper-option-value-ru')?.value.trim() || '',
        sort_order: document.getElementById('mapper-option-order')?.value || '0',
        parent_option_id: document.getElementById('mapper-option-parent')?.value || ''
    };
}

export function fillOptionForm(option) {
    const charField = document.getElementById('mapper-option-char');
    const valueUaField = document.getElementById('mapper-option-value-ua');
    const valueRuField = document.getElementById('mapper-option-value-ru');
    const orderField = document.getElementById('mapper-option-order');
    const parentField = document.getElementById('mapper-option-parent');

    if (charField) charField.value = option.characteristic_id || '';
    if (valueUaField) valueUaField.value = option.value_ua || '';
    if (valueRuField) valueRuField.value = option.value_ru || '';
    if (orderField) orderField.value = option.sort_order || '0';
    if (parentField) {
        parentField.value = option.parent_option_id || '';
        reinitializeCustomSelect(parentField);
    }
}

export function clearOptionForm() {
    const charField = document.getElementById('mapper-option-char');
    const valueUaField = document.getElementById('mapper-option-value-ua');
    const valueRuField = document.getElementById('mapper-option-value-ru');
    const orderField = document.getElementById('mapper-option-order');
    const parentField = document.getElementById('mapper-option-parent');

    if (charField) charField.value = '';
    if (valueUaField) valueUaField.value = '';
    if (valueRuField) valueRuField.value = '';
    if (orderField) orderField.value = '0';
    if (parentField) {
        parentField.value = '';
        reinitializeCustomSelect(parentField);
    }
}

export function populateCharacteristicSelect(preselectedId = null) {
    const select = document.getElementById('mapper-option-char');
    if (!select) return;

    const characteristics = getCharacteristics();

    select.innerHTML = '<option value="">вЂ” РћР±РµСЂС–С‚СЊ С…Р°СЂР°РєС‚РµСЂРёСЃС‚РёРєСѓ вЂ”</option>';

    characteristics.forEach(char => {
        const option = document.createElement('option');
        option.value = char.id;
        option.textContent = char.name_ua || char.id;
        if (preselectedId && char.id === preselectedId) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    reinitializeCustomSelect(select);
}

/**
 * Р—Р°РїРѕРІРЅРёС‚Рё СЃРµР»РµРєС‚ Р±Р°С‚СЊРєС–РІСЃСЊРєРѕС— РѕРїС†С–С—
 * Р¤РѕСЂРјР°С‚: {С…Р°СЂР°РєС‚РµСЂРёСЃС‚РёРєР°} | {РћРїС†С–СЏ}
 */
export function populateParentOptionSelect(selectedId = null) {
    const select = document.getElementById('mapper-option-parent');
    if (!select) return;

    const options = getOptions();
    const characteristics = getCharacteristics();

    const charMap = new Map();
    characteristics.forEach(char => {
        charMap.set(char.id, char);
    });

    select.innerHTML = '<option value="">вЂ” Р‘РµР· Р±Р°С‚СЊРєС–РІСЃСЊРєРѕС— РѕРїС†С–С— вЂ”</option>';

    options.forEach(opt => {
        if (!opt.characteristic_id) return;
        const char = charMap.get(opt.characteristic_id);
        const charName = char ? (char.name_ua || opt.characteristic_id) : opt.characteristic_id;
        const optValue = opt.value_ua || opt.id;

        const option = document.createElement('option');
        option.value = opt.id;
        option.textContent = `${charName} | ${optValue}`;
        if (selectedId && opt.id === selectedId) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    reinitializeCustomSelect(select);
}
