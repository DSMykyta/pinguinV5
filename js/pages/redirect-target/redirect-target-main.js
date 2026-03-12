/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                     REDIRECT TARGET SYSTEM                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔒 ЯДРО (не видаляти):                                                  ║
 * ║  ├── redirect-target-main.js    — Точка входу, завантаження плагінів     ║
 * ║  ├── redirect-target-plugins.js — Система реєстрації плагінів (хуки)     ║
 * ║  ├── redirect-target-state.js   — Глобальний стан сторінки               ║
 * ║  └── redirect-target-data.js    — Google Sheets API (CRUD операції)      ║
 * ║                                                                          ║
 * ║  🔌 ПЛАГІНИ (можна видалити):                                            ║
 * ║  ├── redirect-target-table.js   — Таблиця редиректів (конфігурація)      ║
 * ║  └── redirect-target-crud.js    — Логіка інлайн-редагування (форма)      ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { redirectTargetState } from './redirect-target-state.js';
import { redirectPlugins } from './redirect-target-plugins.js';
import { loadRedirects } from './redirect-target-data.js';
import { createPage } from '../../components/page/page-main.js';

const page = createPage({
    name: 'RedirectTarget',
    state: redirectTargetState,
    plugins: redirectPlugins,
    PLUGINS: [
        () => import('./redirect-target-table.js'),
        () => import('./redirect-target-ui.js')
    ],
    dataLoaders: [loadRedirects],
    containers: ['redirect-target-table-container'],
});

export async function initRedirectTarget() {
    await page.init();
}
