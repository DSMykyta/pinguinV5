/**
 * Products Page - Main Entry Point
 * Сторінка управління товарами з demo даними для візуалізації
 */

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
        variants: [
            { id: 1, name: "Без смаку", sku: "CN17214", price: 450, stock: 25 }
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

/**
 * Ініціалізація сторінки
 */
async function initProductsPage() {
    console.log('🚀 Products page initializing...');

    // Завантажуємо aside панель
    await loadAsidePanel();

    // Рендеримо таблицю товарів
    renderProductsTable(DEMO_PRODUCTS);

    // Ініціалізуємо обробники подій
    initEventHandlers();

    // Ініціалізуємо таби
    initTabs();

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
    const filtered = products.filter(p => {
        if (currentFilter === 'all') return true;
        return p.status === currentFilter;
    });

    // Оновлюємо статистику
    const stats = document.getElementById('tab-stats-products');
    if (stats) {
        stats.textContent = `Показано ${filtered.length} з ${products.length}`;
    }

    // Генеруємо HTML таблиці
    let html = `
        <div class="pseudo-table">
            <div class="pseudo-table-header">
                <div class="pseudo-table-cell cell-actions"></div>
                <div class="pseudo-table-cell cell-photo">Фото</div>
                <div class="pseudo-table-cell cell-main-name">Назва</div>
                <div class="pseudo-table-cell cell-brand">Бренд</div>
                <div class="pseudo-table-cell cell-category">Категорія</div>
                <div class="pseudo-table-cell cell-variants">Варіанти</div>
                <div class="pseudo-table-cell cell-status">Статус</div>
            </div>
            <div class="pseudo-table-body">
    `;

    filtered.forEach(product => {
        const statusBadge = getStatusBadge(product.status);
        html += `
            <div class="pseudo-table-row product-row" data-product-id="${product.id}">
                <div class="pseudo-table-cell cell-actions">
                    <button class="btn-icon btn-edit-product" data-product-id="${product.id}" title="Редагувати">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                </div>
                <div class="pseudo-table-cell cell-photo">
                    <img src="${product.photo}" alt="${product.name_short}" class="product-thumb">
                </div>
                <div class="pseudo-table-cell cell-main-name">
                    <div class="product-name-block">
                        <strong class="product-name">${product.name_uk}</strong>
                        <span class="product-name-secondary">${product.name_short}</span>
                    </div>
                </div>
                <div class="pseudo-table-cell cell-brand">
                    <span class="badge badge-outline">${product.brand}</span>
                </div>
                <div class="pseudo-table-cell cell-category">
                    ${product.category}
                </div>
                <div class="pseudo-table-cell cell-variants">
                    <span class="badge">${product.variants_count} варіантів</span>
                </div>
                <div class="pseudo-table-cell cell-status">
                    ${statusBadge}
                </div>
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
 * Отримати badge для статусу
 */
function getStatusBadge(status) {
    switch (status) {
        case 'active':
            return '<span class="badge badge-success">Активний</span>';
        case 'draft':
            return '<span class="badge badge-outline">Чернетка</span>';
        case 'hidden':
            return '<span class="badge badge-warning">Прихований</span>';
        default:
            return '<span class="badge">' + status + '</span>';
    }
}

/**
 * Ініціалізація обробників подій
 */
function initEventHandlers() {
    // Клік по рядку товару
    document.addEventListener('click', (e) => {
        const productRow = e.target.closest('.product-row');
        const editBtn = e.target.closest('.btn-edit-product');

        if (editBtn || productRow) {
            const productId = (editBtn || productRow).dataset.productId;
            openEditModal(productId);
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

        // Ініціалізуємо навігацію по секціях (fullscreen modal)
        initSectionNavigator();

        // Ініціалізуємо кнопки закриття
        initModalCloseButtons();

        // Ініціалізуємо варіанти
        initVariantsToggle();

    } catch (error) {
        console.error('Failed to load edit modal:', error);
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

        // Ініціалізуємо wizard
        initWizard();

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
 * Ініціалізація wizard
 */
function initWizard() {
    const container = document.getElementById('modal-container');
    let currentStep = 1;
    const totalSteps = 6;

    const prevBtn = container.querySelector('#wizard-prev');
    const nextBtn = container.querySelector('#wizard-next');
    const createBtn = container.querySelector('#wizard-create');
    const progressBar = container.querySelector('#wizard-progress-bar');
    const stepIndicator = container.querySelector('#wizard-step-indicator');

    function updateWizard() {
        // Оновлюємо прогрес бар
        const progress = (currentStep / totalSteps) * 100;
        progressBar.style.width = progress + '%';

        // Оновлюємо індикатор
        stepIndicator.textContent = `Крок ${currentStep} з ${totalSteps}`;

        // Оновлюємо кроки
        container.querySelectorAll('.wizard-step').forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index + 1 === currentStep) {
                step.classList.add('active');
            } else if (index + 1 < currentStep) {
                step.classList.add('completed');
            }
        });

        // Оновлюємо контент
        container.querySelectorAll('.wizard-content').forEach(content => {
            content.classList.remove('active');
        });
        container.querySelector(`[data-wizard-step="${currentStep}"]`)?.classList.add('active');

        // Оновлюємо кнопки
        prevBtn.disabled = currentStep === 1;

        if (currentStep === totalSteps) {
            nextBtn.classList.add('u-hidden');
            createBtn.classList.remove('u-hidden');
        } else {
            nextBtn.classList.remove('u-hidden');
            createBtn.classList.add('u-hidden');
        }
    }

    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateWizard();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentStep < totalSteps) {
            currentStep++;
            updateWizard();
        }
    });

    createBtn.addEventListener('click', () => {
        alert('✅ Товар створено! (Demo)');
        closeModal();
    });

    // Ініціалізуємо прев'ю назви
    initNamePreview();
}

/**
 * Ініціалізація прев'ю назви в wizard
 */
function initNamePreview() {
    const container = document.getElementById('modal-container');
    const previewEl = container.querySelector('#wizard-preview-name');

    const inputs = [
        '#wizard-prefix-uk',
        '#wizard-brand',
        '#wizard-name',
        '#wizard-variation'
    ];

    function updatePreview() {
        const brand = container.querySelector('#wizard-brand');
        const brandText = brand?.options[brand.selectedIndex]?.text || '';
        const prefix = container.querySelector('#wizard-prefix-uk')?.value || '';
        const name = container.querySelector('#wizard-name')?.value || '';
        const variation = container.querySelector('#wizard-variation')?.value || '';

        let preview = '';
        if (prefix) preview += prefix + ' ';
        if (brandText && brandText !== 'Оберіть бренд') preview += brandText + ' ';
        if (name) preview += name;
        if (variation) preview += ', ' + variation;

        if (preview.trim()) {
            previewEl.innerHTML = preview;
            previewEl.classList.remove('text-muted');
        } else {
            previewEl.innerHTML = '<span class="text-muted">Заповніть поля вище...</span>';
        }
    }

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
