/**
 * Products Page - Main Entry Point
 * Сторінка управління товарами з demo даними для візуалізації
 */

import { initCustomSelects } from '../common/ui-select.js';
import { showToast } from '../common/ui-toast.js';

// Demo дані товарів
const DEMO_PRODUCTS = [
    {
        id: 1,
        name_uk: "Хітозан та хром MST Chitosan with Chrom, 240 капсул",
        name_ru: "Хитозан и хром MST Chitosan with Chrom, 240 капсул",
        name_short: "MST Chitosan with Chrom, 240 капсул",
        brand: "MST Nutrition",
        category: "Контроль ваги",
        photo: "https://via.placeholder.com/48x48/e8f5e9/2e7d32?text=MST",
        variants_count: 3,
        status: "active",
        storefronts: {
            sportmeals: "https://sportmeals.com.ua/product/12345",
            fitnessshop: null
        },
        show_on_site: true,
        variants: [
            { id: 1, name: "Без смаку", sku: "CN17214", price: 450, stock: 25 },
            { id: 2, name: "Шоколад", sku: "CN17214-CHOC", price: 480, stock: 15 },
            { id: 3, name: "Ваніль", sku: "CN17214-VAN", price: 480, stock: 10 }
        ]
    },
    {
        id: 2,
        name_uk: "Вітамін D3 Now Foods Vitamin D3 5000 IU, 120 капсул",
        name_ru: "Витамин D3 Now Foods Vitamin D3 5000 IU, 120 капсул",
        name_short: "Now Foods Vitamin D3 5000 IU, 120 капсул",
        brand: "Now Foods",
        category: "Вітаміни",
        photo: "https://via.placeholder.com/48x48/fff3e0/e65100?text=NOW",
        variants_count: 1,
        status: "active",
        storefronts: {
            sportmeals: "https://sportmeals.com.ua/product/22222",
            fitnessshop: "https://fitness-shop.ua/product/22222"
        },
        show_on_site: true,
        variants: [
            { id: 1, name: "Стандарт", sku: "NF1234", price: 380, stock: 42 }
        ]
    },
    {
        id: 3,
        name_uk: "Протеїн Optimum Nutrition Gold Standard Whey, 2.27 кг",
        name_ru: "Протеин Optimum Nutrition Gold Standard Whey, 2.27 кг",
        name_short: "ON Gold Standard Whey, 2.27 кг",
        brand: "Optimum Nutrition",
        category: "Протеїн",
        photo: "https://via.placeholder.com/48x48/e3f2fd/1565c0?text=ON",
        variants_count: 5,
        status: "active",
        storefronts: {
            sportmeals: "https://sportmeals.com.ua/product/33333",
            fitnessshop: "https://fitness-shop.ua/product/33333"
        },
        show_on_site: true,
        variants: [
            { id: 1, name: "Шоколад", sku: "ON2270-CHOC", price: 2450, stock: 12 },
            { id: 2, name: "Ваніль", sku: "ON2270-VAN", price: 2450, stock: 8 },
            { id: 3, name: "Полуниця", sku: "ON2270-STRW", price: 2480, stock: 5 },
            { id: 4, name: "Банан", sku: "ON2270-BAN", price: 2450, stock: 0 },
            { id: 5, name: "Cookies & Cream", sku: "ON2270-CC", price: 2520, stock: 15 }
        ]
    },
    {
        id: 4,
        name_uk: "Омега-3 Doctor's Best Omega-3 Fish Oil, 120 капсул",
        name_ru: "Омега-3 Doctor's Best Omega-3 Fish Oil, 120 капсул",
        name_short: "Doctor's Best Omega-3, 120 капсул",
        brand: "Doctor's Best",
        category: "Жирні кислоти",
        photo: "https://via.placeholder.com/48x48/fce4ec/c2185b?text=DB",
        variants_count: 1,
        status: "draft",
        storefronts: {
            sportmeals: null,
            fitnessshop: null
        },
        show_on_site: false,
        variants: [
            { id: 1, name: "Стандарт", sku: "DB5678", price: 520, stock: 30 }
        ]
    },
    {
        id: 5,
        name_uk: "BCAA MST BCAA 2:1:1, 400 г",
        name_ru: "BCAA MST BCAA 2:1:1, 400 г",
        name_short: "MST BCAA 2:1:1, 400 г",
        brand: "MST Nutrition",
        category: "Амінокислоти",
        photo: "https://via.placeholder.com/48x48/f3e5f5/7b1fa2?text=MST",
        variants_count: 4,
        status: "hidden",
        storefronts: {
            sportmeals: null,
            fitnessshop: null
        },
        show_on_site: false,
        variants: [
            { id: 1, name: "Кавун", sku: "MST-BCAA-WM", price: 680, stock: 20 },
            { id: 2, name: "Манго", sku: "MST-BCAA-MG", price: 680, stock: 15 },
            { id: 3, name: "Лимон", sku: "MST-BCAA-LM", price: 680, stock: 0 },
            { id: 4, name: "Кола", sku: "MST-BCAA-CL", price: 680, stock: 8 }
        ]
    }
];

