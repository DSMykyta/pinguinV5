// js/main-core.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                        MAIN — CORE                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Глобальний ініціалізатор: layout, шарми, auth, модалки       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { initLayout }           from './layout/layout-main.js';
import { initDropdowns }        from './components/forms/dropdown.js';
import { initModals }           from './components/modal/modal-init.js';
import { initAvatarSystem }     from './components/avatar/avatar-main.js';
import { initEventHandlers }    from './utils/event-handlers.js';
import { initCustomAuth }       from './auth/auth-google.js';
import { initTooltips }         from './components/feedback/tooltip.js';
import { initInfoButtons }      from './components/modal/modal-info.js';
import { initTheme }            from './components/ui-theme.js';
import { initSearchClearCharm } from './components/charms/charm-search-clear.js';
import { initMorphSearchCharm } from './components/charms/charm-morph-search.js';
import { initRefreshCharm }     from './components/charms/charm-refresh.js';
import { initColumnsCharm }     from './components/charms/charm-columns.js';
import { initSearchCharm }     from './components/charms/charm-search.js';
import { initRequiredCharm }   from './components/charms/charm-required.js';
import { initPaginationCharm }  from './components/charms/pagination/pagination-main.js';
import { initModalRefresh }    from './components/modal/modal-plugin-refresh.js';


export async function initCore() {
    await initLayout();
    initTheme();
    initDropdowns();

    // ВАЖЛИВО: initModals() повинен бути ДО initCustomAuth()
    // щоб modal system був готовий коли auth спробує відкрити модал
    initModals();
    initModalRefresh();

    initAvatarSystem();
    initEventHandlers();
    initCustomAuth();
    initTooltips();
    initInfoButtons();
    initSearchClearCharm();
    initMorphSearchCharm();
    initSearchCharm();
    initRefreshCharm();
    initColumnsCharm();
    initRequiredCharm();
    initPaginationCharm();
}
