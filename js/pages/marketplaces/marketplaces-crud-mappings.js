// js/pages/marketplaces/marketplaces-crud-mappings.js

/**
 * Таблиці прив'язок характеристик та опцій і спільний mapping picker.
 */

import { getCharacteristics, getOptions } from '../../data/entities-data.js';
import {
    createCharacteristicMapping,
    deleteCharacteristicMapping,
    getCharacteristicMappingByMpId,
    createOptionMapping,
    deleteOptionMapping,
    getOptionMappingByMpId
} from '../../data/mappings-data.js';
import { createManagedTable, col } from '../../components/table/table-main.js';
import { initPaginationCharm } from '../../components/charms/pagination/pagination-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { escapeHtml } from '../../utils/utils-text.js';
import { resolveMpField, extractMpName } from './marketplaces-crud-utils.js';

export function populateMpCharacteristics(allData, charMapping) {
    if (!document.getElementById('mp-data-char-container')) return;

    const ownChars = getCharacteristics();
    const allProcessed = preprocessCharsData(allData, ownChars, charMapping);

    createManagedTable({
        container: 'mp-data-char-container',
        columns: [
            { ...col('external_id', 'ID', 'tag'), searchable: true },
            col('category_name', 'Категорія', 'binding-chip', {
                searchable: true, checked: true, filterable: true,
                render: (value) => {
                    const names = (value || '').split(',').map(s => s.trim()).filter(Boolean);
                    const count = names.length;
                    const tooltip = names.join('\n') || "Не прив'язано до категорій";
                    const cls = count === 0 ? 'chip' : 'chip c-secondary';
                    return `<span class="${cls}" data-tooltip="${escapeHtml(tooltip)}" data-tooltip-always style="cursor:pointer">${count}</span>`;
                }
            }),
            { ...col('mp_name', 'Назва', 'name'), searchable: true },
            { ...col('type', 'Тип', 'code', { filterable: true }), searchable: true, checked: true },
            col('mapping', 'Наша характ.', 'select', {
                span: 3, sortable: false,
                render: (value, row) => {
                    const cls = row.mapped_id ? 'custom-select-trigger mapped' : 'custom-select-trigger';
                    return `<div class="${cls}" data-entity-type="characteristic" data-mp-entity-id="${escapeHtml(row.id)}" data-mp-ext-id="${escapeHtml(row.external_id || '')}" data-current-value="${escapeHtml(row.mapped_id)}"><span class="mp-tree-mapping-label">${row.mapped_label ? escapeHtml(row.mapped_label) : '—'}</span><svg class="custom-select-arrow" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg></div>`;
                }
            })
        ],
        data: allProcessed,
        statsId: null,
        paginationId: null,
        tableConfig: {
            rowActionsHeader: ' ',
            rowActions: () => '',
            getRowId: row => row.id,
            emptyState: { message: 'Характеристики відсутні' },
            withContainer: false,
            onAfterRender: (cont) => initMappingTriggerDelegation(cont, 'characteristic'),
            plugins: {
                sorting: { columnTypes: { external_id: 'string', mp_name: 'string', type: 'string' } },
                filters: {
                    filterColumns: [
                        { id: 'category_name', label: 'Категорія', filterType: 'contains' },
                        { id: 'type', label: 'Тип', filterType: 'values' }
                    ]
                }
            }
        },
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'mp-char'
    });

    initPaginationCharm();
}