// Стан сторінки
let currentFilter = 'all';
let currentModal = null;
let sortKey = 'id';
let sortDirection = 'asc';
let selectedProducts = new Set();

/**
 * Ініціалізація сторінки
 */
async function initProductsPage() {
    console.log('🚀 Products page initializing...');

    // Завантажуємо aside панель
    await loadAsidePanel();

    // Рендеримо таблицю товарів
    renderProductsTable(DEMO_PRODUCTS);

    // Рендеримо таб варіантів
    renderVariantsTab();

    // Рендеримо таб зв'язків
    renderGroupsTab();

    // Ініціалізуємо обробники подій
    initEventHandlers();

    // Ініціалізуємо таби
    initTabs();

    // Додаємо batch actions bar
    createBatchActionsBar();

    console.log('✅ Products page initialized');
}

/**
 * Завантаження aside панелі
 */
async function loadAsidePanel() {
    const panelContent = document.getElementById('panel-right-content');
    if (!panelContent) return;

    try {
        const response = await fetch('templates/aside/aside-products.html');
        const html = await response.text();
        panelContent.innerHTML = html;

        // Ініціалізуємо кнопку створення
        const createBtn = document.getElementById('btn-create-product');
        if (createBtn) {
            createBtn.addEventListener('click', openCreateWizard);
        }
    } catch (error) {
        console.error('Failed to load aside panel:', error);
    }
}

/**
 * Рендер таблиці товарів
 */
