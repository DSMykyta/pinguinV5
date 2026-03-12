// js/pages/blog/blog-state.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                        BLOG — STATE                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createPageState } from '../../components/page/page-state.js';

export const blogState = createPageState({
    activeTab: 'news',
    custom: {
        posts: [],
        _dataLoaded: false,
        tableAPI: null,
        managedTable: null,
        managedTables: {
            news: null,
            blog: null
        },
    }
});
