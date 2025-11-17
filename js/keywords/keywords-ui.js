// js/keywords/keywords-ui.js

/**
 * TPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPW
 * Q                    KEYWORDS - UI MANAGEMENT                              Q
 * ZPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP]
 */

import { keywordsState } from './keywords-init.js';
import { createColumnSelector } from '../common/ui-table-columns.js';
import { renderKeywordsTable } from './keywords-table.js';

export function populateSearchColumns() {
    const allSearchColumns = [
        { id: 'local_id', label: 'ID', checked: true },
        { id: 'name_uk', label: '0720', checked: true },
        { id: 'param_type', label: '"8?', checked: true },
        { id: 'trigers', label: '"@835@8', checked: true },
        { id: 'keywords_ua', label: ';NG>2V A;>20', checked: true }
    ];

    createColumnSelector('search-columns-list-keywords', allSearchColumns, {
        checkboxPrefix: 'search-col-keywords',
        filterBy: keywordsState.visibleColumns,
        onChange: (selectedIds) => {
            keywordsState.searchColumns = selectedIds;
            console.log('= >;>=:8 ?>HC:C:', keywordsState.searchColumns);
        }
    });

    console.log(' >;>=:8 ?>HC:C 70?>2=5=>');
}

export function populateTableColumns() {
    const tableColumns = [
        { id: 'local_id', label: 'ID', checked: true },
        { id: 'name_uk', label: '0720', checked: true },
        { id: 'param_type', label: '"8?', checked: true },
        { id: 'trigers', label: '"@835@8', checked: true },
        { id: 'keywords_ua', label: ';NG>2V A;>20', checked: true }
    ];

    const columnSelector = createColumnSelector('table-columns-list-keywords', tableColumns, {
        checkboxPrefix: 'table-col-keywords',
        onChange: async (selectedIds) => {
            keywordsState.visibleColumns = selectedIds;
            console.log('=Ë 848<V :>;>=:8:', keywordsState.visibleColumns);

            populateSearchColumns();

            renderKeywordsTable();
        }
    });

    if (columnSelector) {
        keywordsState.visibleColumns = columnSelector.getSelected();
    }

    console.log(' >;>=:8 B01;8FV 70?>2=5=>');
}