function renderProductsTable(products) {
    const container = document.getElementById('products-table-container');
    if (!container) return;

    // Фільтруємо товари
    let filtered = products.filter(p => {
        if (currentFilter === 'all') return true;
        return p.status === currentFilter;
    });

    // Сортування
    filtered = sortProducts(filtered, sortKey, sortDirection);

    // Оновлюємо статистику
    const stats = document.getElementById('tab-stats-products');
    if (stats) {
        stats.textContent = `Показано ${filtered.length} з ${products.length}`;
    }

    // Оновлюємо статистику в aside
    updateAsideStats(products);

    // Генеруємо HTML таблиці
    let html = `
        <div class="pseudo-table">
            <div class="pseudo-table-header">
                <div class="pseudo-table-cell cell-actions header-actions-cell">
                    <input type="checkbox" class="header-select-all" id="select-all-products" aria-label="Вибрати всі">
                </div>
                <div class="pseudo-table-cell cell-id sortable-header${sortKey === 'id' ? ' sorted-' + sortDirection : ''}" data-sort-key="id">
                    <span>ID</span><span class="sort-indicator"></span>
                </div>
                <div class="pseudo-table-cell cell-photo">Фото</div>
                <div class="pseudo-table-cell cell-category sortable-header${sortKey === 'category' ? ' sorted-' + sortDirection : ''}" data-sort-key="category">
                    <span>Категорія</span><span class="sort-indicator"></span>
                </div>
                <div class="pseudo-table-cell cell-main-name sortable-header${sortKey === 'name_short' ? ' sorted-' + sortDirection : ''}" data-sort-key="name_short">
                    <span>Назва</span><span class="sort-indicator"></span>
                </div>
                <div class="pseudo-table-cell cell-variants">Варіанти</div>
                <div class="pseudo-table-cell cell-status-small">Статус</div>
                <div class="pseudo-table-cell cell-bool">Вивід</div>
                <div class="pseudo-table-cell cell-storefronts">Вітрини</div>
            </div>
            <div class="pseudo-table-body">
    `;

    filtered.forEach(product => {
        const statusDot = getStatusDot(product.status);
        const storefrontLinks = getStorefrontLinks(product.storefronts);
        const showBadge = renderBoolBadge(product.show_on_site, product.id);

        html += `
            <div class="pseudo-table-row product-row" data-product-id="${product.id}">
                <div class="pseudo-table-cell cell-actions">
                    <input type="checkbox" class="row-checkbox" data-product-id="${product.id}" aria-label="Вибрати" ${selectedProducts.has(product.id) ? 'checked' : ''}>
                    <button class="btn-icon btn-icon-sm btn-edit-product" data-product-id="${product.id}" title="Редагувати">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                </div>
                <div class="pseudo-table-cell cell-id">
                    <span class="product-id">${product.id}</span>
                </div>
                <div class="pseudo-table-cell cell-photo">
                    <img src="${product.photo}" alt="${product.name_short}" class="product-thumb">
                </div>
                <div class="pseudo-table-cell cell-category">
                    ${product.category}
                </div>
                <div class="pseudo-table-cell cell-main-name">
                    <span class="product-name">${product.name_short}</span>
                </div>
                <div class="pseudo-table-cell cell-variants">
                    <button class="btn-variants-count" data-product-id="${product.id}" title="Переглянути варіанти">
                        ${product.variants_count}
                    </button>
                </div>
                <div class="pseudo-table-cell cell-status-small">
                    ${statusDot}
                </div>
                <div class="pseudo-table-cell cell-bool" data-column="show_on_site">
                    ${showBadge}
                </div>
                <div class="pseudo-table-cell cell-storefronts">
                    ${storefrontLinks}
                </div>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Додаємо обробники сортування
    initSortableHeaders();

    // Оновлюємо batch bar
    updateBatchBar();
}

/**
 * Сортування товарів
 */
function sortProducts(products, key, direction) {
    return [...products].sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

/**
 * Статус як кольоровий кружок
 */
function getStatusDot(status) {
    let color, title;
    switch (status) {
        case 'active':
            color = 'var(--color-success)';
            title = 'Активний';
            break;
        case 'draft':
            color = 'var(--color-outline)';
            title = 'Чернетка';
            break;
        case 'hidden':
            color = 'var(--color-warning)';
            title = 'Прихований';
            break;
        default:
            color = 'var(--color-outline)';
            title = status;
    }
    return `<span class="status-dot" style="background-color: ${color};" title="${title}"></span>`;
}

/**
 * Boolean badge - ідентично banned-words
 */
function renderBoolBadge(value, productId) {
    const isTrue = value === true || value === 'TRUE' || value === 1;
    const badgeClass = isTrue ? 'badge badge-success clickable' : 'badge badge-neutral clickable';
    const icon = isTrue ? 'check_circle' : 'cancel';
    const text = isTrue ? 'Так' : 'Ні';
    const statusValue = isTrue ? 'TRUE' : 'FALSE';

    return `
        <span class="${badgeClass}" data-badge-id="${productId}" data-status="${statusValue}" style="cursor: pointer;">
            <span class="material-symbols-outlined" style="font-size: 16px;">${icon}</span>
            ${text}
        </span>
    `.trim();
}

/**
 * Генерація посилань на вітрини
 */
function getStorefrontLinks(storefronts) {
    if (!storefronts) return '<span class="text-muted">—</span>';

    let links = [];

    if (storefronts.sportmeals) {
        links.push(`<a href="${storefronts.sportmeals}" target="_blank" class="storefront-link" title="Sport Meals">
            <span class="material-symbols-outlined">fitness_center</span>
        </a>`);
    }

    if (storefronts.fitnessshop) {
        links.push(`<a href="${storefronts.fitnessshop}" target="_blank" class="storefront-link" title="Fitness Shop">
            <span class="material-symbols-outlined">storefront</span>
        </a>`);
    }

    return links.length ? links.join(' ') : '<span class="text-muted">—</span>';
}

/**
 * Оновлення статистики в aside
 */
function updateAsideStats(products) {
    const totalProducts = document.getElementById('stats-total-products');
    const totalVariants = document.getElementById('stats-total-variants');
    const activeCount = document.getElementById('stats-active');

    if (totalProducts) {
        totalProducts.textContent = products.length;
    }
    if (totalVariants) {
        const variants = products.reduce((sum, p) => sum + p.variants_count, 0);
        totalVariants.textContent = variants;
    }
    if (activeCount) {
        const active = products.filter(p => p.status === 'active').length;
        activeCount.textContent = active;
    }
}

/**
 * Ініціалізація сортування
 */
function initSortableHeaders() {
    document.querySelectorAll('.sortable-header').forEach(header => {
        header.addEventListener('click', () => {
            const key = header.dataset.sortKey;
            if (sortKey === key) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortKey = key;
                sortDirection = 'asc';
            }
            renderProductsTable(DEMO_PRODUCTS);
        });
    });
}

/**
 * Batch Actions Bar
 */
function createBatchActionsBar() {
    // Перевірити чи вже існує
    if (document.getElementById('products-batch-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'products-batch-bar';
    bar.className = 'batch-actions-bar';
    bar.innerHTML = `
        <div class="selection-info">
            <span class="selection-count" id="products-selection-count">0</span>
            <span class="selection-label">вибрано</span>
        </div>
        <div class="batch-actions">
            <button class="batch-btn" id="batch-export">
                <span class="material-symbols-outlined">download</span>
                Експорт
            </button>
            <button class="batch-btn" id="batch-hide">
                <span class="material-symbols-outlined">visibility_off</span>
                Приховати
            </button>
            <button class="batch-btn primary" id="batch-activate">
                <span class="material-symbols-outlined">check_circle</span>
                Активувати
            </button>
        </div>
    `;
    document.body.appendChild(bar);

    // Обробники кнопок
    bar.querySelector('#batch-export').addEventListener('click', batchExport);
    bar.querySelector('#batch-hide').addEventListener('click', batchHide);
    bar.querySelector('#batch-activate').addEventListener('click', batchActivate);
}

function updateBatchBar() {
    const bar = document.getElementById('products-batch-bar');
    const count = document.getElementById('products-selection-count');
    if (!bar || !count) return;

    count.textContent = selectedProducts.size;

    if (selectedProducts.size > 0) {
        bar.classList.add('visible');
    } else {
        bar.classList.remove('visible');
    }
}

function batchExport() {
    alert(`Експорт ${selectedProducts.size} товарів (Demo)`);
}

function batchHide() {
    alert(`Приховано ${selectedProducts.size} товарів (Demo)`);
    selectedProducts.clear();
    renderProductsTable(DEMO_PRODUCTS);
}

function batchActivate() {
    alert(`Активовано ${selectedProducts.size} товарів (Demo)`);
    selectedProducts.clear();
    renderProductsTable(DEMO_PRODUCTS);
}

/**
 * Рендер табу Варіанти
 */
function renderVariantsTab() {
    const container = document.getElementById('variants-table-container');
    if (!container) return;

    // Збираємо всі варіанти з усіх товарів
    const allVariants = [];
    DEMO_PRODUCTS.forEach(product => {
        product.variants.forEach(variant => {
            allVariants.push({
                ...variant,
                productId: product.id,
                productName: product.name_short,
                productPhoto: product.photo
            });
        });
    });

    let html = `
        <div class="pseudo-table">
            <div class="pseudo-table-header">
                <div class="pseudo-table-cell cell-id">ID</div>
                <div class="pseudo-table-cell cell-photo">Фото</div>
                <div class="pseudo-table-cell cell-main-name">Товар</div>
                <div class="pseudo-table-cell">Варіант</div>
                <div class="pseudo-table-cell">SKU</div>
                <div class="pseudo-table-cell">Ціна</div>
                <div class="pseudo-table-cell">Залишок</div>
            </div>
            <div class="pseudo-table-body">
    `;

    allVariants.forEach((variant, idx) => {
        const stockClass = variant.stock === 0 ? 'text-error' : (variant.stock < 10 ? 'text-warning' : '');
        html += `
            <div class="pseudo-table-row">
                <div class="pseudo-table-cell cell-id">${variant.productId}-${variant.id}</div>
                <div class="pseudo-table-cell cell-photo">
                    <img src="${variant.productPhoto}" alt="" class="product-thumb">
                </div>
                <div class="pseudo-table-cell cell-main-name">${variant.productName}</div>
                <div class="pseudo-table-cell">${variant.name}</div>
                <div class="pseudo-table-cell"><code>${variant.sku}</code></div>
                <div class="pseudo-table-cell">₴ ${variant.price}</div>
                <div class="pseudo-table-cell ${stockClass}">${variant.stock}</div>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    container.innerHTML = html;
}

/**
 * Рендер табу Зв'язки (групи фасування)
 */
function renderGroupsTab() {
    const container = document.getElementById('groups-table-container');
    if (!container) return;

    // Demo дані для груп
    const groups = [
        {
            id: 1,
            name: "Протеїн ON Gold Standard Whey",
            products: [
                { id: 3, name: "ON Gold Standard Whey, 2.27 кг", variants: 5 },
                { id: 6, name: "ON Gold Standard Whey, 900 г", variants: 3 },
                { id: 7, name: "ON Gold Standard Whey, 4.54 кг", variants: 2 }
            ]
        },
        {
            id: 2,
            name: "MST Chitosan with Chrom",
            products: [
                { id: 1, name: "MST Chitosan with Chrom, 240 капсул", variants: 3 },
                { id: 8, name: "MST Chitosan with Chrom, 120 капсул", variants: 1 }
            ]
        }
    ];

    let html = `
        <div class="groups-list">
    `;

    groups.forEach(group => {
        html += `
            <div class="group-card">
                <div class="group-header">
                    <div class="group-info">
                        <span class="group-name">${group.name}</span>
                        <span class="group-count">${group.products.length} товарів</span>
                    </div>
                    <div class="group-actions">
                        <button class="btn-icon" title="Редагувати">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button class="btn-icon" title="Видалити">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </div>
                <div class="group-products">
                    ${group.products.map(p => `
                        <div class="group-product-item">
                            <span class="group-product-name">${p.name}</span>
                            <span class="badge">${p.variants} вар.</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    html += `
            <button class="btn btn-outline group-add-btn">
                <span class="material-symbols-outlined">add</span>
                Створити групу зв'язків
            </button>
        </div>
    `;

    container.innerHTML = html;
}

/**
 * Ініціалізація обробників подій
 */
function initEventHandlers() {
    // Клік по кнопці редагування
    document.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit-product');
        if (editBtn) {
            e.stopPropagation();
            const productId = editBtn.dataset.productId;
            openEditModal(productId);
            return;
        }

        // Клік по кількості варіантів
        const variantsBtn = e.target.closest('.btn-variants-count');
        if (variantsBtn) {
            e.stopPropagation();
            const productId = variantsBtn.dataset.productId;
            openVariantsModal(productId);
            return;
        }

        // Чекбокс в рядку
        const checkbox = e.target.closest('.row-checkbox');
        if (checkbox) {
            e.stopPropagation();
            const productId = parseInt(checkbox.dataset.productId);
            if (checkbox.checked) {
                selectedProducts.add(productId);
            } else {
                selectedProducts.delete(productId);
            }
            updateBatchBar();
            updateSelectAllCheckbox();
            return;
        }

        // Select all чекбокс
        const selectAll = e.target.closest('.header-select-all');
        if (selectAll) {
            const checkboxes = document.querySelectorAll('.row-checkbox');
            if (selectAll.checked) {
                checkboxes.forEach(cb => {
                    cb.checked = true;
                    selectedProducts.add(parseInt(cb.dataset.productId));
                });
            } else {
                checkboxes.forEach(cb => {
                    cb.checked = false;
                });
                selectedProducts.clear();
            }
            updateBatchBar();
            return;
        }

        // Клік по badge (toggle Так/Ні) - ідентично banned-words
        const badge = e.target.closest('.badge.clickable');
        if (badge && badge.dataset.badgeId) {
            e.stopPropagation();
            const productId = parseInt(badge.dataset.badgeId);
            const currentStatus = badge.dataset.status;
            const isChecked = currentStatus === 'TRUE';

            // Toggle статус
            const newStatus = !isChecked;
            const product = DEMO_PRODUCTS.find(p => p.id === productId);
            if (product) {
                product.show_on_site = newStatus;
            }

            // Оновлюємо badge
            badge.classList.remove('badge-success', 'badge-neutral');
            badge.classList.add(newStatus ? 'badge-success' : 'badge-neutral');
            badge.dataset.status = newStatus ? 'TRUE' : 'FALSE';
            badge.innerHTML = `
                <span class="material-symbols-outlined" style="font-size: 16px;">${newStatus ? 'check_circle' : 'cancel'}</span>
                ${newStatus ? 'Так' : 'Ні'}
            `;
            return;
        }
    });

    // Фільтри
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderProductsTable(DEMO_PRODUCTS);
        });
    });

    // Закриття модалки по ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && currentModal) {
            closeModal();
        }
    });
}

