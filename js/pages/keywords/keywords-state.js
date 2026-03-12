// js/pages/keywords/keywords-state.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                       KEYWORDS STATE                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Глобальний стан модуля ключових слів                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createPageState } from '../../components/page/page-state.js';

export const keywordsState = createPageState({
    searchColumns: ['local_id', 'name_uk', 'trigers', 'keywords_ua'],
    visibleColumns: ['local_id', 'name_uk', 'trigers', 'keywords_ua'],
    custom: {
        keywords: [],
        _dataLoaded: false,
        sortAPI: null,
    }
});
