/**
 * Products Page - Main Entry Point
 * Сторінка управління товарами з локальним збереженням
 */

import { initCustomSelects } from '../common/ui-select.js';
import { showToast } from '../common/ui-toast.js';
import { renderPseudoTable, renderBadge } from '../common/ui-table.js';

// Data services
import {
    loadAllData,
    loadCategories,
    loadCharacteristics,
    loadOptions,
    loadBrands,
    getCachedData,
    getOptionsForCharacteristic,
    getCharacteristicsForCategory,
    getCharacteristicsByBlocks,
    getDependentCharacteristics,
    hasChildCharacteristics,
    getFieldType,
    BLOCK_NAMES
} from './products-data-service.js';

import {
    getProducts,
    saveProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    getProductsStats,
    initWithDemoData
} from './products-storage.js';

// Demo дані товарів (для першого запуску)
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

// Активні товари (з localStorage)
let productsData = [];

// Дані з таблиць
let sheetsData = {
    categories: [],
    characteristics: [],
    options: [],
    brands: []
};

/**
 * Ініціалізація сторінки
 */
async function initProductsPage() {
    console.log('🚀 Products page initializing...');

    // Завантажуємо aside панель
    await loadAsidePanel();

    // Завантажуємо дані з Google Sheets
    try {
        sheetsData = await loadAllData();
        console.log('📊 Дані з таблиць:', sheetsData);
    } catch (error) {
        console.warn('⚠️ Не вдалося завантажити дані з таблиць:', error);
    }

    // Ініціалізуємо товари з localStorage (або demo)
    productsData = initWithDemoData(DEMO_PRODUCTS);
    console.log(`📦 Завантажено ${productsData.length} товарів`);

    // Рендеримо таблицю товарів
    renderProductsTable(productsData);

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
 * Рендер таблиці товарів (використовує shared renderPseudoTable)
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

    // Використовуємо shared renderPseudoTable
    renderPseudoTable(container, {
        data: filtered,
        columns: [
            {
                id: 'id',
                label: 'ID',
                sortable: true,
                className: 'cell-id',
                render: (value) => `<span class="product-id">${value}</span>`
            },
            {
                id: 'photo',
                label: 'Фото',
                sortable: false,
                className: 'cell-photo',
                render: (value, row) => `<img src="${value}" alt="${row.name_short}" class="product-thumb">`
            },
            {
                id: 'category',
                label: 'Категорія',
                sortable: true,
                className: 'cell-category'
            },
            {
                id: 'name_short',
                label: 'Назва',
                sortable: true,
                className: 'cell-main-name',
                render: (value) => `<span class="product-name">${value}</span>`
            },
            {
                id: 'variants_count',
                label: 'Варіанти',
                sortable: false,
                className: 'cell-variants',
                render: (value, row) => `<button class="btn-variants-count" data-product-id="${row.id}" title="Переглянути варіанти">${value}</button>`
            },
            {
                id: 'status',
                label: 'Статус',
                sortable: true,
                className: 'cell-status-small',
                render: (value) => getStatusDot(value)
            },
            {
                id: 'show_on_site',
                label: 'Вивід',
                sortable: false,
                className: 'cell-bool',
                render: (value, row) => renderBadge(value, 'boolean', { clickable: true, id: row.id })
            },
            {
                id: 'storefronts',
                label: 'Вітрини',
                sortable: false,
                className: 'cell-storefronts',
                render: (value) => getStorefrontLinks(value)
            }
        ],
        rowActionsCustom: (row) => {
            const isChecked = selectedProducts.has(row.id);
            return `
                <input type="checkbox" class="row-checkbox" data-product-id="${row.id}" aria-label="Вибрати" ${isChecked ? 'checked' : ''}>
                <button class="btn-icon btn-icon-sm btn-edit-product" data-product-id="${row.id}" title="Редагувати">
                    <span class="material-symbols-outlined">edit</span>
                </button>
            `;
        },
        rowActionsHeader: '<input type="checkbox" class="header-select-all" id="select-all-products" aria-label="Вибрати всі">',
        emptyState: {
            icon: 'inventory_2',
            message: 'Товари не знайдено'
        },
        withContainer: false // Контейнер вже має клас pseudo-table-container
    });

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

// renderBoolBadge видалено - використовується renderBadge з ui-table.js

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
            renderProductsTable(productsData);
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
    selectedProducts.forEach(id => {
        updateProduct(id, { status: 'hidden' });
    });
    productsData = getProducts();
    showToast(`Приховано ${selectedProducts.size} товарів`, 'success');
    selectedProducts.clear();
    renderProductsTable(productsData);
}

function batchActivate() {
    selectedProducts.forEach(id => {
        updateProduct(id, { status: 'active' });
    });
    productsData = getProducts();
    showToast(`Активовано ${selectedProducts.size} товарів`, 'success');
    selectedProducts.clear();
    renderProductsTable(productsData);
}

/**
 * Рендер табу Варіанти (використовує shared renderPseudoTable)
 */
