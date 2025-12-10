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
        // Показуємо базовий контент
        panelContent.innerHTML = `
            <div class="panel-fragment is-active" id="aside-price">
                <div class="panel-content-scroll">
                    <div class="panel-section-title">
                        <span>Прайс</span>
                    </div>
                    <p class="text-muted" style="padding: 16px;">
                        Виберіть товар у таблиці для перегляду деталей
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
    // Пошук
    initSearchEvents();

    // Кнопка резервування
    initReserveButton();
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

        // Показати/сховати кнопку очищення
        if (clearBtn) {
            clearBtn.classList.toggle('u-hidden', query === '');
        }

        // Фільтруємо дані
        filterPriceItems(query);

        // Перерендерюємо
        const { renderPriceTable } = await import('./price-table.js');
        await renderPriceTable();
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            searchInput.value = '';
            priceState.searchQuery = '';
            clearBtn.classList.add('u-hidden');

            // Скидаємо фільтр пошуку
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
    // Спочатку застосовуємо фільтр резерву
    filterByReserve(priceState.currentReserveFilter);

    if (!query) return;

    // Потім фільтруємо по пошуку
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
 * Ініціалізувати кнопку резервування
 */
function initReserveButton() {
    const reserveBtn = document.getElementById('btn-reserve-selected');
    if (!reserveBtn) return;

    reserveBtn.addEventListener('click', async () => {
        const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            alert('Виберіть товари для резервування');
            return;
        }

        // Отримуємо ім'я поточного користувача
        const currentUser = window.currentUser?.display_name;
        if (!currentUser) {
            alert('Потрібна авторизація');
            return;
        }

        const codes = Array.from(selectedCheckboxes).map(cb => cb.dataset.code);

        try {
            const { reserveItem } = await import('./price-data.js');

            for (const code of codes) {
                await reserveItem(code, currentUser);
            }

            // Перезавантажуємо дані
            const { loadPriceData } = await import('./price-data.js');
            await loadPriceData();

            // Оновлюємо таби резервів
            const { populateReserveTabs } = await import('./price-ui.js');
            populateReserveTabs();

            // Перерендерюємо таблицю
            const { renderPriceTable } = await import('./price-table.js');
            await renderPriceTable();

            alert(`Зарезервовано ${codes.length} товарів для ${currentUser}`);

        } catch (error) {
            console.error('Помилка резервування:', error);
            alert('Помилка резервування товарів');
        }
    });
}

/**
 * Показати деталі товару в aside
 */
export function showItemDetails(item) {
    const detailsContainer = document.getElementById('price-item-details');
    if (!detailsContainer) return;

    detailsContainer.innerHTML = `
        <div class="item-detail">
            <label>Код:</label>
            <span>${item.code}</span>
        </div>
        <div class="item-detail">
            <label>Артикул:</label>
            <span>${item.article || '-'}</span>
        </div>
        <div class="item-detail">
            <label>Бренд:</label>
            <span>${item.brand || '-'}</span>
        </div>
        <div class="item-detail">
            <label>Назва:</label>
            <span>${item.name || '-'}</span>
        </div>
        <div class="item-detail">
            <label>Категорія:</label>
            <span>${item.category || '-'}</span>
        </div>
        <div class="item-detail">
            <label>Упаковка:</label>
            <span>${item.packaging || '-'}</span>
        </div>
        <div class="item-detail">
            <label>Смак:</label>
            <span>${item.flavor || '-'}</span>
        </div>
        <div class="item-detail">
            <label>Відправка:</label>
            <span>${item.shiping_date || '-'}</span>
        </div>
        <div class="item-detail">
            <label>Резерв:</label>
            <span>${item.reserve || '-'}</span>
        </div>
    `;

    detailsContainer.classList.remove('u-hidden');
}
