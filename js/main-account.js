// js/main-account.js

// =========================================================================
// ACCOUNT PAGE ENTRY POINT
// =========================================================================
// Ініціалізує спільне ядро сайту, а потім незалежний модуль кабінету.
// =========================================================================

import { initCore } from './main-core.js';
import { initAccount } from './pages/account/account-main.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initCore();
    await initAccount();
});
