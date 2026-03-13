// js/pages/attributes-manager/am-aside.js

/**
 * Aside plugin: virtual-scroll список MP сутностей + фільтр по маркетплейсу + пошук.
 * MP елементи draggable — тягнуться на папки в grid.
 */

import { amState } from './am-state.js';
import { registerHook, runHook } from './am-plugins.js';
import { getMpCategories, getMpCharacteristics, getMpOptions } from '../../data/mp-data.js';
import { isMpCategoryMapped, isMpCharacteristicMapped, isMpOptionMapped } from '../../data/mappings-data.js';
import { getMarketplaces } from '../../data/marketplaces-data.js';
import { escapeHtml } from '../../utils/utils-text.js';

// ═══════════════════════════════════════════════════════════════════════════
// TAB CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const TAB_CONFIG = {
    categories: {
        getMp: getMpCategories,
        isMapped: isMpCategoryMapped,
    },
    characteristics: {
        getMp: getMpCharacteristics,
        isMapped: isMpCharacteristicMapped,
    },
    options: {
        getMp: getMpOptions,
        isMapped: isMpOptionMapped,
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

let _mpLookup = null;

function getMpDisplayName(mp) {
    return mp.name || mp.external_id || mp.id || '';
}

function getMpMarketplaceName(marketplaceId) {
    if (!_mpLookup) {
        _mpLookup = new Map();
        getMarketplaces().forEach(m => _mpLookup.set(m.id, m.name || m.id));
    }
    return _mpLookup.get(marketplaceId) || marketplaceId;
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTER + UPDATE
// ═══════════════════════════════════════════════════════════════════════════

function getFilteredMpList() {
    const tab = amState.activeTab;
    const config = TAB_CONFIG[tab];
    if (!config) return [];

    const allMp = config.getMp();
    const searchQuery = (amState.asideSearch || '').toLowerCase();
    const mpFilter = amState.asideMpFilter || '';

    return allMp.filter(mp => {
        // Exclude already mapped
        if (config.isMapped(mp.id)) return false;

        // Marketplace filter
        if (mpFilter && mp.marketplace_id !== mpFilter) return false;

        // Search
        if (searchQuery) {
            const name = getMpDisplayName(mp).toLowerCase();
            const extId = (mp.external_id || '').toLowerCase();
            if (!name.includes(searchQuery) && !extId.includes(searchQuery)) return false;
        }

        return true;
    });
}

function updateAsideList() {
    const listEl = document.getElementById('am-aside-list');
    if (!listEl) return;

    const filtered = getFilteredMpList();

    listEl.vScrollData = filtered;
    listEl.vScrollRender = (mp) => {
        const name = escapeHtml(getMpDisplayName(mp));
        const mpName = escapeHtml(getMpMarketplaceName(mp.marketplace_id));
        return `<div class="panel-item" draggable="true" data-mp-id="${escapeHtml(mp.id)}" data-entity-type="${escapeHtml(amState.activeTab)}">
            <span class="panel-item-text">${name}</span>
            <span class="tag">${mpName}</span>
        </div>`;
    };

    listEl.dispatchEvent(new CustomEvent('vscroll:update'));
}

// ═══════════════════════════════════════════════════════════════════════════
// MARKETPLACE DROPDOWN
// ═══════════════════════════════════════════════════════════════════════════

function populateMarketplaceFilter() {
    const select = document.getElementById('am-aside-mp-filter');
    if (!select) return;

    const mps = getMarketplaces();
    const currentVal = select.value;

    // Clear all but first option
    while (select.options.length > 1) select.remove(1);

    mps.forEach(mp => {
        const opt = document.createElement('option');
        opt.value = mp.id;
        opt.textContent = mp.name || mp.id;
        select.appendChild(opt);
    });

    select.value = currentVal || '';
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════

function initAsideEvents() {
    const searchInput = document.getElementById('am-aside-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            amState.asideSearch = searchInput.value;
            updateAsideList();
        });
    }

    const mpFilter = document.getElementById('am-aside-mp-filter');
    if (mpFilter) {
        mpFilter.addEventListener('change', () => {
            amState.asideMpFilter = mpFilter.value;
            updateAsideList();
        });
    }

    // Drag start from aside list (delegation on panel-content-scroll)
    const listEl = document.getElementById('am-aside-list');
    if (listEl) {
        listEl.addEventListener('dragstart', (e) => {
            const item = e.target.closest('[data-mp-id]');
            if (!item) return;

            amState.draggedId = item.dataset.mpId;
            amState.draggedType = 'mp';

            e.dataTransfer.setData('text/plain', item.dataset.mpId);
            e.dataTransfer.effectAllowed = 'move';
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN INIT
// ═══════════════════════════════════════════════════════════════════════════

export function init() {
    registerHook('onDataLoaded', () => {
        populateMarketplaceFilter();
        initAsideEvents();
        updateAsideList();
    });

    registerHook('onRender', () => {
        _mpLookup = null;
        updateAsideList();
    });

    registerHook('onTabSwitch', () => {
        _mpLookup = null;
        // Reset aside search on tab switch
        const searchInput = document.getElementById('am-aside-search');
        if (searchInput) searchInput.value = '';
        amState.asideSearch = '';
        updateAsideList();
    });

    registerHook('onTabDataReady', updateAsideList);
    registerHook('onLookupInvalidate', () => {
        _mpLookup = null;
        updateAsideList();
    });
}
