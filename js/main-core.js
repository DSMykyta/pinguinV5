// js/main-core.js

import { initPanelLeft } from './panel/panel-left.js';
import { initPanelRight } from './panel/panel-right.js';
import { initDropdowns } from './common/ui-dropdown.js';
import { initModals } from './common/ui-modal.js';
import { initTabs } from './common/ui-tabs.js';
import { initEventHandlers } from './utils/event-handlers.js';
import { initSectionNavigator } from './panel/section-navigator.js';
import { initCustomAuth } from './auth/custom-auth.js';
import { initPermissions, refreshPermissions } from './utils/permissions.js';


export function initCore() {
    initPanelLeft();
    initPanelRight();
    initDropdowns();

    // ВАЖЛИВО: initModals() повинен бути ДО initCustomAuth()
    // щоб modal system був готовий коли auth спробує відкрити модал
    initModals();

    initTabs();
    initEventHandlers();
    initSectionNavigator();

    // Слухати події зміни авторизації для оновлення прав
    // ВАЖЛИВО: event listener має бути ДО initCustomAuth()
    document.addEventListener('auth-state-changed', async (event) => {
        console.log('🔐 auth-state-changed event:', event.detail);

        // Невелика затримка щоб дати час localStorage оновитись
        await new Promise(resolve => setTimeout(resolve, 100));

        if (event.detail.isAuthorized) {
            // Користувач увійшов - завантажити права
            await initPermissions();
        } else {
            // Користувач вийшов - завантажити права для guest
            await refreshPermissions();
        }
    });

    initCustomAuth();
}