function renderVariantsTab() {
    const container = document.getElementById('variants-table-container');
    if (!container) return;

    // Збираємо всі варіанти з усіх товарів
    const allVariants = [];
    productsData.forEach(product => {
        product.variants.forEach(variant => {
            allVariants.push({
                ...variant,
                productId: product.id,
                productName: product.name_short,
                productPhoto: product.photo,
                combinedId: `${product.id}-${variant.id}`
            });
        });
    });

    renderPseudoTable(container, {
        data: allVariants,
        columns: [
            {
                id: 'combinedId',
                label: 'ID',
                sortable: false,
                className: 'cell-id'
            },
            {
                id: 'productPhoto',
                label: 'Фото',
                sortable: false,
                className: 'cell-photo',
                render: (value) => `<img src="${value}" alt="" class="product-thumb">`
            },
            {
                id: 'productName',
                label: 'Товар',
                sortable: true,
                className: 'cell-main-name'
            },
            {
                id: 'name',
                label: 'Варіант',
                sortable: true
            },
            {
                id: 'sku',
                label: 'SKU',
                sortable: false,
                render: (value) => `<code>${value}</code>`
            },
            {
                id: 'price',
                label: 'Ціна',
                sortable: true,
                render: (value) => `₴ ${value}`
            },
            {
                id: 'stock',
                label: 'Залишок',
                sortable: true,
                render: (value) => {
                    const stockClass = value === 0 ? 'text-error' : (value < 10 ? 'text-warning' : '');
                    return `<span class="${stockClass}">${value}</span>`;
                }
            }
        ],
        emptyState: {
            icon: 'style',
            message: 'Варіанти не знайдено'
        },
        withContainer: false
    });
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

    // Обробники для кнопок у групах
    container.querySelectorAll('.group-card .btn-icon[title="Редагувати"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const groupName = btn.closest('.group-card')?.querySelector('.group-name')?.textContent || 'Група';
            showToast(`Редагування групи: ${groupName}`, 'info');
        });
    });

    container.querySelectorAll('.group-card .btn-icon[title="Видалити"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const groupCard = btn.closest('.group-card');
            const groupName = groupCard?.querySelector('.group-name')?.textContent || 'Група';
            if (confirm(`Видалити групу "${groupName}"?`)) {
                groupCard.remove();
                showToast('Групу видалено', 'info');
            }
        });
    });

    // Кнопка створення групи
    const addGroupBtn = container.querySelector('.group-add-btn');
    if (addGroupBtn) {
        addGroupBtn.addEventListener('click', () => {
            showToast('Створення нової групи зв\'язків', 'info');
            // Тут можна додати модал створення групи
        });
    }
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
            const product = productsData.find(p => p.id === productId);
            if (product) {
                product.show_on_site = newStatus;
                updateProduct(productId, { show_on_site: newStatus });
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
            renderProductsTable(productsData);
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
    const product = productsData.find(p => p.id == productId);
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

        // Наповнюємо селекти категорій та брендів
        await populateEditModalSelects(container, product);

        // Рендеримо характеристики по блоках
        renderCharacteristicsByBlocks(container, product.category_id || null);

        // Заповнюємо значення характеристик з товару
        fillCharacteristicsValues(container, product);

        // Ініціалізуємо обробник зміни категорії
        initCategoryChangeHandler(container);

        // Ініціалізуємо навігацію по секціях
        initSectionNavigator();

        // Ініціалізуємо кастомні селекти
        initCustomSelects(container);

        // Ініціалізуємо кнопки закриття
        initModalCloseButtons();

        // Ініціалізуємо варіанти
        initVariantsToggle();

        // Ініціалізуємо таби опису
        initDescriptionTabs();

        // Ініціалізуємо всі кнопки в модалі редагування
        initEditModalActions(productId);

    } catch (error) {
        console.error('Failed to load edit modal:', error);
    }
}

/**
 * Наповнення селектів у edit modal
 */
async function populateEditModalSelects(container, product) {
    const { categories, brands } = sheetsData;

    // Категорії
    const categorySelect = container.querySelector('#edit-category');
    if (categorySelect && categories.length > 0) {
        categorySelect.innerHTML = '<option value="">Оберіть категорію</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name_ua;
            if (cat.id === product.category_id) {
                option.selected = true;
            }
            categorySelect.appendChild(option);
        });
    }

    // Бренди
    const brandSelect = container.querySelector('#edit-brand');
    if (brandSelect && brands.length > 0) {
        brandSelect.innerHTML = '<option value="">Оберіть бренд</option>';
        brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand.id;
            option.textContent = brand.name_uk;
            if (brand.id === product.brand_id) {
                option.selected = true;
            }
            brandSelect.appendChild(option);
        });
    }
}

/**
 * Заповнення значень характеристик з товару
 */
function fillCharacteristicsValues(container, product) {
    if (!product.attributes) return;

    Object.entries(product.attributes).forEach(([charId, value]) => {
        const field = container.querySelector(`[data-characteristic-id="${charId}"]`);
        if (!field) return;

        if (field.tagName === 'SELECT') {
            field.value = value;
        } else if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
            field.value = value;
        } else if (field.classList.contains('checkbox-group')) {
            // Для checkbox-group
            const values = Array.isArray(value) ? value : [value];
            field.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = values.includes(cb.value);
            });
        }
    });
}

/**
 * Відкриття модалу варіантів
 */
