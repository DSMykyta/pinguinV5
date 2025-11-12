// js/main-core.js

import { initPanelLeft } from './panel/panel-left.js';
import { initPanelRight } from './panel/panel-right.js';
import { initDropdowns } from './common/ui-dropdown.js';
import { initModals } from './common/ui-modal.js';
import { initTabs } from './common/ui-tabs.js';
import { autoInitTabsScroll } from './common/ui-tabs-scroll.js';
import { initEventHandlers } from './utils/event-handlers.js';
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

    // Ініціалізуємо Custom Auth (замість Google Auth)
    // window.initCustomAuth визначено в js/auth/custom-auth.js
    if (typeof window.initCustomAuth === 'function') {
        // Callback викликається після успішної авторизації
        window.onAuthSuccess = () => {
            console.log('✅ Авторизація на сторінці інструментів готова');
        };

        window.initCustomAuth();
    } else {
        console.error('❌ Custom Auth не завантажено');
    }
}