function updateSelectAllCheckbox() {
    const selectAll = document.querySelector('.header-select-all');
    const checkboxes = document.querySelectorAll('.row-checkbox');
    if (!selectAll || checkboxes.length === 0) return;

    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    selectAll.checked = allChecked;
}

/**
 * Ініціалізація табів на сторінці
 */
function initTabs() {
    document.querySelectorAll('[data-tab-target]').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tabTarget;

            // Деактивуємо всі таби
            document.querySelectorAll('[data-tab-target]').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('[data-tab-content]').forEach(c => c.classList.remove('active'));

            // Активуємо обраний
            tab.classList.add('active');
            document.querySelector(`[data-tab-content="${target}"]`)?.classList.add('active');
        });
    });
}

/**
 * Відкриття модального вікна редагування
 */
async function openEditModal(productId) {
    const product = DEMO_PRODUCTS.find(p => p.id == productId);
    if (!product) return;

    const container = document.getElementById('modal-container');

    try {
        const response = await fetch('templates/modals/product-edit-modal.html');
        const html = await response.text();
        container.innerHTML = html;

        // Оновлюємо заголовок
        const title = container.querySelector('#product-modal-title');
        if (title) {
            title.textContent = product.name_short;
        }

        // Показуємо модалку
        const overlay = container.querySelector('.modal-overlay');
        if (overlay) {
            overlay.classList.add('is-open');
            document.body.classList.add('is-modal-open');
            currentModal = overlay;
        }

        // Ініціалізуємо навігацію по секціях
        initSectionNavigator();

        // Ініціалізуємо кнопки закриття
        initModalCloseButtons();

        // Ініціалізуємо варіанти
        initVariantsToggle();

        // Ініціалізуємо таби опису
        initDescriptionTabs();

    } catch (error) {
        console.error('Failed to load edit modal:', error);
    }
}

