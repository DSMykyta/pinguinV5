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

    // Ініціалізуємо Custom Auth
    // Callback викликається після успішної авторизації
    window.onAuthSuccess = async () => {
        console.log('✅ Авторизація готова');

        // Завантажити права користувача та приховати недоступні елементи
        await initPermissions();
    };

    // Слухати події зміни авторизації для оновлення прав
    document.addEventListener('auth-state-changed', async (event) => {
        if (event.detail.isAuthorized) {
            // Користувач увійшов - оновити права
            await refreshPermissions();
        } else {
            // Користувач вийшов - оновити права для guest
            await refreshPermissions();
        }
    });

    initCustomAuth();
}
