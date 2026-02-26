// js/pages/keywords/keywords-state.js

export const keywordsState = {
    keywords: [],
    _dataLoaded: false,      // Прапорець: дані завантажено
    searchQuery: '',
    searchColumns: ['local_id', 'name_uk', 'trigers', 'keywords_ua'],
    visibleColumns: ['local_id', 'name_uk', 'trigers', 'keywords_ua'],
    columnFilters: {},       // Фільтри по колонках { columnId: ['value1', 'value2'] }
    sortKey: null,
    sortOrder: 'asc',
    sortAPI: null
};
