// js/pages/attributes-manager/am-events.js

/**
 * Events plugin: search, edit folder, remove mapping, toggle expand.
 */

import { amState } from './am-state.js';
import { registerHook, runHook } from './am-plugins.js';
import { deleteCategoryMappingByMpId, deleteCharacteristicMappingByMpId,
    deleteOptionMappingByMpId } from '../../data/mappings-data.js';
import { showToast } from '../../components/feedback/toast.js';

// ═══════════════════════════════════════════════════════════════════════════
// EDIT FOLDER (via entities CRUD modals)
// ═══════════════════════════════════════════════════════════════════════════

async function handleEditFolder(ownId, entityType) {
    try {
        if (entityType === 'categories') {
            const { showEditCategoryModal } = await import('../entities/entities-categories.js');
            await showEditCategoryModal(ownId);
        } else if (entityType === 'characteristics') {
            const { showEditCharacteristicModal } = await import('../entities/entities-characteristics.js');
            await showEditCharacteristicModal(ownId);
        } else if (entityType === 'options') {
            const { showEditOptionModal } = await import('../entities/entities-options.js');
            await showEditOptionModal(ownId);
        }
    } catch (err) {
        console.error('Edit folder error:', err);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// REMOVE MAPPING
// ═══════════════════════════════════════════════════════════════════════════

const REMOVE_OPS = {
    categories: deleteCategoryMappingByMpId,
    characteristics: deleteCharacteristicMappingByMpId,
    options: deleteOptionMappingByMpId,
};

async function handleRemoveMapping(mpId) {
    const removeFn = REMOVE_OPS[amState.activeTab];
    if (!removeFn) return;

    try {
        await removeFn(mpId);
        showToast('Маппінг видалено', 'success');
        runHook('onRender');
    } catch (err) {
        console.error('Remove mapping error:', err);
        showToast('Помилка: ' + err.message, 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TOGGLE FOLDER
// ═══════════════════════════════════════════════════════════════════════════

function handleToggleFolder(ownId) {
    if (amState.expandedFolders.has(ownId)) {
        amState.expandedFolders.delete(ownId);
    } else {
        amState.expandedFolders.add(ownId);
    }
    runHook('onRender');
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════════════════════

function initSearch() {
    document.querySelectorAll('.am-search-input').forEach(input => {
        input.addEventListener('input', () => {
            amState.searchQuery = input.value;
            runHook('onRender');
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// CLICK DELEGATION
// ═══════════════════════════════════════════════════════════════════════════

function initClickDelegation() {
    document.getElementById('content-main')?.addEventListener('click', (e) => {
        // Edit folder button
        const editBtn = e.target.closest('.am-edit-folder');
        if (editBtn) {
            e.stopPropagation();
            handleEditFolder(editBtn.dataset.ownId, editBtn.dataset.entityType);
            return;
        }

        // Remove mapping button
        const removeBtn = e.target.closest('.am-remove-mapping');
        if (removeBtn) {
            e.stopPropagation();
            handleRemoveMapping(removeBtn.dataset.mpId);
            return;
        }

        // Toggle folder
        const toggleBtn = e.target.closest('.am-toggle-folder');
        if (toggleBtn) {
            e.stopPropagation();
            handleToggleFolder(toggleBtn.dataset.ownId);
            return;
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN INIT
// ═══════════════════════════════════════════════════════════════════════════

export function init() {
    registerHook('onDataLoaded', () => {
        initSearch();
        initClickDelegation();

        // Re-render grid after CRUD modal closes (entity may have been edited/deleted)
        document.addEventListener('modal-closed', () => {
            runHook('onRender');
        });
    });

    // Reset search on tab switch
    registerHook('onTabSwitch', () => {
        document.querySelectorAll('.am-search-input').forEach(input => { input.value = ''; });
        amState.searchQuery = '';
    });
}
