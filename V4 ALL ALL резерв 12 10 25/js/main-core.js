// js/main-core.js

import { initPanelLeft } from './panel/panel-left.js';
import { initPanelRight } from './panel/panel-right.js';
import { initDropdowns } from './common/ui-dropdown.js';
import { initModals } from './common/ui-modal.js';
import { initTabs } from './common/ui-tabs.js';
import { autoInitTabsScroll } from './common/ui-tabs-scroll.js';
import { initEventHandlers } from './utils/event-handlers.js';
import { initGoogleAuth } from './auth/google-auth.js';
import { initSectionNavigator } from './panel/section-navigator.js';


export function initCore() {
    initPanelLeft();
    initPanelRight();
    initDropdowns();
    initModals();
    initTabs();
    autoInitTabsScroll();  // Автоматична ініціалізація горизонтального скролу
    initEventHandlers();
    initSectionNavigator();

    // Ініціалізуємо Google Auth (без callback, бо на сторінці інструментів дані не завантажуються автоматично)
    initGoogleAuth(() => {
        console.log('✅ Авторизація на сторінці інструментів готова');
    });
}
