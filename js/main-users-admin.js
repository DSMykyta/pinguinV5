// js/main-users-admin.js
// Запускач для сторінки users-admin.html

import { initCore } from './main-core.js';
import { initUsersAdmin } from './users-admin/users-admin-init.js';

// Ініціалізація при завантаженні DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Ініціалізація сторінки Users Admin...');

    // Спочатку ініціалізуємо core функціональність
    initCore();

    // Потім ініціалізуємо специфічні для users admin функції
    initUsersAdmin();

    console.log('✅ Сторінка Users Admin готова');
});
