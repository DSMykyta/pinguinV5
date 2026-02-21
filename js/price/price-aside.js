// js/price/price-aside.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      PRICE - ASIDE PANEL                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Завантаження та управління бічною панеллю для прайсу.
 */

import { priceState } from './price-init.js';
import { loadSingleAsideTemplate } from '../aside/aside-main.js';

/**
 * Завантажити aside панель
 */
export async function loadAside() {
    await loadSingleAsideTemplate('aside-price');
}

/**
 * Ініціалізувати події aside панелі
 * Пошук тепер керується через createManagedTable (price-table.js)
 */
export function initAsideEvents() {
    initImportFromAside();
}

/**
 * Ініціалізувати імпорт з aside
 */
function initImportFromAside() {
    const importInput = document.getElementById('import-xlsx-aside');
    if (!importInput) return;

    importInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const { handleFileImport } = await import('./price-import.js');
            await handleFileImport(file);
        } catch (error) {
            console.error('Помилка імпорту:', error);
            alert('Помилка імпорту файлу');
        }

        importInput.value = '';
    });
}
