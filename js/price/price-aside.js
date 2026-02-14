// js/price/price-aside.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      PRICE - ASIDE PANEL                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Завантаження та управління бічною панеллю для прайсу.
 */

import { priceState } from './price-init.js';

/**
 * Завантажити aside панель
 */
export async function loadAside() {
    const panelContent = document.getElementById('panel-right-content');
    if (!panelContent) {
        console.warn('⚠️ panel-right-content не знайдено');
        return;
    }

    try {
        const response = await fetch('templates/aside/aside-price.html');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        panelContent.innerHTML = html;


    } catch (error) {
        console.error('❌ Помилка завантаження aside-price:', error);
        panelContent.innerHTML = `
            <div class="panel-fragment is-active" id="aside-price">
                <div class="panel-content-scroll">
                    <p class="text-muted" style="padding: 16px;">
                        Помилка завантаження панелі
                    </p>
                </div>
            </div>
        `;
    }
}

/**
 * Ініціалізувати події aside панелі
 * Пошук тепер керується через createManagedTable (price-table.js)
 */
export function initAsideEvents() {
    initClearSearchButton();
    initImportFromAside();
}

/**
 * Ініціалізувати кнопку очистки пошуку
 * Пошук input тепер керується через createManagedTable
 */
function initClearSearchButton() {
    const clearBtn = document.getElementById('clear-search-price');
    const searchInput = document.getElementById('search-price');

    if (!clearBtn || !searchInput) return;

    clearBtn.addEventListener('click', () => {
        priceState.priceManagedTable?.setSearchQuery('');
        clearBtn.classList.add('u-hidden');
    });

    searchInput.addEventListener('input', () => {
        clearBtn.classList.toggle('u-hidden', !searchInput.value.trim());
    });
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
