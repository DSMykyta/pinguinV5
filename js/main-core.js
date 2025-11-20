// js/main-core.js

import { initPanelLeft } from './panel/panel-left.js';
import { initPanelRight } from './panel/panel-right.js';
import { initDropdowns } from './common/ui-dropdown.js';
import { initModals } from './common/ui-modal-init.js';
import { initModalAvatars } from './common/ui-modal-avatars.js';
import { initTabs } from './common/ui-tabs.js';
import { initEventHandlers } from './utils/event-handlers.js';
import { initSectionNavigator } from './panel/section-navigator.js';
import { initCustomAuth } from './auth/custom-auth.js';
import { autoInitTextareaExpand } from './common/textarea-expand.js';


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
    initCustomAuth();

    // Ініціалізація автоматичного розгортання textarea
    autoInitTextareaExpand();
}
