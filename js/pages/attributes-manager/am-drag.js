// js/pages/attributes-manager/am-drag.js

/**
 * Native HTML5 drag-and-drop delegation.
 * MP з aside → на папку в grid = маппінг
 * Папка на папку = вкладення (parent_id)
 */

import { amState } from './am-state.js';
import { registerHook, runHook } from './am-plugins.js';
import { updateCategory, updateOption } from '../../data/entities-data.js';
import { createCategoryMapping, createCharacteristicMapping, createOptionMapping } from '../../data/mappings-data.js';
import { showToast } from '../../components/feedback/toast.js';

// ═══════════════════════════════════════════════════════════════════════════
// TAB-SPECIFIC OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

const OPS = {
    categories: {
        createMapping: (ownId, mpId) => createCategoryMapping(ownId, mpId),
        setParent: (childId, parentId) => updateCategory(childId, { parent_id: parentId }),
    },
    characteristics: {
        createMapping: (ownId, mpId) => createCharacteristicMapping(ownId, mpId),
        setParent: null,
    },
    options: {
        createMapping: (ownId, mpId) => createOptionMapping(ownId, mpId),
        setParent: (childId, parentId) => updateOption(childId, { parent_option_id: parentId }),
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// DRAG HANDLERS (delegation on grid containers)
// ═══════════════════════════════════════════════════════════════════════════

function onDragStart(e) {
    const block = e.target.closest('.block[draggable]');
    if (!block) return;

    const ownId = block.dataset.ownId;
    if (!ownId) return;

    amState.draggedId = ownId;
    amState.draggedType = 'own';

    e.dataTransfer.setData('text/plain', ownId);
    e.dataTransfer.effectAllowed = 'move';
    block.classList.add('dragging');
}

function onDragOver(e) {
    const block = e.target.closest('.block[data-own-id]');
    if (!block) return;

    const targetId = block.dataset.ownId;
    if (targetId === amState.draggedId && amState.draggedType === 'own') return;

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
    const block = e.target.closest('.block[data-own-id]');
    if (!block) return;
    block.classList.remove('drag-over');

    const sourceId = e.dataTransfer.getData('text/plain');
    const sourceType = amState.draggedType;
    const targetOwnId = block.dataset.ownId;

    if (!sourceId || sourceId === targetOwnId) return;

    const ops = OPS[amState.activeTab];
    if (!ops) return;

    try {
        if (sourceType === 'mp') {
            // MP з aside → на папку = маппінг
            await ops.createMapping(targetOwnId, sourceId);
            showToast('Маппінг створено', 'success');

        } else if (sourceType === 'own' && ops.setParent) {
            // Папка на папку → вкладення
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
// ATTACH
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
