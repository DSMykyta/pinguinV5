// js/price/price-aside.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      PRICE - ASIDE PANEL                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Завантаження та управління бічною панеллю для прайсу.
 */

import { priceState } from './price-init.js';
import { filterByReserve } from './price-data.js';

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
        const response = await fetch('/templates/aside/aside-price.html');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        panelContent.innerHTML = html;

        console.log('✅ Aside-price завантажено');

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
 */
export function initAsideEvents() {
    initSearchEvents();
    initImportFromAside();
}

/**
 * Ініціалізувати пошук
 */
function initSearchEvents() {
    const searchInput = document.getElementById('search-price');
    const clearBtn = document.getElementById('clear-search-price');

    if (!searchInput) return;

    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim().toLowerCase();
        priceState.searchQuery = query;

        if (clearBtn) {
            clearBtn.classList.toggle('u-hidden', query === '');
        }

        filterPriceItems(query);

        const { renderPriceTable } = await import('./price-table.js');
        await renderPriceTable();
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            searchInput.value = '';
            priceState.searchQuery = '';
            clearBtn.classList.add('u-hidden');

            filterPriceItems('');

            const { renderPriceTable } = await import('./price-table.js');
            await renderPriceTable();
        });
    }
}

/**
 * Фільтрувати товари за пошуковим запитом
 */
function filterPriceItems(query) {
    filterByReserve(priceState.currentReserveFilter);

    if (!query) return;

    priceState.filteredItems = priceState.filteredItems.filter(item => {
        const searchFields = [
            item.code,
            item.article,
            item.brand,
            item.name,
            item.category,
            item.reserve
        ];

        return searchFields.some(field =>
            field && field.toLowerCase().includes(query)
        );
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
