// js/pages/tasks/tasks-filter.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS — ASIDE FILTERS                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { tasksState } from './tasks-state.js';
import { registerHook, runHook } from './tasks-plugins.js';

// ═══════════════════════════════════════════════════════════════════════════
// FILTER MAPPING
// ═══════════════════════════════════════════════════════════════════════════

const FILTER_MAP = {
    all:                { activeFilter: 'all',            statusFilter: null },
    assigned_to_me:     { activeFilter: 'assigned_to_me', statusFilter: null },
    created_by_me:      { activeFilter: 'created_by_me',  statusFilter: null },
    status_new:         { activeFilter: null,              statusFilter: 'new' },
    status_in_progress: { activeFilter: null,              statusFilter: 'in_progress' },
    status_done:        { activeFilter: null,              statusFilter: 'done' },
};

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

function setupFilters() {
    const aside = document.querySelector('.aside-body');
    if (!aside || aside._tasksFilterInit) return;
    aside._tasksFilterInit = true;

    aside.addEventListener('click', (e) => {
        const item = e.target.closest('.panel-item[data-filter]');
        if (!item) return;

        const filterKey = item.dataset.filter;
        const mapping = FILTER_MAP[filterKey];
        if (!mapping) return;

        // Update state
        if (mapping.activeFilter !== null) {
            tasksState.activeFilter = mapping.activeFilter;
            tasksState.statusFilter = null;
        }
        if (mapping.statusFilter !== null) {
            tasksState.statusFilter = mapping.statusFilter;
            tasksState.activeFilter = 'all';
        }

        // Toggle active class
        aside.querySelectorAll('.panel-item[data-filter]').forEach(el => el.classList.remove('active'));
        item.classList.add('active');

        // Re-render
        runHook('onRender');
    });
}

export function init() {
    registerHook('onInit', setupFilters);
}
