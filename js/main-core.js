// js/main-core.js

import { initPanelLeft }        from './panel/panel-left.js';
import { initPanelRight }       from './panel/panel-right.js';
import { initDropdowns }        from './common/ui-dropdown.js';
import { initModals }           from './common/ui-modal-init.js';
import { initAvatarSystem }     from './common/avatar/avatar-main.js';
import { initTabs }             from './common/ui-tabs.js';
import { initEventHandlers }    from './utils/event-handlers.js';
import { initSectionNavigator } from './panel/section-navigator.js';
import { initCustomAuth }       from './auth/custom-auth.js';
import { initTooltips }         from './common/ui-tooltip.js';
import { initInfoButtons }      from './common/ui-info-modal.js';
import { initTheme }            from './common/ui-theme.js';
import { initSearchClearCharm } from './common/charms/charm-search-clear.js';
import { initFilterPillsCharm } from './common/charms/charm-filter-pills.js';
import { initMorphSearchCharm } from './common/charms/charm-morph-search.js';
import { initRefreshCharm }     from './common/charms/charm-refresh.js';
import { initColumnsCharm }     from './common/charms/charm-columns.js';


export async function initCore() {
    await initPanelLeft();
    initTheme();
    initPanelRight();
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
}
