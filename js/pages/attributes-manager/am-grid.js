// js/pages/attributes-manager/am-grid.js

/**
 * Grid rendering plugin: тільки папки (власні сутності) з замапленими MP.
 * Незамаплені MP тепер в aside (am-aside.js).
 */

import { amState } from './am-state.js';
import { registerHook } from './am-plugins.js';
import { getCategories, getCharacteristics, getOptions } from '../../data/entities-data.js';
import { getMappedMpCategories, getMappedMpCharacteristics, getMappedMpOptions } from '../../data/mappings-data.js';
import { getMarketplaces } from '../../data/marketplaces-data.js';
import { escapeHtml } from '../../utils/utils-text.js';

// ═══════════════════════════════════════════════════════════════════════════
// TAB CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const TAB_CONFIG = {
    categories: {
        containerId: 'am-categories-grid',
        getOwn: getCategories,
        getMapped: getMappedMpCategories,
        nameField: 'name_ua',
        parentField: 'parent_id',
    },
    characteristics: {
        containerId: 'am-characteristics-grid',
        getOwn: getCharacteristics,
        getMapped: getMappedMpCharacteristics,
        nameField: 'name_ua',
        parentField: null,
    },
    options: {
        containerId: 'am-options-grid',
        getOwn: getOptions,
        getMapped: getMappedMpOptions,
        nameField: 'value_ua',
        parentField: 'parent_option_id',
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// MARKETPLACE LOOKUP
// ═══════════════════════════════════════════════════════════════════════════

let _mpLookup = null;

function getMpName(marketplaceId) {
    if (!_mpLookup) {
        _mpLookup = new Map();
        getMarketplaces().forEach(m => _mpLookup.set(m.id, m.name || m.id));
    }
    return _mpLookup.get(marketplaceId) || marketplaceId;
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════════════

function renderGrid() {
    const tab = amState.activeTab;
    const config = TAB_CONFIG[tab];
    if (!config) return;

    const container = document.getElementById(config.containerId);
    if (!container) return;

    const ownEntities = config.getOwn();
    const searchQuery = (amState.searchQuery || '').toLowerCase();

    // Separate root entities from nested
    const rootEntities = config.parentField
        ? ownEntities.filter(e => !e[config.parentField])
        : ownEntities;

    const fragment = document.createDocumentFragment();

    rootEntities.forEach(entity => {
        const folderEl = renderFolder(entity, config, searchQuery, 0);
        if (folderEl) fragment.appendChild(folderEl);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

function renderFolder(entity, config, searchQuery, depth) {
    const mapped = config.getMapped(entity.id);
    const children = config.parentField
        ? config.getOwn().filter(e => e[config.parentField] === entity.id)
        : [];

    const name = entity[config.nameField] || entity.id;
    if (searchQuery && !name.toLowerCase().includes(searchQuery) &&
        !mapped.some(mp => getMpDisplayName(mp).toLowerCase().includes(searchQuery))) return null;

    const isExpanded = amState.expandedFolders.has(entity.id);
    const totalCount = mapped.length + children.length;

    const block = document.createElement('div');
    block.className = 'block';
    block.dataset.ownId = entity.id;
    block.dataset.entityType = amState.activeTab;
    block.draggable = true;

    let childrenHtml = '';

    if (isExpanded) {
        // Mapped MP items
        mapped.forEach(mp => {
            const mpName = getMpDisplayName(mp);
            const mpMarketplace = getMpName(mp.marketplace_id);
            childrenHtml += `
                <div class="block-line" data-mp-id="${escapeHtml(mp.id)}">
                    <span class="block-line-text">${escapeHtml(mpName)}</span>
                    <div class="group">
                        <span class="tag">${escapeHtml(mpMarketplace)}</span>
                        <button class="btn-icon ghost am-remove-mapping" data-mp-id="${escapeHtml(mp.id)}" aria-label="Витягти">
                            <span class="material-symbols-outlined">drag_pan</span>
                        </button>
                    </div>
                </div>`;
        });

        // Child folders (nested)
        children.forEach(child => {
            const childMapped = config.getMapped(child.id);
            const childName = child[config.nameField] || child.id;
            childrenHtml += `
                <div class="block-line am-toggle-folder" data-own-id="${escapeHtml(child.id)}">
                    <span class="block-line-text"><span class="material-symbols-outlined">folder</span> ${escapeHtml(childName)}</span>
                    <span class="tag">${childMapped.length}</span>
                </div>`;
        });
    }

    block.innerHTML = `
        <div class="block-header">
            <div class="group">
                <button class="btn-icon ghost am-toggle-folder" data-own-id="${escapeHtml(entity.id)}" aria-label="Розгорнути">
                    <span class="material-symbols-outlined">${isExpanded ? 'expand_less' : 'expand_more'}</span>
                </button>
                <h3>${escapeHtml(name)}</h3>
            </div>
            <div class="group">
                <span class="tag">${totalCount}</span>
                <button class="btn-icon ghost am-edit-folder" data-own-id="${escapeHtml(entity.id)}" data-entity-type="${escapeHtml(amState.activeTab)}" aria-label="Редагувати">
                    <span class="material-symbols-outlined">edit</span>
                </button>
            </div>
        </div>
        <div class="block-list">${childrenHtml || (isExpanded ? '<div class="block-line"><span class="block-line-text">Порожня папка</span></div>' : '')}</div>`;

    return block;
}

function getMpDisplayName(mp) {
    return mp.name || mp.external_id || mp.id || '';
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN INIT
// ═══════════════════════════════════════════════════════════════════════════

export function init() {
    registerHook('onDataLoaded', renderGrid);
    registerHook('onRender', renderGrid);
    registerHook('onTabSwitch', renderGrid);
    registerHook('onTabDataReady', renderGrid);
    registerHook('onLookupInvalidate', () => {
        _mpLookup = null;
        renderGrid();
    });
}