/**
 * Відкриття модалу варіантів
 */
async function openVariantsModal(productId) {
    const product = DEMO_PRODUCTS.find(p => p.id == productId);
    if (!product) return;

    const container = document.getElementById('modal-container');

    // Генеруємо модал варіантів
    let variantsHtml = '';
    product.variants.forEach(variant => {
        const stockClass = variant.stock === 0 ? 'badge-error' : (variant.stock < 10 ? 'badge-warning' : 'badge-success');
        variantsHtml += `
            <div class="variant-card" data-variant-id="${variant.id}">
                <div class="variant-header">
                    <div class="variant-info">
                        <div class="variant-name">${variant.name}</div>
                        <div class="variant-sku">${variant.sku}</div>
                    </div>
                    <div class="variant-meta">
                        <span class="badge ${stockClass}">Залишок: ${variant.stock}</span>
                        <span class="variant-price">₴ ${variant.price}</span>
                    </div>
                    <div class="variant-actions">
                        <button class="btn-icon" title="Редагувати">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button class="btn-icon" title="Видалити">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = `
        <div class="modal-overlay is-open" data-modal-id="variants-modal">
            <div class="modal-container modal-medium">
                <div class="modal-header">
                    <h2 class="modal-title">Варіанти: ${product.name_short}</h2>
                    <button class="btn-icon" data-modal-close>
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="variants-list">
                        ${variantsHtml}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="btn-add-variant-modal">
                        <span class="material-symbols-outlined">add</span>
                        Додати варіант
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.classList.add('is-modal-open');
    currentModal = container.querySelector('.modal-overlay');

    // Ініціалізуємо кнопки закриття
    initModalCloseButtons();
}

/**
 * Відкриття wizard для створення товару
 */
async function openCreateWizard() {
    const container = document.getElementById('modal-container');

    try {
        const response = await fetch('templates/modals/product-create-wizard.html');
        const html = await response.text();
        container.innerHTML = html;

        // Показуємо модалку
        const overlay = container.querySelector('.modal-overlay');
        if (overlay) {
            overlay.classList.add('is-open');
            document.body.classList.add('is-modal-open');
            currentModal = overlay;
        }

        // Ініціалізуємо wizard
        initWizard();

        // Ініціалізуємо кастомні селекти
        initCustomSelects(container);

        // Ініціалізуємо кнопки закриття
        initModalCloseButtons();

    } catch (error) {
        console.error('Failed to load create wizard:', error);
    }
}

/**
 * Ініціалізація навігації по секціях у fullscreen модалці
 */
function initSectionNavigator() {
    const container = document.getElementById('modal-container');
    const navigator = container.querySelector('#product-section-navigator');
    const contentArea = container.querySelector('.modal-fullscreen-content');

    if (!navigator || !contentArea) return;

    // Клік по навігації - scroll to section
    navigator.querySelectorAll('.nav-icon').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = container.querySelector(`#${targetId}`);

            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

                // Оновлюємо активний стан
                navigator.querySelectorAll('.nav-icon').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });

    // Відстежуємо скрол для автоматичного оновлення активного пункту
    const sections = container.querySelectorAll('.product-section');

    const observerOptions = {
        root: contentArea,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                navigator.querySelectorAll('.nav-icon').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));
}

