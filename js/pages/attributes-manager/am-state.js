// js/pages/attributes-manager/am-state.js

import { createPageState } from '../../components/page/page-state.js';

export const amState = createPageState({
    activeTab: 'categories',

    searchColumns: {
        categories: ['id', 'name', 'external_id'],
        characteristics: ['id', 'name', 'external_id'],
        options: ['id', 'name', 'external_id'],
    },

    visibleColumns: {},

    custom: {
        draggedId: null,
        draggedType: null,       // 'mp' | 'own'
        expandedFolders: new Set(),
    }
});
