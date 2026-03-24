// js/main-core.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                        MAIN — CORE                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Глобальний ініціалізатор: layout, шарми, auth, модалки       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { initLayout }               from './layout/layout-main.js';
import { initDropdowns }            from './components/forms/dropdown.js';
import { initModals }               from './components/modal/modal-main.js';
import { initAvatarSystem }         from './components/avatar/avatar-main.js';
import { initEventHandlers }        from './utils/utils-event-handlers.js';
import { initCustomAuth }           from './auth/auth-google.js';
import { initTooltips }             from './components/feedback/tooltip.js';
import { initImageShow }            from './components/feedback/image-show.js';
import { initTheme }                from './components/ui-theme.js';
import { initSearchClearCharm }     from './components/charms/charm-search-clear.js';
import { initMorphSearchCharm }     from './components/charms/charm-morph-search.js';
import { initRefreshCharm }         from './components/charms/charm-refresh.js';
import { initColumnsCharm }         from './components/charms/charm-columns.js';
import { initSearchCharm }          from './components/charms/charm-search.js';
import { initRequiredCharm }        from './components/charms/charm-required.js';
import { initPaginationCharm }      from './components/charms/pagination/pagination-main.js';
import { initVirtualScrollCharm }   from './components/charms/charm-virtual-scroll.js';
import { initScrollFadeCharm }     from './components/charms/charm-scroll-fade.js';
import { initDropzoneCharm }       from './components/charms/charm-dropzone.js';
import { callSheetsAPI }           from './utils/utils-api-client.js';
import { showToast }               from './components/feedback/toast.js';


export async function initCore() {
    await initLayout();
    initTheme();
    initDropdowns();

    // ВАЖЛИВО: initModals() повинен бути ДО initCustomAuth()
    // щоб modal system був готовий коли auth спробує відкрити модал
    await initModals();

    initAvatarSystem();
    initEventHandlers();
    initCustomAuth();
    initTooltips();
    initImageShow();
    initSearchClearCharm();
    initMorphSearchCharm();
    initSearchCharm();
    initRefreshCharm();
    initColumnsCharm();
    initRequiredCharm();
    initPaginationCharm();
    initVirtualScrollCharm();
    initScrollFadeCharm();
    initDropzoneCharm();

    // Перевірка нових завдань після авторизації
    document.addEventListener('auth-state-changed', async (e) => {
        if (!e.detail.isAuthorized || !e.detail.user?.username) return;
        try {
            const result = await callSheetsAPI('get', { range: 'Tasks!A:N', spreadsheetType: 'tasks' });
            if (!result || result.length <= 1) return;
            const headers = result[0];
            const assignedIdx = headers.indexOf('assigned_to');
            const isNewIdx = headers.indexOf('is_new');
            if (assignedIdx < 0 || isNewIdx < 0) return;
            const username = e.detail.user.username;
            const count = result.slice(1).filter(r => r[assignedIdx] === username && r[isNewIdx] === '1').length;
            if (count > 0) {
                showToast(`У вас ${count} нових завдань`, 'info', {
                    duration: 8000,
                    action: { label: 'Перейти', onClick: () => { window.location.href = 'tasks.html'; } }
                });
            }
        } catch (_) { /* silent */ }
    });
}
