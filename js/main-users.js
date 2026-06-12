// js/main-users.js

// =========================================================================
// USERS PAGE ENTRY POINT
// =========================================================================
// Ініціалізує спільне ядро сайту, а потім admin-only модуль акаунтів.
// =========================================================================

import { initCore } from './main-core.js';
import { initUsers } from './pages/users/users-main.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initCore();
    await initUsers();
});
