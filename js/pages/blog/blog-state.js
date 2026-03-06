// js/pages/blog/blog-state.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                        BLOG — STATE                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export const blogState = {
    posts: [],
    _dataLoaded: false,

    tableAPI: null,
    managedTable: null,
    managedTables: {
        news: null,
        blog: null
    },
    activeTab: 'news',

    visibleColumns: [],
    searchColumns: []
};