/**
 * Ініціалізація кнопок закриття модалки
 */
function initModalCloseButtons() {
    const container = document.getElementById('modal-container');

    // Кнопка закриття
    container.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // Клік по overlay
    const overlay = container.querySelector('.modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });
    }
}

/**
 * Ініціалізація toggle для варіантів
 */
function initVariantsToggle() {
    const container = document.getElementById('modal-container');

    container.querySelectorAll('.variant-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.variant-card');
            const body = card.querySelector('.variant-body');

            if (body.style.display === 'none') {
                body.style.display = 'block';
                card.classList.add('expanded');
            } else {
                body.style.display = 'none';
                card.classList.remove('expanded');
            }
        });
    });

    // Клік по header також toggle
    container.querySelectorAll('.variant-header').forEach(header => {
        header.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-icon')) {
                header.querySelector('.variant-toggle')?.click();
            }
        });
    });
}

/**
 * Ініціалізація табів опису
 */
function initDescriptionTabs() {
    const container = document.getElementById('modal-container');

    container.querySelectorAll('.description-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Деактивуємо всі таби
            container.querySelectorAll('.description-tab').forEach(t => t.classList.remove('active'));
            container.querySelectorAll('.description-tab-content').forEach(c => c.classList.remove('active'));

            // Активуємо обраний
            tab.classList.add('active');
            container.querySelector(`[data-tab-content="${targetTab}"]`)?.classList.add('active');
        });
    });
}

