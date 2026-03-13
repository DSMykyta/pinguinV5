// js/pages/attributes-manager/am-grid.js

/**
 * Grid rendering plugin: папки (власні сутності) + незамаплені MP картки.
 * Будує дерево по parent_id, показує маппінги всередині папок.
 */

import { amState } from './am-state.js';
import { registerHook } from './am-plugins.js';
import { getCategories, getCharacteristics, getOptions } from '../../data/entities-data.js';
import { getMpCategories, getMpCharacteristics, getMpOptions } from '../../data/mp-data.js';
import { getMappedMpCategories, getMappedMpCharacteristics, getMappedMpOptions,
    isMpCategoryMapped, isMpCharacteristicMapped, isMpOptionMapped } from '../../data/mappings-data.js';
import { getMarketplaces } from '../../data/marketplaces-data.js';
import { escapeHtml } from '../../utils/utils-text.js';

// ═══════════════════════════════════════════════════════════════════════════
// TAB CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const TAB_CONFIG = {
    categories: {
        containerId: 'am-categories-grid',
        getOwn: getCategories,
        getMp: getMpCategories,
        getMapped: getMappedMpCategories,
        isMapped: isMpCategoryMapped,
        nameField: 'name_ua',
        mpNameField: 'name',
        parentField: 'parent_id',
    },
    characteristics: {
        containerId: 'am-characteristics-grid',
        getOwn: getCharacteristics,
        getMp: getMpCharacteristics,
        getMapped: getMappedMpCharacteristics,
        isMapped: isMpCharacteristicMapped,
        nameField: 'name_ua',
        mpNameField: 'name',
        parentField: null,
    },
    options: {
        containerId: 'am-options-grid',
        getOwn: getOptions,
        getMp: getMpOptions,
        getMapped: getMappedMpOptions,
        isMapped: isMpOptionMapped,
        nameField: 'value_ua',
        mpNameField: 'name',
        parentField: 'parent_option_id',
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// MARKETPLACE LOOKUP
// ═══════════════════════════════════════════════════════════════════════════

function getMpName(marketplaceId) {
    const mp = getMarketplaces().find(m => m.id === marketplaceId);
    return mp ? (mp.name || mp.id) : marketplaceId;
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
    const mpEntities = config.getMp();
    const searchQuery = (amState.searchQuery || '').toLowerCase();

    // Build tree of own entities (folders)
    const rootEntities = config.parentField
        ? ownEntities.filter(e => !e[config.parentField])
        : ownEntities;

    const fragment = document.createDocumentFragment();

    // Render folders (own entities with mappings or children)
    rootEntities.forEach(entity => {
        const folderEl = renderFolder(entity, config, searchQuery, 0);
        if (folderEl) fragment.appendChild(folderEl);
    });

    // Render nested folders (entities with parent_id, rendered under their parents)
    // Already handled recursively in renderFolder

    // Render unmapped MP cards
    mpEntities.forEach(mp => {
        if (config.isMapped(mp.id)) return;
        if (searchQuery && !matchesSearch(mp, config.mpNameField, searchQuery)) return;
        fragment.appendChild(renderMpCard(mp, config));
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

function renderFolder(entity, config, searchQuery, depth) {
    const mapped = config.getMapped(entity.id);
    const children = config.parentField
        ? config.getOwn().filter(e => e[config.parentField] === entity.id)
        : [];

    // Skip empty folders that don't match search
    if (mapped.length === 0 && children.length === 0) return null;

    const name = entity[config.nameField] || entity.id;
    if (searchQuery && !name.toLowerCase().includes(searchQuery) &&
        !mapped.some(mp => matchesSearch(mp, config.mpNameField, searchQuery))) return null;

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
            const mpName = mp[config.mpNameField] || mp.name || mp.external_id || mp.id;
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

        // Child folders (recursive)
        children.forEach(child => {
            const childMapped = config.getMapped(child.id);
            const childName = child[config.nameField] || child.id;
            childrenHtml += `
                <div class="block-line" data-own-id="${escapeHtml(child.id)}">
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

function renderMpCard(mp, config) {
    const name = mp[config.mpNameField] || mp.name || mp.external_id || mp.id;
    const mpMarketplace = getMpName(mp.marketplace_id);

    const block = document.createElement('div');
    block.className = 'block';
    block.dataset.mpId = mp.id;
    block.dataset.entityType = amState.activeTab;
    block.draggable = true;

    // Build key-value lines from mp data (skip internal fields)
    const skipFields = ['_rowIndex', 'id', 'marketplace_id', 'data', '_jsonId', '_source', '_mappingId',
        'our_category_id', 'our_char_id', 'our_option_id', 'our_cat_id'];
    let linesHtml = '';
    const entries = Object.entries(mp).filter(([key]) => !key.startsWith('_') && !skipFields.includes(key));
    entries.slice(0, 5).forEach(([key, value]) => {
        if (!value) return;
        linesHtml += `
            <div class="block-line">
                <label class="block-line-label">${escapeHtml(key)}</label>
                <span class="block-line-text">${escapeHtml(String(value).substring(0, 80))}</span>
            </div>`;
    });

    block.innerHTML = `
        <div class="block-header">
            <h3>${escapeHtml(name.length > 30 ? name.substring(0, 30) + '...' : name)}</h3>
            <div class="group">
                <span class="tag">${escapeHtml(mpMarketplace)}</span>
            </div>
        </div>
        <div class="block-list">${linesHtml}</div>`;

    return block;
}

function matchesSearch(entity, nameField, query) {
    const name = (entity[nameField] || entity.name || entity.id || '').toLowerCase();
    const extId = (entity.external_id || '').toLowerCase();
    return name.includes(query) || extId.includes(query);
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN INIT
// ═══════════════════════════════════════════════════════════════════════════

export function init() {
    registerHook('onDataLoaded', renderGrid);
    registerHook('onRender', renderGrid);
    registerHook('onTabSwitch', renderGrid);
    registerHook('onTabDataReady', renderGrid);
    registerHook('onLookupInvalidate', renderGrid);
}
