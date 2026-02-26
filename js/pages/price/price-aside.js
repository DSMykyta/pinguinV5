// js/price/price-aside.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      PRICE - ASIDE PANEL                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Завантаження та управління бічною панеллю для прайсу.
 */

import { registerAsideInitializer } from '../../layout/layout-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { initDropdowns } from '../../components/forms/dropdown.js';

registerAsideInitializer('aside-price', () => {
    initAsideEvents();
    initDropdowns();
});

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
            showToast('Помилка імпорту файлу', 'error');
        }

        importInput.value = '';
    });
}
