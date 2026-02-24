// js/main-core.js

import { initNav }              from './layout/menu-nav.js';
import { initAside }            from './layout/aside-main.js';
import { initDropdowns }        from './components/ui-dropdown.js';
import { initModals }           from './components/ui-modal-init.js';
import { initAvatarSystem }     from './components/avatar/avatar-main.js';
import { initTabs }             from './layout/nav-tabs.js';
import { initEventHandlers }    from './utils/event-handlers.js';
import { initSectionNavigator } from './layout/nav-sections.js';
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


export async function initCore() {
    await initNav();
    initTheme();
    await initAside();
    initDropdowns();

    // ВАЖЛИВО: initModals() повинен бути ДО initCustomAuth()
    // щоб modal system був готовий коли auth спробує відкрити модал
    initModals();

    initAvatarSystem();
    initTabs();
    initEventHandlers();
    initSectionNavigator();
    initCustomAuth();
    initTooltips();
    initInfoButtons();
    initSearchClearCharm();
    initFilterPillsCharm();
    initMorphSearchCharm();
    initRefreshCharm();
    initColumnsCharm();
    initPaginationCharm();
}
