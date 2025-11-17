// js/keywords/keywords-events.js

/**
 * TPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPW
 * Q                    KEYWORDS - EVENT HANDLERS                             Q
 * ZPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP]
 */

import { keywordsState } from './keywords-init.js';
import { renderKeywordsTable } from './keywords-table.js';
import { loadKeywords } from './keywords-data.js';

export function initKeywordsEvents() {
    console.log('=á =VFV0;V70FVO >1@>1=8:V2 ?>4V9 Keywords...');

    const refreshBtn = document.getElementById('refresh-tab-keywords');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            console.log('= =>2;5==O 40=8E Keywords...');
            await loadKeywords();
            renderKeywordsTable();
        });
    }

    console.log(' 1@>1=8:8 ?>4V9 V=VFV0;V7>20=>');
}

export function initKeywordsSearch(searchInput) {
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        keywordsState.searchQuery = e.target.value.trim();
        keywordsState.pagination.currentPage = 1;
        renderKeywordsTable();
    });

    console.log(' >HC: V=VFV0;V7>20=>');
}

export function initKeywordsSorting() {
    const { initTableSorting } = require('../common/ui-table-sort.js');

    initTableSorting({
        state: keywordsState,
        renderFunction: renderKeywordsTable
    });

    console.log(' !>@BC20==O V=VFV0;V7>20=>');
}