async function openVariantsModal(productId) {
    const product = productsData.find(p => p.id == productId);
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

    // Кнопка "Додати варіант"
    const addVariantModalBtn = container.querySelector('#btn-add-variant-modal');
    if (addVariantModalBtn) {
        addVariantModalBtn.addEventListener('click', () => {
            const newId = product.variants.length + 1;
            const newVariant = {
                id: newId,
                name: 'Новий варіант',
                sku: `SKU-${Date.now()}`,
                price: 0,
                stock: 0
            };
            product.variants.push(newVariant);
            product.variants_count = product.variants.length;

            // Додаємо до списку
            const variantsList = container.querySelector('.variants-list');
            if (variantsList) {
                const variantHtml = `
                    <div class="variant-card" data-variant-id="${newVariant.id}">
                        <div class="variant-header">
                            <div class="variant-info">
                                <div class="variant-name">${newVariant.name}</div>
                                <div class="variant-sku">${newVariant.sku}</div>
                            </div>
                            <div class="variant-meta">
                                <span class="badge badge-neutral">Залишок: 0</span>
                                <span class="variant-price">₴ 0</span>
                            </div>
                            <div class="variant-actions">
                                <button class="btn-icon btn-edit-variant-modal" title="Редагувати">
                                    <span class="material-symbols-outlined">edit</span>
                                </button>
                                <button class="btn-icon btn-delete-variant-modal" title="Видалити">
                                    <span class="material-symbols-outlined">delete</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                variantsList.insertAdjacentHTML('beforeend', variantHtml);
            }
            showToast('Варіант додано', 'success');
        });
    }

    // Делегування для кнопок редагування/видалення варіантів
    const variantsModalList = container.querySelector('.variants-list');
    if (variantsModalList) {
        variantsModalList.addEventListener('click', (e) => {
            const editBtn = e.target.closest('[title="Редагувати"]');
            if (editBtn) {
                e.stopPropagation();
                const variantCard = editBtn.closest('.variant-card');
                const variantName = variantCard?.querySelector('.variant-name')?.textContent || 'Варіант';
                showToast(`Редагування: ${variantName}`, 'info');
                return;
            }

            const deleteBtn = e.target.closest('[title="Видалити"]');
            if (deleteBtn) {
                e.stopPropagation();
                const variantCard = deleteBtn.closest('.variant-card');
                const variantName = variantCard?.querySelector('.variant-name')?.textContent || 'Варіант';
                if (confirm(`Видалити варіант "${variantName}"?`)) {
                    variantCard.remove();
                    showToast('Варіант видалено', 'info');
                }
                return;
            }
        });
    }
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

        // Наповнюємо селекти даними з таблиць
        await populateWizardSelects(container);

        // Рендеримо характеристики по блоках
        renderCharacteristicsByBlocks(container, null);

        // Ініціалізуємо обробник зміни категорії
        initCategoryChangeHandler(container);

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
 * Наповнення селектів у wizard даними з таблиць
 */
async function populateWizardSelects(container) {
    const { categories, brands, characteristics, options } = sheetsData;

    // Категорії
    const categorySelect = container.querySelector('#wizard-category');
    if (categorySelect && categories.length > 0) {
        categorySelect.innerHTML = '<option value="">Оберіть категорію</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name_ua;
            categorySelect.appendChild(option);
        });
    }

    // Бренди
    const brandSelect = container.querySelector('#wizard-brand');
    if (brandSelect && brands.length > 0) {
        brandSelect.innerHTML = '<option value="">Оберіть бренд</option>';
        brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand.id;
            option.textContent = brand.name_uk;
            brandSelect.appendChild(option);
        });
    }

    // Смаки (characteristic_id для смаку - шукаємо за назвою)
    const flavorChar = characteristics.find(c =>
        c.name_ua?.toLowerCase().includes('смак') ||
        c.name_ru?.toLowerCase().includes('вкус')
    );
    if (flavorChar) {
        const flavorOptions = getOptionsForCharacteristic(flavorChar.id);
        const flavorSelect = container.querySelector('#wizard-variant-flavor');
        if (flavorSelect && flavorOptions.length > 0) {
            flavorSelect.innerHTML = '<option value="">—</option>';
            flavorOptions.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.id;
                option.textContent = opt.value_ua;
                flavorSelect.appendChild(option);
            });
            // Додаємо "Інший..." в кінці
            const otherOption = document.createElement('option');
            otherOption.value = 'other';
            otherOption.textContent = 'Інший...';
            flavorSelect.appendChild(otherOption);
        }
    }

    // Розмір
    const sizeChar = characteristics.find(c =>
        c.name_ua?.toLowerCase().includes('розмір') ||
        c.name_ru?.toLowerCase().includes('размер')
    );
    if (sizeChar) {
        const sizeOptions = getOptionsForCharacteristic(sizeChar.id);
        const sizeSelect = container.querySelector('#wizard-variant-size');
        if (sizeSelect && sizeOptions.length > 0) {
            sizeSelect.innerHTML = '<option value="">—</option>';
            sizeOptions.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.id;
                option.textContent = opt.value_ua;
                sizeSelect.appendChild(option);
            });
        }
    }

    // Об'єм/Вага
    const weightChar = characteristics.find(c =>
        c.name_ua?.toLowerCase().includes('вага') ||
        c.name_ua?.toLowerCase().includes("об'єм") ||
        c.name_ru?.toLowerCase().includes('вес')
    );
    if (weightChar) {
        const weightOptions = getOptionsForCharacteristic(weightChar.id);
        const weightSelect = container.querySelector('#wizard-variant-weight');
        if (weightSelect && weightOptions.length > 0) {
            weightSelect.innerHTML = '<option value="">—</option>';
            weightOptions.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.id;
                option.textContent = opt.value_ua;
                weightSelect.appendChild(option);
            });
        }
    }

    console.log('✅ Селекти wizard наповнено даними з таблиць');
}

/**
 * Рендеринг характеристик по блоках
 * @param {HTMLElement} container - Контейнер для характеристик
 * @param {string|null} categoryId - ID категорії для фільтрації
 */
function renderCharacteristicsByBlocks(container, categoryId = null) {
    const attributesGrid = container.querySelector('#attributes-grid, .attributes-grid');
    if (!attributesGrid) return;

    const blocks = getCharacteristicsByBlocks(categoryId);
    let html = '';

    // Сортуємо блоки за номером
    const sortedBlocks = Object.entries(blocks).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

    sortedBlocks.forEach(([blockNum, block]) => {
        // Пропускаємо блоки Варіанти та Опис (вони в окремих кроках)
        if (blockNum === '7' || blockNum === '8') return;

        html += `
            <div class="attributes-block" data-block="${blockNum}">
                <div class="attributes-block-header">${block.name}</div>
                <div class="attributes-block-content">
        `;

        block.characteristics.forEach(char => {
            html += renderCharacteristicField(char);
        });

        html += `
                </div>
            </div>
        `;
    });

    attributesGrid.innerHTML = html;

    // Ініціалізуємо обробники для залежних характеристик
    initDependentCharacteristicsHandlers(container);
}

/**
 * Рендеринг одного поля характеристики
 * @param {Object} char - Характеристика
 * @returns {string} HTML
 */
function renderCharacteristicField(char) {
    const fieldType = getFieldType(char);
    const options = getOptionsForCharacteristic(char.id);
    const hasChildren = hasChildCharacteristics(char.id);

    let fieldHtml = '';

    switch (fieldType) {
        case 'select':
            // Кастомний select з одним вибором (ComboBox)
            fieldHtml = `
                <select id="char-${char.id}" data-characteristic-id="${char.id}" ${hasChildren ? 'data-has-children="true"' : ''} data-custom-select>
                    <option value="">—</option>
                    ${options.map(opt => `<option value="${opt.id}">${opt.value_ua}</option>`).join('')}
                </select>
            `;
            break;

        case 'select-multiple':
            // Кастомний select з множинним вибором (ListValues, List)
            fieldHtml = `
                <select id="char-${char.id}" data-characteristic-id="${char.id}" ${hasChildren ? 'data-has-children="true"' : ''} data-custom-select multiple>
                    ${options.map(opt => `<option value="${opt.id}">${opt.value_ua}</option>`).join('')}
                </select>
            `;
            break;

        case 'number':
            fieldHtml = `
                <input type="number" id="char-${char.id}" class="input-main" data-characteristic-id="${char.id}" placeholder="${char.unit || ''}">
            `;
            break;

        case 'textarea':
            fieldHtml = `
                <textarea id="char-${char.id}" class="input-main" data-characteristic-id="${char.id}" rows="3" placeholder=""></textarea>
            `;
            break;

        case 'checkbox-group':
            fieldHtml = `
                <div class="checkbox-group" id="char-${char.id}" data-characteristic-id="${char.id}">
                    ${options.map(opt => `
                        <label class="checkbox-label">
                            <input type="checkbox" value="${opt.id}">
                            <span>${opt.value_ua}</span>
                        </label>
                    `).join('')}
                </div>
            `;
            break;

        case 'tags':
            fieldHtml = `
                <input type="text" id="char-${char.id}" class="input-main" data-characteristic-id="${char.id}" placeholder="Введіть через кому">
            `;
            break;

        default:
            fieldHtml = `
                <input type="text" id="char-${char.id}" class="input-main" data-characteristic-id="${char.id}" placeholder="">
            `;
    }

    return `
        <div class="form-group" data-char-field="${char.id}">
            <label>${char.name_ua}${char.unit ? ` (${char.unit})` : ''}</label>
            ${fieldHtml}
        </div>
    `;
}

/**
 * Ініціалізація обробників для залежних характеристик
 * @param {HTMLElement} container
 */
function initDependentCharacteristicsHandlers(container) {
    // Знаходимо всі селекти з дочірніми характеристиками
    const selectsWithChildren = container.querySelectorAll('[data-has-children="true"]');

    selectsWithChildren.forEach(select => {
        select.addEventListener('change', (e) => {
            const selectedOptionId = e.target.value;
            const charId = e.target.dataset.characteristicId;

            // Видаляємо попередні залежні поля для цієї характеристики
            container.querySelectorAll(`[data-parent-char="${charId}"]`).forEach(el => el.remove());

            if (!selectedOptionId) return;

            // Отримуємо залежні характеристики для обраної опції
            const dependentChars = getDependentCharacteristics(selectedOptionId);

            if (dependentChars.length === 0) return;

            // Знаходимо батьківський form-group
            const parentFormGroup = e.target.closest('.form-group');
            if (!parentFormGroup) return;

            // Додаємо залежні поля після батьківського
            dependentChars.forEach(depChar => {
                const fieldHtml = renderCharacteristicField(depChar);
                const wrapper = document.createElement('div');
                wrapper.innerHTML = fieldHtml;
                const newField = wrapper.firstElementChild;
                newField.dataset.parentChar = charId;
                newField.classList.add('dependent-field');
                parentFormGroup.insertAdjacentElement('afterend', newField);
            });

            // Перезапускаємо custom selects для нових полів
            initCustomSelects(container);
        });
    });
}

/**
 * Обробник зміни категорії - перебудовує характеристики
 * @param {HTMLElement} container
 */
function initCategoryChangeHandler(container) {
    const categorySelect = container.querySelector('#wizard-category, #edit-category');
    if (!categorySelect) return;

    categorySelect.addEventListener('change', (e) => {
        const categoryId = e.target.value;
        renderCharacteristicsByBlocks(container, categoryId || null);
        initCustomSelects(container);
    });
}

/**
 * Ініціалізація навігації по секціях у fullscreen модалці
 */
function initSectionNavigator() {
    const container = document.getElementById('modal-container');
    const navigator = container.querySelector('#product-section-navigator');
    const contentArea = container.querySelector('.modal-fullscreen-content');

    if (!navigator || !contentArea) return;

    // Визначаємо клас навігаційних елементів (sidebar або horizontal)
    const navItemClass = navigator.classList.contains('sidebar-navigator') ? '.sidebar-nav-item' : '.nav-icon';

    // Клік по навігації - scroll to section
    navigator.querySelectorAll(navItemClass).forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = container.querySelector(`#${targetId}`);

            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

                // Оновлюємо активний стан
                navigator.querySelectorAll(navItemClass).forEach(l => l.classList.remove('active'));
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
                navigator.querySelectorAll(navItemClass).forEach(link => {
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
 * Ініціалізація всіх кнопок в модалі редагування
 */
function initEditModalActions(productId) {
    const container = document.getElementById('modal-container');
    const product = productsData.find(p => p.id == productId);

    // === HEADER BUTTONS ===

    // Кнопка "Зберегти"
    const saveBtn = container.querySelector('#btn-save-product');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            // Збираємо дані з форми
            const nameUk = container.querySelector('#edit-name-uk')?.value;
            const nameRu = container.querySelector('#edit-name-ru')?.value;

            if (product && nameUk) {
                updateProduct(product.id, {
                    name_uk: nameUk,
                    name_ru: nameRu,
                    name_short: nameUk
                });
                productsData = getProducts();
            }

            showToast('Зміни збережено', 'success');
            closeModal();
            renderProductsTable(productsData);
        });
    }

    // Кнопка "Дублювати"
    const duplicateBtn = container.querySelector('#btn-duplicate-product');
    if (duplicateBtn) {
        duplicateBtn.addEventListener('click', () => {
            if (!product) return;

            const duplicate = duplicateProduct(product.id);
            if (duplicate) {
                productsData = getProducts();
                showToast(`Товар дубльовано: ${duplicate.name_short}`, 'success');
                closeModal();
                renderProductsTable(productsData);
            }
        });
    }

    // Кнопка "Видалити"
    const deleteBtn = container.querySelector('#btn-delete-product');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (!product) return;

            if (confirm(`Видалити товар "${product.name_short}"?`)) {
                if (deleteProduct(product.id)) {
                    productsData = getProducts();
                    showToast('Товар видалено', 'info');
                    closeModal();
                    renderProductsTable(productsData);
                }
            }
        });
    }

    // === PHOTOS SECTION ===

    // Клік по "Додати фото"
    const photoAddBtn = container.querySelector('#photos-grid .photo-add');
    if (photoAddBtn) {
        photoAddBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = (e) => {
                const files = e.target.files;
                if (files.length > 0) {
                    // Додаємо фото перед кнопкою "Додати"
                    const grid = container.querySelector('#photos-grid');
                    Array.from(files).forEach(file => {
                        const photoItem = document.createElement('div');
                        photoItem.className = 'photo-item';
                        photoItem.innerHTML = `
                            <img src="https://via.placeholder.com/200x200/e3f2fd/1565c0?text=${encodeURIComponent(file.name.substring(0, 8))}" alt="${file.name}">
                            <div class="photo-overlay">
                                <div class="photo-actions">
                                    <button class="btn-icon btn-icon-light btn-photo-star" title="Зробити головним">
                                        <span class="material-symbols-outlined">star</span>
                                    </button>
                                    <button class="btn-icon btn-icon-light btn-photo-delete" title="Видалити">
                                        <span class="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                            </div>
                        `;
                        grid.insertBefore(photoItem, photoAddBtn);
                    });
                    showToast(`Додано ${files.length} фото`, 'success');
                }
            };
            input.click();
        });
    }

    // Делегування для кнопок фото (star, delete)
    const photosGrid = container.querySelector('#photos-grid');
    if (photosGrid) {
        photosGrid.addEventListener('click', (e) => {
            const starBtn = e.target.closest('.btn-photo-star, [title="Зробити головним"]');
            if (starBtn) {
                e.stopPropagation();
                const photoItem = starBtn.closest('.photo-item');
                const currentMain = photosGrid.querySelector('.photo-main');

                // Забираємо статус головного з поточного
                if (currentMain && currentMain !== photoItem) {
                    currentMain.classList.remove('photo-main');
                    const badge = currentMain.querySelector('.photo-badge');
                    if (badge) badge.remove();

                    // Додаємо кнопку star до старого головного
                    const oldActions = currentMain.querySelector('.photo-actions');
                    if (oldActions && !oldActions.querySelector('.btn-photo-star, [title="Зробити головним"]')) {
                        const newStarBtn = document.createElement('button');
                        newStarBtn.className = 'btn-icon btn-icon-light btn-photo-star';
                        newStarBtn.title = 'Зробити головним';
                        newStarBtn.innerHTML = '<span class="material-symbols-outlined">star</span>';
                        oldActions.insertBefore(newStarBtn, oldActions.firstChild);
                    }
                }

                // Встановлюємо нове головне
                photoItem.classList.add('photo-main');
                starBtn.remove();

                // Додаємо badge
                const overlay = photoItem.querySelector('.photo-overlay');
                if (overlay && !overlay.querySelector('.photo-badge')) {
                    const badge = document.createElement('span');
                    badge.className = 'photo-badge';
                    badge.textContent = 'Головне';
                    overlay.insertBefore(badge, overlay.firstChild);
                }

                showToast('Головне фото змінено', 'success');
                return;
            }

            const deleteBtn = e.target.closest('.btn-photo-delete, .photo-actions [title="Видалити"]');
            if (deleteBtn) {
                e.stopPropagation();
                const photoItem = deleteBtn.closest('.photo-item');
                if (photoItem.classList.contains('photo-main')) {
                    showToast('Не можна видалити головне фото', 'error');
                    return;
                }
                photoItem.remove();
                showToast('Фото видалено', 'info');
                return;
            }
        });
    }

    // === VARIANTS SECTION ===

    // Кнопка "Додати варіант"
    const addVariantBtn = container.querySelector('#btn-add-variant');
    if (addVariantBtn) {
        addVariantBtn.addEventListener('click', () => {
            const variantsList = container.querySelector('#variants-list');
            if (!variantsList) return;

            const newVariantId = Date.now();
            const newVariantHtml = `
                <div class="variant-card" data-variant-id="${newVariantId}">
                    <div class="variant-header">
                        <div class="variant-info">
                            <img src="https://via.placeholder.com/48x48/e0e0e0/666?text=NEW" class="variant-thumb">
                            <div>
                                <div class="variant-name">Новий варіант</div>
                                <div class="variant-sku">SKU-${newVariantId}</div>
                            </div>
                        </div>
                        <div class="variant-meta">
                            <span class="badge badge-neutral">Залишок: 0</span>
                            <span class="variant-price">₴ 0</span>
                        </div>
                        <div class="variant-actions">
                            <button class="btn-icon btn-variant-delete" title="Видалити">
                                <span class="material-symbols-outlined">delete</span>
                            </button>
                            <button class="btn-icon variant-toggle" title="Розгорнути">
                                <span class="material-symbols-outlined">expand_more</span>
                            </button>
                        </div>
                    </div>
                    <div class="variant-body" style="display: none;">
                        <div class="form-grid form-grid-4">
                            <div class="form-group">
                                <label>Артикул</label>
                                <input type="text" value="SKU-${newVariantId}">
                            </div>
                            <div class="form-group">
                                <label>Штрихкод</label>
                                <input type="text" placeholder="EAN-13">
                            </div>
                            <div class="form-group">
                                <label>Ціна</label>
                                <input type="number" value="0">
                            </div>
                            <div class="form-group">
                                <label>На складі</label>
                                <input type="number" value="0">
                            </div>
                        </div>
                        <div class="form-grid form-grid-4">
                            <div class="form-group">
                                <label>Смак</label>
                                <input type="text" placeholder="—">
                            </div>
                            <div class="form-group">
                                <label>Розмір</label>
                                <input type="text" placeholder="—">
                            </div>
                            <div class="form-group">
                                <label>Об'єм/Вага</label>
                                <input type="text" placeholder="—">
                            </div>
                            <div class="form-group">
                                <label>Стан</label>
                                <input type="text" placeholder="—">
                            </div>
                        </div>
                        <div class="variant-section u-mt-16">
                            <div class="variant-section-header">
                                <span class="material-symbols-outlined">image</span>
                                <span>Фото варіанту</span>
                            </div>
                            <div class="variant-photos-grid">
                                <div class="photo-item photo-small photo-add variant-photo-add">
                                    <span class="material-symbols-outlined">add</span>
                                </div>
                            </div>
                        </div>
                        <div class="variant-section u-mt-16">
                            <label class="checkbox-label">
                                <input type="checkbox" class="variant-own-composition-toggle">
                                <span>Власний склад для цього варіанту</span>
                            </label>
                            <div class="variant-composition-fields" style="display: none;">
                                <div class="form-group u-mt-16">
                                    <label>Інгредієнти</label>
                                    <textarea rows="3" placeholder="Власний склад для варіанту..."></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            variantsList.insertAdjacentHTML('beforeend', newVariantHtml);

            // Реініціалізуємо toggle
            initVariantsToggle();

            showToast('Варіант додано', 'success');
        });
    }

    // Делегування для видалення варіантів та toggle власного складу
    const variantsList = container.querySelector('#variants-list');
    if (variantsList) {
        variantsList.addEventListener('click', (e) => {
            // Видалити варіант
            const deleteBtn = e.target.closest('.btn-variant-delete, .variant-actions [title="Видалити"]');
            if (deleteBtn) {
                e.stopPropagation();
                const variantCard = deleteBtn.closest('.variant-card');
                const variantName = variantCard?.querySelector('.variant-name')?.textContent || 'Варіант';

                if (confirm(`Видалити варіант "${variantName}"?`)) {
                    variantCard.remove();
                    showToast('Варіант видалено', 'info');
                }
                return;
            }

            // Фото варіанту - додати
            const variantPhotoAdd = e.target.closest('.variant-photo-add, .variant-photos-grid .photo-add');
            if (variantPhotoAdd) {
                e.stopPropagation();
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (ev) => {
                    const file = ev.target.files[0];
                    if (file) {
                        const grid = variantPhotoAdd.closest('.variant-photos-grid');
                        const photoItem = document.createElement('div');
                        photoItem.className = 'photo-item photo-small';
                        photoItem.innerHTML = `<img src="https://via.placeholder.com/80x80/e3f2fd/1565c0?text=${encodeURIComponent(file.name.substring(0, 4))}" alt="Variant photo">`;
                        grid.insertBefore(photoItem, variantPhotoAdd);
                        showToast('Фото варіанту додано', 'success');
                    }
                };
                input.click();
                return;
            }
        });

        // Toggle власного складу
        variantsList.addEventListener('change', (e) => {
            if (e.target.classList.contains('variant-own-composition-toggle')) {
                const compositionFields = e.target.closest('.variant-section').querySelector('.variant-composition-fields');
                if (compositionFields) {
                    compositionFields.style.display = e.target.checked ? 'block' : 'none';
                }
            }
        });
    }

    // === INFO BUTTONS ===
    container.querySelectorAll('.section-name .btn-icon[aria-label="Інформація"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionName = btn.closest('.section-name')?.querySelector('h2')?.textContent || 'Секція';
            showToast(`Довідка: ${sectionName}`, 'info');
        });
    });

    // === STATUS RADIO BUTTONS ===
    const statusRadios = container.querySelectorAll('input[name="edit-status"]');
    const statusBadge = container.querySelector('#product-status-badge');

    statusRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (!radio.checked || !statusBadge) return;

            const statusMap = {
                'active': { text: 'Активний', class: 'badge badge-success' },
                'draft': { text: 'Чернетка', class: 'badge badge-neutral' },
                'hidden': { text: 'Прихований', class: 'badge badge-warning' }
            };

            const status = statusMap[radio.value] || statusMap['draft'];
            statusBadge.textContent = status.text;
            statusBadge.className = status.class;

            if (product) {
                product.status = radio.value;
            }
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

    // Ініціалізуємо варіанти wizard
    initWizardVariants();

    // Початкове оновлення
    updateWizard();
}

/**
 * Ініціалізація варіантів у wizard
 */
function initWizardVariants() {
    const container = document.getElementById('modal-container');
    let variantCounter = 0;

    // Кнопка "Додати варіант"
    const addVariantBtn = container.querySelector('#wizard-add-variant');
    if (addVariantBtn) {
        addVariantBtn.addEventListener('click', () => {
            const flavorSelect = container.querySelector('#wizard-variant-flavor');
            const sizeSelect = container.querySelector('#wizard-variant-size');
            const weightSelect = container.querySelector('#wizard-variant-weight');
            const conditionSelect = container.querySelector('#wizard-variant-condition');

            // Отримуємо значення (враховуємо custom-select)
            const flavor = getSelectValue(flavorSelect);
            const size = getSelectValue(sizeSelect);
            const weight = getSelectValue(weightSelect);
            const condition = getSelectValue(conditionSelect);

            // Формуємо назву варіанту
            let variantName = [];
            if (flavor) variantName.push(flavorSelect.options[flavorSelect.selectedIndex]?.text);
            if (size) variantName.push(sizeSelect.options[sizeSelect.selectedIndex]?.text);
            if (weight) variantName.push(weightSelect.options[weightSelect.selectedIndex]?.text);
            if (condition) variantName.push(conditionSelect.options[conditionSelect.selectedIndex]?.text);

            if (variantName.length === 0) {
                showToast('Оберіть хоча б одну характеристику варіанту', 'error');
                return;
            }

            variantCounter++;
            const variantId = variantCounter;
            const variantNameStr = variantName.join(' / ');
            const variantSku = `SKU-${Date.now()}-${variantId}`;

            // Додаємо до списку
            const variantsList = container.querySelector('#wizard-variants-list');
            const variantHtml = `
                <div class="variant-item" data-variant-id="${variantId}">
                    <div class="variant-item-info">
                        <span class="variant-item-name">${variantNameStr}</span>
                        <span class="variant-item-sku">${variantSku}</span>
                    </div>
                    <input type="number" class="variant-item-price-input" placeholder="₴ Ціна" style="width: 100px;">
                    <button class="btn-icon btn-icon-sm btn-delete-variant" data-variant-id="${variantId}" title="Видалити">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            `;
            variantsList.insertAdjacentHTML('beforeend', variantHtml);

            // Очищаємо селекти
            resetSelect(flavorSelect);
            resetSelect(sizeSelect);
            resetSelect(weightSelect);
            resetSelect(conditionSelect);

            showToast(`Варіант "${variantNameStr}" додано`, 'success');
        });
    }

    // Делегування для видалення варіантів
    container.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.btn-delete-variant');
        if (deleteBtn) {
            const variantItem = deleteBtn.closest('.variant-item');
            if (variantItem) {
                variantItem.remove();
                showToast('Варіант видалено', 'info');
            }
        }
    });

    // Кнопка "Додати власний склад для варіанту"
    const compositionBtn = container.querySelector('#wizard-variant-composition-btn');
    if (compositionBtn) {
        compositionBtn.addEventListener('click', () => {
            openVariantCompositionModal();
        });
    }

    // Кнопка додавання фото
    const photoAddBtn = container.querySelector('.photo-add');
    if (photoAddBtn) {
        photoAddBtn.addEventListener('click', () => {
            // Створюємо прихований input для файлу
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    showToast(`Фото "${file.name}" додано (demo)`, 'success');
                }
            };
            input.click();
        });
    }
}

/**
 * Отримати значення select (враховуючи custom-select)
 */
function getSelectValue(selectEl) {
    if (!selectEl) return '';
    return selectEl.value || '';
}

/**
 * Скинути select до початкового стану
 */
function resetSelect(selectEl) {
    if (!selectEl) return;
    selectEl.selectedIndex = 0;

    // Якщо є custom-select wrapper, оновлюємо його
    const wrapper = selectEl.closest('.custom-select-wrapper');
    if (wrapper) {
        const trigger = wrapper.querySelector('.custom-select-value-container');
        const placeholder = wrapper.querySelector('.custom-select-placeholder');
        if (trigger && placeholder) {
            trigger.innerHTML = '';
            trigger.appendChild(placeholder.cloneNode(true));
        }
    }
}

/**
 * Відкрити модал складу варіанту
 */
function openVariantCompositionModal() {
    const modalContainer = document.getElementById('modal-container');
    const compositionModal = modalContainer.querySelector('[data-modal-id="variant-composition-modal"]');

    if (compositionModal) {
        compositionModal.classList.add('is-open');

        // Кнопка закриття
        compositionModal.querySelectorAll('[data-modal-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                compositionModal.classList.remove('is-open');
            });
        });

        // Клік по overlay
        compositionModal.addEventListener('click', (e) => {
            if (e.target === compositionModal) {
                compositionModal.classList.remove('is-open');
            }
        });

        // Кнопка "Зберегти"
        const saveBtn = compositionModal.querySelector('#save-variant-composition');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                showToast('Склад варіанту збережено', 'success');
                compositionModal.classList.remove('is-open');
            });
        }
    } else {
        showToast('Модал складу варіанту не знайдено', 'error');
    }
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
    const categoryId = categoryEl?.value || '';
    const brand = brandEl?.options[brandEl?.selectedIndex]?.text || 'Без бренду';
    const brandId = brandEl?.value || '';
    const nameUk = container.querySelector('#wizard-name-uk')?.value || 'Новий товар';
    const nameRu = container.querySelector('#wizard-name-ru')?.value || nameUk;
    const statusValue = container.querySelector('input[name="wizard-status"]:checked')?.value || 'draft';

    // Збираємо платформи
    const showSA = container.querySelector('#wizard-show-sa')?.checked || false;
    const showSM = container.querySelector('#wizard-show-sm')?.checked || false;
    const showFS = container.querySelector('#wizard-show-fs')?.checked || false;

    // Збираємо варіанти з wizard
    const variantItems = container.querySelectorAll('#wizard-variants-list .variant-item');
    const variants = [];
    variantItems.forEach((item, index) => {
        const name = item.querySelector('.variant-item-name')?.textContent || `Варіант ${index + 1}`;
        const sku = item.querySelector('.variant-item-sku')?.textContent || `SKU-${Date.now()}-${index}`;
        const priceInput = item.querySelector('.variant-item-price-input');
        const price = priceInput ? parseFloat(priceInput.value) || 0 : 0;
        variants.push({ id: index + 1, name, sku, barcode: '', price, stock: 0, flavor: '', size: '', weight: '', condition: '', photos: [], own_composition: null });
    });

    // Якщо варіантів немає - додаємо стандартний
    if (variants.length === 0) {
        variants.push({ id: 1, name: "Стандарт", sku: `SKU-${Date.now()}`, barcode: '', price: 0, stock: 0, flavor: '', size: '', weight: '', condition: '', photos: [], own_composition: null });
    }

    // Створюємо новий товар через storage
    const newProduct = addProduct({
        name_uk: nameUk,
        name_ru: nameRu,
        name_short: nameUk,
        brand: brand,
        brand_id: brandId,
        category: category,
        category_id: categoryId,
        status: statusValue,
        storefronts: {
            sportmeals: showSM ? 'pending' : null,
            fitnessshop: showFS ? 'pending' : null
        },
        show_on_site: showSA,
        variants: variants
    });

    // Оновлюємо локальний масив
    productsData = getProducts();

    // Закриваємо модалку
    closeModal();

    // Перерендеримо таблицю
    renderProductsTable(productsData);

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
