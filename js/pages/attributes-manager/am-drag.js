// js/pages/attributes-manager/am-drag.js

/**
 * Native HTML5 drag-and-drop delegation.
 * MP на MP → нова папка (власна сутність) + 2 маппінги
 * MP на папку → маппінг
 * Папка на папку → вкладення (parent_id)
 */

import { amState } from './am-state.js';
import { registerHook, runHook } from './am-plugins.js';
import { addCategory, addCharacteristic, addOption,
    updateCategory, updateOption } from '../../data/entities-data.js';
import { createCategoryMapping, createCharacteristicMapping, createOptionMapping } from '../../data/mappings-data.js';
import { getMpCategories, getMpCharacteristics, getMpOptions } from '../../data/mp-data.js';
import { showToast } from '../../components/feedback/toast.js';

// ═══════════════════════════════════════════════════════════════════════════
// TAB-SPECIFIC OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

const OPS = {
    categories: {
        addEntity: (data) => addCategory(data),
        createMapping: (ownId, mpId) => createCategoryMapping(ownId, mpId),
        setParent: (childId, parentId) => updateCategory(childId, { parent_id: parentId }),
        getMp: getMpCategories,
        nameField: 'name',
        ownNameField: 'name_ua',
    },
    characteristics: {
        addEntity: (data) => addCharacteristic(data),
        createMapping: (ownId, mpId) => createCharacteristicMapping(ownId, mpId),
        setParent: null,  // characteristics don't nest
        getMp: getMpCharacteristics,
        nameField: 'name',
        ownNameField: 'name_ua',
    },
    options: {
        addEntity: (data) => addOption(data),
        createMapping: (ownId, mpId) => createOptionMapping(ownId, mpId),
        setParent: (childId, parentId) => updateOption(childId, { parent_option_id: parentId }),
        getMp: getMpOptions,
        nameField: 'name',
        ownNameField: 'value_ua',
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// GET MP NAME
// ═══════════════════════════════════════════════════════════════════════════

function getMpEntityName(mpId) {
    const ops = OPS[amState.activeTab];
    if (!ops) return '';
    const mp = ops.getMp().find(m => m.id === mpId);
    return mp ? (mp[ops.nameField] || mp.name || mp.external_id || '') : '';
}

// ═══════════════════════════════════════════════════════════════════════════
// DRAG HANDLERS (delegation)
// ═══════════════════════════════════════════════════════════════════════════

function onDragStart(e) {
    const block = e.target.closest('.block[draggable]');
    if (!block) return;

    const mpId = block.dataset.mpId;
    const ownId = block.dataset.ownId;

    amState.draggedId = mpId || ownId;
    amState.draggedType = mpId ? 'mp' : 'own';

    e.dataTransfer.setData('text/plain', amState.draggedId);
    e.dataTransfer.effectAllowed = 'move';
    block.classList.add('dragging');
}

function onDragOver(e) {
    const block = e.target.closest('.block[draggable]');
    if (!block) return;

    const targetId = block.dataset.mpId || block.dataset.ownId;
    if (targetId === amState.draggedId) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    block.classList.add('drag-over');
}

function onDragLeave(e) {
    const block = e.target.closest('.block');
    if (block) block.classList.remove('drag-over');
}

function onDragEnd(e) {
    amState.draggedId = null;
    amState.draggedType = null;

    const block = e.target.closest('.block');
    if (block) block.classList.remove('dragging');

    document.querySelectorAll('.block.drag-over').forEach(b => b.classList.remove('drag-over'));
}

async function onDrop(e) {
    e.preventDefault();
    const block = e.target.closest('.block[draggable]');
    if (!block) return;
    block.classList.remove('drag-over');

    const sourceId = e.dataTransfer.getData('text/plain');
    const sourceType = amState.draggedType;
    const targetMpId = block.dataset.mpId;
    const targetOwnId = block.dataset.ownId;

    if (!sourceId || sourceId === (targetMpId || targetOwnId)) return;

    const ops = OPS[amState.activeTab];
    if (!ops) return;

    try {
        if (sourceType === 'mp' && targetMpId) {
            // MP на MP → нова папка + 2 маппінги
            const targetName = getMpEntityName(targetMpId);
            const newEntity = await ops.addEntity({ [ops.ownNameField]: targetName || 'Нова сутність' });
            await ops.createMapping(newEntity.id, sourceId);
            await ops.createMapping(newEntity.id, targetMpId);
            showToast(`Створено: ${targetName || newEntity.id}`, 'success');

        } else if (sourceType === 'mp' && targetOwnId) {
            // MP на папку → маппінг
            await ops.createMapping(targetOwnId, sourceId);
            showToast('Маппінг створено', 'success');

        } else if (sourceType === 'own' && targetOwnId && ops.setParent) {
            // Папка на папку → вкладення
            if (sourceId === targetOwnId) return;
            await ops.setParent(sourceId, targetOwnId);
            showToast('Вкладено', 'success');
        }

        runHook('onRender');
    } catch (err) {
        console.error('Drag-drop error:', err);
        showToast('Помилка: ' + err.message, 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ATTACH / DETACH
// ═══════════════════════════════════════════════════════════════════════════

const CONTAINERS = ['am-categories-grid', 'am-characteristics-grid', 'am-options-grid'];

function attachDragListeners() {
    CONTAINERS.forEach(id => {
        const el = document.getElementById(id);
        if (!el || el._amDragBound) return;
        el.addEventListener('dragstart', onDragStart);
        el.addEventListener('dragover', onDragOver);
        el.addEventListener('dragleave', onDragLeave);
        el.addEventListener('drop', onDrop);
        el.addEventListener('dragend', onDragEnd);
        el._amDragBound = true;
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN INIT
// ═══════════════════════════════════════════════════════════════════════════

export function init() {
    registerHook('onDataLoaded', attachDragListeners);
}