/**
 * Ініціалізація wizard
 */
function initWizard() {
    const container = document.getElementById('modal-container');
    let currentStep = 1;
    const totalSteps = 7;

    const prevBtn = container.querySelector('#wizard-prev');
    const nextBtn = container.querySelector('#wizard-next');
    const createBtn = container.querySelector('#wizard-create');
    const wizardDots = container.querySelector('#wizard-dots');
    const stepIndicator = container.querySelector('#wizard-step-indicator');
    const titleEl = container.querySelector('#wizard-title');
    const hintEl = container.querySelector('#wizard-title-hint');
    const iconEl = container.querySelector('#wizard-title-icon');

    function updateWizard() {
        // Оновлюємо індикатор
        if (stepIndicator) {
            stepIndicator.textContent = `Крок ${currentStep} з ${totalSteps}`;
        }

        // Оновлюємо кружечки (dots)
        if (wizardDots) {
            wizardDots.querySelectorAll('.wizard-dot').forEach((dot, index) => {
                dot.classList.remove('is-active');
                if (index + 1 === currentStep) {
                    dot.classList.add('is-active');
                }
            });
        }

        // Оновлюємо контент
        container.querySelectorAll('.wizard-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeStep = container.querySelector(`[data-wizard-step="${currentStep}"]`);
        activeStep?.classList.add('active');

        // Оновлюємо заголовок з data атрибутів
        if (activeStep && titleEl && hintEl && iconEl) {
            titleEl.textContent = activeStep.dataset.title || '';
            hintEl.textContent = activeStep.dataset.hint || '';
            iconEl.textContent = activeStep.dataset.icon || 'edit';
        }

        // Оновлюємо кнопки
        if (prevBtn) {
            prevBtn.disabled = currentStep === 1;
        }

        if (currentStep === totalSteps) {
            nextBtn?.classList.add('u-hidden');
            createBtn?.classList.remove('u-hidden');
            // Оновлюємо підсумок на останньому кроці
            updateSummary();
        } else {
            nextBtn?.classList.remove('u-hidden');
            createBtn?.classList.add('u-hidden');
        }
    }

    function updateSummary() {
        const categoryEl = container.querySelector('#wizard-category');
        const brandEl = container.querySelector('#wizard-brand');
        const nameUkEl = container.querySelector('#wizard-name-uk');
        const nameRuEl = container.querySelector('#wizard-name-ru');

        const summaryCategory = container.querySelector('#summary-category');
        const summaryBrand = container.querySelector('#summary-brand');
        const summaryNameUk = container.querySelector('#summary-name-uk');
        const summaryNameRu = container.querySelector('#summary-name-ru');
        const summaryVariants = container.querySelector('#summary-variants');

        if (summaryCategory && categoryEl) {
            summaryCategory.textContent = categoryEl.options[categoryEl.selectedIndex]?.text || '—';
        }
        if (summaryBrand && brandEl) {
            summaryBrand.textContent = brandEl.options[brandEl.selectedIndex]?.text || '—';
        }
        if (summaryNameUk && nameUkEl) {
            summaryNameUk.textContent = nameUkEl.value || '—';
        }
        if (summaryNameRu && nameRuEl) {
            summaryNameRu.textContent = nameRuEl.value || '—';
        }
        if (summaryVariants) {
            const variantsList = container.querySelectorAll('#wizard-variants-list .variant-item');
            summaryVariants.textContent = variantsList.length;
        }
    }

    // Кнопка "Назад"
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                updateWizard();
            }
        });
    }

    // Кнопка "Далі"
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentStep < totalSteps) {
                currentStep++;
                updateWizard();
            }
        });
    }

    // Кнопка "Створити"
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            // Показуємо підсумок
            showCreationSummary();
        });
    }

    // Клік по кружечках для навігації
    if (wizardDots) {
        wizardDots.querySelectorAll('.wizard-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                const step = parseInt(dot.dataset.step);
                if (step && step >= 1 && step <= totalSteps) {
                    currentStep = step;
                    updateWizard();
                }
            });
        });
    }

    // Ініціалізуємо прев'ю назви
    initNamePreview();

    // Початкове оновлення
    updateWizard();
}

/**
 * Показати підсумок створення - додати товар до таблиці і закрити
 */
