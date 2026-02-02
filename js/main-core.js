// js/main-core.js

import { initPanelLeft } from './panel/panel-left.js';
import { initPanelRight } from './panel/panel-right.js';
import { initDropdowns } from './common/ui-dropdown.js';
import { initModals } from './common/ui-modal-init.js';
import { initAvatarSystem } from './lego/avatar/avatar-main.js';
import { initTabs } from './common/ui-tabs.js';
import { initEventHandlers } from './utils/event-handlers.js';
import { initSectionNavigator } from './panel/section-navigator.js';
import { initCustomAuth } from './auth/custom-auth.js';
import { initChipTooltips } from './common/chip-tooltip.js';
import { initTooltips } from './common/ui-tooltip.js';
import { initInfoButtons } from './common/ui-info-modal.js';


export function initCore() {
    initPanelLeft();
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
    initChipTooltips();
    initTooltips();
    initInfoButtons();
}
