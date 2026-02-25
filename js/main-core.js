// js/main-core.js

import { initLayout }           from './layout/layout-main.js';
import { initDropdowns }        from './components/ui-dropdown.js';
import { initModals }           from './components/ui-modal-init.js';
import { initAvatarSystem }     from './components/avatar/avatar-main.js';
import { initEventHandlers }    from './utils/event-handlers.js';
import { initCustomAuth }       from './auth/auth-google.js';
import { initTooltips }         from './components/ui-tooltip.js';
import { initInfoButtons }      from './components/ui-info-modal.js';
import { initTheme }            from './components/ui-theme.js';
import { initSearchClearCharm } from './components/charms/charm-search-clear.js';
import { initFilterPillsCharm } from './components/charms/charm-filter-pills.js';
import { initMorphSearchCharm } from './components/charms/charm-morph-search.js';
import { initRefreshCharm }     from './components/charms/charm-refresh.js';
import { initColumnsCharm }     from './components/charms/charm-columns.js';
import { initPaginationCharm }  from './components/charms/pagination/pagination-main.js';
import { createHighlightEditor } from './components/editor/editor-main.js';


export async function initCore() {
    initTheme();
    await initLayout();
    initDropdowns();

    // ВАЖЛИВО: initModals() повинен бути ДО initCustomAuth()
    // щоб modal system був готовий коли auth спробує відкрити модал
    initModals();

    initAvatarSystem();
    initEventHandlers();
    initCustomAuth();
    initTooltips();
    initInfoButtons();
    initSearchClearCharm();
    initFilterPillsCharm();
    initMorphSearchCharm();
    initRefreshCharm();
    initColumnsCharm();
    initPaginationCharm();
    document.querySelectorAll('[editor]').forEach(container => createHighlightEditor(container));
}