function preprocessCharsData(data, ownChars, charMapping) {
    return data.map(item => {
        const mapping = getCharacteristicMappingByMpId(item.id) || getCharacteristicMappingByMpId(item.external_id);
        const mapped_id = mapping?.characteristic_id || '';
        const mappedChar = mapped_id ? ownChars.find(c => c.id === mapped_id) : null;
        return {
            ...item,
            mp_name: extractMpName(item, charMapping) || item.external_id || '-',
            mapped_id: mapped_id,
            mapped_label: mappedChar ? (mappedChar.name_ua || mappedChar.id) : ''
        };
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// СЕКЦІЯ: ОПЦІЇ (таблиця)
// ═══════════════════════════════════════════════════════════════════════════

export function populateMpOptions(allData, optMapping) {
    if (!document.getElementById('mp-data-opt-container')) return;

    const ownOpts = getOptions();
    const allProcessed = preprocessOptsData(allData, ownOpts, optMapping);

    createManagedTable({
        container: 'mp-data-opt-container',
        columns: [
            { ...col('external_id', 'ID', 'tag'), searchable: true },
            { ...col('mp_name', 'Назва', 'name'), searchable: true },
            { ...col('char_display', 'Характ.', 'text', { span: 3, filterable: true }), searchable: true },
            col('mapping', 'Наша опція', 'select', {
                span: 3, sortable: false,
                render: (value, row) => {
                    const cls = row.mapped_id ? 'custom-select-trigger mapped' : 'custom-select-trigger';
                    return `<div class="${cls}" data-entity-type="option" data-mp-entity-id="${escapeHtml(row.id)}" data-mp-ext-id="${escapeHtml(row.external_id || '')}" data-current-value="${escapeHtml(row.mapped_id)}"><span class="mp-tree-mapping-label">${row.mapped_label ? escapeHtml(row.mapped_label) : '—'}</span><svg class="custom-select-arrow" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg></div>`;
                }
            })
        ],
        data: allProcessed,
        statsId: null,
        paginationId: null,
        tableConfig: {
            rowActionsHeader: ' ',
            rowActions: () => '',
            getRowId: row => row.id,
            emptyState: { message: 'Опції відсутні' },
            withContainer: false,
            onAfterRender: (cont) => initMappingTriggerDelegation(cont, 'option'),
            plugins: {
                sorting: { columnTypes: { external_id: 'string', mp_name: 'string', char_display: 'string' } },
                filters: {
                    filterColumns: [
                        { id: 'char_display', label: 'Характеристика', filterType: 'values' }
                    ]
                }
            }
        },
        preFilter: null,
        pageSize: null,
        checkboxPrefix: 'mp-opt'
    });

    initPaginationCharm();
}

function preprocessOptsData(data, ownOpts, optMapping) {
    return data.map(item => {
        const mapping = getOptionMappingByMpId(item.id) || getOptionMappingByMpId(item.external_id);
        const mapped_id = mapping?.option_id || '';
        const mappedOpt = mapped_id ? ownOpts.find(o => o.id === mapped_id) : null;
        return {
            ...item,
            mp_name: extractMpName(item, optMapping) || item.external_id || '-',
            char_display: resolveMpField(item, 'char_name', optMapping)
                || item.char_name
                || resolveMpField(item, 'char_id', optMapping)
                || item.char_id
                || '-',
            mapped_id: mapped_id,
            mapped_label: mappedOpt ? (mappedOpt.value_ua || mappedOpt.id) : ''
        };
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAPPING TRIGGER DELEGATION (per-container)
// ═══════════════════════════════════════════════════════════════════════════

function initMappingTriggerDelegation(container, entityType) {
    // Cleanup попередній handler щоб не накопичувались
    const key = `_mappingDelegation_${entityType}`;
    if (container[key]) container.removeEventListener('click', container[key]);

    const handler = (e) => {
        const trigger = e.target.closest('.custom-select-trigger[data-entity-type]');
        if (!trigger) return;
        e.stopPropagation();

        const mpEntityId = trigger.dataset.mpEntityId;
        const mpExtId = trigger.dataset.mpExtId;
        const currentValue = trigger.dataset.currentValue || '';

        if (entityType === 'characteristic') {
            const ownChars = getCharacteristics();
            showMappingPicker(trigger, ownChars, currentValue, async (newValue) => {
                const oldMapping = getCharacteristicMappingByMpId(mpEntityId) || getCharacteristicMappingByMpId(mpExtId);
                if (oldMapping) {
                    try { await deleteCharacteristicMapping(oldMapping.id); }
                    catch { showToast('Помилка видалення', 'error'); return; }
                }
                if (newValue) {
                    try { await createCharacteristicMapping(newValue, mpEntityId); showToast('Прив\'язано', 'success'); }
                    catch { showToast('Помилка прив\'язки', 'error'); return; }
                } else if (oldMapping) {
                    const undoOwnId = oldMapping.characteristic_id;
                    const undoMpId = oldMapping.mp_characteristic_id;
                    showToast('Прив\'язку знято', 'success', {
                        duration: 6000,
                        action: {
                            label: 'Відмінити',
                            onClick: async () => {
                                await createCharacteristicMapping(undoOwnId, undoMpId);
                                const restoredChar = ownChars.find(c => c.id === undoOwnId);
                                trigger.dataset.currentValue = undoOwnId;
                                trigger.classList.add('mapped');
                                const lbl = trigger.querySelector('.mp-tree-mapping-label');
                                if (lbl) lbl.textContent = restoredChar ? (restoredChar.name_ua || restoredChar.id) : undoOwnId;
                            }
                        }
                    });
                }
                const newChar = newValue ? ownChars.find(c => c.id === newValue) : null;
                trigger.dataset.currentValue = newValue || '';
                trigger.classList.toggle('mapped', !!newValue);
                const label = trigger.querySelector('.mp-tree-mapping-label');
                if (label) label.textContent = newChar ? (newChar.name_ua || newChar.id) : '—';
            });
        } else if (entityType === 'option') {
            const ownOpts = getOptions();
            showMappingPicker(trigger, ownOpts, currentValue, async (newValue) => {
                const oldMapping = getOptionMappingByMpId(mpEntityId) || getOptionMappingByMpId(mpExtId);
                if (oldMapping) {
                    try { await deleteOptionMapping(oldMapping.id); }
                    catch { showToast('Помилка видалення', 'error'); return; }
                }
                if (newValue) {
                    try { await createOptionMapping(newValue, mpEntityId); showToast('Прив\'язано', 'success'); }
                    catch { showToast('Помилка прив\'язки', 'error'); return; }
                } else if (oldMapping) {
                    const undoOwnId = oldMapping.option_id;
                    const undoMpId = oldMapping.mp_option_id;
                    showToast('Прив\'язку знято', 'success', {
                        duration: 6000,
                        action: {
                            label: 'Відмінити',
                            onClick: async () => {
                                await createOptionMapping(undoOwnId, undoMpId);
                                const restoredOpt = ownOpts.find(o => o.id === undoOwnId);
                                trigger.dataset.currentValue = undoOwnId;
                                trigger.classList.add('mapped');
                                const lbl = trigger.querySelector('.mp-tree-mapping-label');
                                if (lbl) lbl.textContent = restoredOpt ? (restoredOpt.value_ua || restoredOpt.id) : undoOwnId;
                            }
                        }
                    });
                }
                const newOpt = newValue ? ownOpts.find(o => o.id === newValue) : null;
                trigger.dataset.currentValue = newValue || '';
                trigger.classList.toggle('mapped', !!newValue);
                const label = trigger.querySelector('.mp-tree-mapping-label');
                if (label) label.textContent = newOpt ? (newOpt.value_ua || newOpt.id) : '—';
            }, (o) => o.value_ua || o.id);
        }
    };
    container.addEventListener('click', handler);
    container[key] = handler;
}

let _mappingPickerEl = null;
let _mappingPickerCleanup = null;

export function showMappingPicker(triggerEl, items, currentValue, onSelect, labelFn) {
    closeMappingPicker();
    if (!labelFn) labelFn = (c) => c.name_ua || c.id;

    const picker = getOrCreateMappingPicker();
    const list = picker.querySelector('.custom-select-options');
    const search = picker.querySelector('.custom-select-search');

    list.innerHTML = `<li class="custom-select-option${!currentValue ? ' selected' : ''}" data-value="">— Без прив'язки —</li>` +
        items.map(c => {
            const name = labelFn(c);
            const selected = c.id === currentValue ? ' selected' : '';
            return `<li class="custom-select-option${selected}" data-value="${escapeHtml(c.id)}">${escapeHtml(name)}</li>`;
        }).join('');

    const rect = triggerEl.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const spaceBelow = viewportH - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const panelHeight = Math.min(280, Math.max(spaceBelow, spaceAbove));
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;

    picker.style.position = 'fixed';
    picker.style.left = `${rect.left}px`;
    picker.style.width = `${Math.max(rect.width, 220)}px`;
    picker.style.maxHeight = `${panelHeight}px`;
    picker.style.zIndex = '10000';

    if (openUp) {
        picker.style.top = 'auto';
        picker.style.bottom = `${viewportH - rect.top + 4}px`;
    } else {
        picker.style.top = `${rect.bottom + 4}px`;
        picker.style.bottom = 'auto';
    }

    picker.style.display = 'flex';
    picker.classList.add('open');

    if (search) {
        search.value = '';
        setTimeout(() => search.focus(), 0);
    }

    const onSearchInput = () => {
        const q = search.value.toLowerCase();
        list.querySelectorAll('.custom-select-option').forEach(li => {
            li.style.display = li.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
    };

    const onListClick = (e) => {
        const li = e.target.closest('.custom-select-option');
        if (!li) return;
        onSelect(li.dataset.value);
        closeMappingPicker();
    };

    const onOutsideClick = (e) => {
        if (!picker.contains(e.target) && !triggerEl.contains(e.target)) {
            closeMappingPicker();
        }
    };

    const onKeyDown = (e) => {
        if (e.key === 'Escape') {
            closeMappingPicker();
        }
    };

    search?.addEventListener('input', onSearchInput);
    list.addEventListener('click', onListClick);
    setTimeout(() => document.addEventListener('click', onOutsideClick), 0);
    document.addEventListener('keydown', onKeyDown);

    _mappingPickerCleanup = () => {
        search?.removeEventListener('input', onSearchInput);
        list.removeEventListener('click', onListClick);
        document.removeEventListener('click', onOutsideClick);
        document.removeEventListener('keydown', onKeyDown);
    };
}

function closeMappingPicker() {
    if (_mappingPickerCleanup) {
        _mappingPickerCleanup();
        _mappingPickerCleanup = null;
    }
    if (_mappingPickerEl) {
        _mappingPickerEl.style.display = 'none';
        _mappingPickerEl.classList.remove('open');
    }
}

function getOrCreateMappingPicker() {
    if (_mappingPickerEl) return _mappingPickerEl;

    const picker = document.createElement('div');
    picker.className = 'custom-select-panel mp-mapping-picker';
    picker.innerHTML = `
        <div class="custom-select-search-wrapper">
            <input type="text" class="custom-select-search" placeholder="Пошук...">
        </div>
        <ul class="custom-select-options" role="listbox"></ul>
    `;
    picker.style.display = 'none';
    document.body.appendChild(picker);

    _mappingPickerEl = picker;
    return picker;
}