function showCreationSummary() {
    const container = document.getElementById('modal-container');

    // Збираємо дані з форми
    const categoryEl = container.querySelector('#wizard-category');
    const brandEl = container.querySelector('#wizard-brand');
    const category = categoryEl?.options[categoryEl?.selectedIndex]?.text || 'Без категорії';
    const brand = brandEl?.options[brandEl?.selectedIndex]?.text || 'Без бренду';
    const nameUk = container.querySelector('#wizard-name-uk')?.value || 'Новий товар';
    const nameRu = container.querySelector('#wizard-name-ru')?.value || nameUk;
    const statusValue = container.querySelector('input[name="wizard-status"]:checked')?.value || 'draft';

    // Збираємо платформи
    const showSA = container.querySelector('#wizard-show-sa')?.checked || false;
    const showSM = container.querySelector('#wizard-show-sm')?.checked || false;
    const showFS = container.querySelector('#wizard-show-fs')?.checked || false;

    // Генеруємо новий ID
    const newId = Math.max(...DEMO_PRODUCTS.map(p => p.id)) + 1;

    // Створюємо новий товар
    const newProduct = {
        id: newId,
        name_uk: nameUk,
        name_ru: nameRu,
        name_short: nameUk,
        brand: brand,
        category: category,
        photo: "https://via.placeholder.com/48x48/e0e0e0/666?text=NEW",
        variants_count: 1,
        status: statusValue,
        storefronts: {
            sportmeals: showSM ? `https://sportmeals.com.ua/product/${newId}` : null,
            fitnessshop: showFS ? `https://fitness-shop.ua/product/${newId}` : null
        },
        show_on_site: showSA,
        variants: [
            { id: 1, name: "Стандарт", sku: `NEW-${newId}`, price: 0, stock: 0 }
        ]
    };

    // Додаємо до масиву
    DEMO_PRODUCTS.unshift(newProduct);

    // Закриваємо модалку
    closeModal();

    // Перерендеримо таблицю
    renderProductsTable(DEMO_PRODUCTS);

    // Показуємо toast повідомлення
    showToast(`Товар "${nameUk}" успішно створено!`, 'success');
}

/**
 * Ініціалізація прев'ю назви в wizard
 */
function initNamePreview() {
    const container = document.getElementById('modal-container');
    const previewUk = container.querySelector('#wizard-preview-name-uk');
    const previewRu = container.querySelector('#wizard-preview-name-ru');

    function updatePreview() {
        const brand = container.querySelector('#wizard-brand');
        const brandText = brand?.options[brand?.selectedIndex]?.text || '';
        const prefixUk = container.querySelector('#wizard-prefix-uk')?.value || '';
        const prefixRu = container.querySelector('#wizard-prefix-ru')?.value || '';
        const nameUk = container.querySelector('#wizard-name-uk')?.value || '';
        const nameRu = container.querySelector('#wizard-name-ru')?.value || '';
        const variationUk = container.querySelector('#wizard-variation-uk')?.value || '';
        const variationRu = container.querySelector('#wizard-variation-ru')?.value || '';

        let previewTextUk = '';
        if (prefixUk) previewTextUk += prefixUk + ' ';
        if (brandText && brandText !== 'Оберіть бренд') previewTextUk += brandText + ' ';
        if (nameUk) previewTextUk += nameUk;
        if (variationUk) previewTextUk += ', ' + variationUk;

        let previewTextRu = '';
        if (prefixRu) previewTextRu += prefixRu + ' ';
        if (brandText && brandText !== 'Оберіть бренд') previewTextRu += brandText + ' ';
        if (nameRu) previewTextRu += nameRu;
        if (variationRu) previewTextRu += ', ' + variationRu;

        if (previewUk) {
            previewUk.textContent = previewTextUk.trim() || '—';
        }
        if (previewRu) {
            previewRu.textContent = previewTextRu.trim() || '—';
        }
    }

    // Підписка на зміни
    const inputs = ['#wizard-prefix-uk', '#wizard-prefix-ru', '#wizard-brand', '#wizard-name-uk', '#wizard-name-ru', '#wizard-variation-uk', '#wizard-variation-ru'];
    inputs.forEach(selector => {
        const input = container.querySelector(selector);
        if (input) {
            input.addEventListener('input', updatePreview);
            input.addEventListener('change', updatePreview);
        }
    });
}

/**
 * Закриття модального вікна
 */
function closeModal() {
    if (currentModal) {
        currentModal.classList.remove('is-open');
        document.body.classList.remove('is-modal-open');

        setTimeout(() => {
            const container = document.getElementById('modal-container');
            container.innerHTML = '';
            currentModal = null;
        }, 200);
    }
}

// Запускаємо ініціалізацію при завантаженні
document.addEventListener('DOMContentLoaded', initProductsPage);
