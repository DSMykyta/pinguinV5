// js/products/products-storage.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                  PRODUCTS - LOCAL STORAGE                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Локальне збереження товарів у браузері.
 * Товари зберігаються в localStorage і доступні між сесіями.
 */

const STORAGE_KEY = 'pinguin_products';
const STORAGE_VERSION = '1.0';

/**
 * Структура товару
 * @typedef {Object} Product
 * @property {number} id - Унікальний ID
 * @property {string} name_uk - Назва українською
 * @property {string} name_ru - Назва російською
 * @property {string} name_short - Коротка назва
 * @property {string} brand_id - ID бренду
 * @property {string} brand - Назва бренду
 * @property {string} category_id - ID категорії
 * @property {string} category - Назва категорії
 * @property {string} photo - URL головного фото
 * @property {Array<string>} photos - Масив URL фото
 * @property {number} variants_count - Кількість варіантів
 * @property {string} status - Статус (active, draft, hidden)
 * @property {Object} storefronts - Посилання на вітрини
 * @property {boolean} show_on_site - Показувати на сайті
 * @property {Array<Variant>} variants - Варіанти товару
 * @property {Object} composition - Склад (ingredients_uk, ingredients_ru, table_uk, table_ru)
 * @property {Object} description - Опис (main_uk, main_ru, ...)
 * @property {Object} seo - SEO дані
 * @property {Object} attributes - Характеристики
 * @property {Object} fulfillment - Фулфілмент (weight, length, width, height)
 * @property {string} created_at - Дата створення
 * @property {string} updated_at - Дата оновлення
 */

/**
 * Структура варіанту
 * @typedef {Object} Variant
 * @property {number} id - ID варіанту
 * @property {string} name - Назва варіанту
 * @property {string} sku - Артикул
 * @property {string} barcode - Штрихкод
 * @property {number} price - Ціна
 * @property {number} stock - Залишок на складі
 * @property {string} flavor - Смак
 * @property {string} size - Розмір
 * @property {string} weight - Вага/Об'єм
 * @property {string} condition - Стан
 * @property {Array<string>} photos - Фото варіанту
 * @property {Object|null} own_composition - Власний склад (якщо є)
 */

/**
 * Отримати всі товари з localStorage
 * @returns {Array<Product>}
 */
export function getProducts() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];

        const parsed = JSON.parse(data);

        // Перевірка версії
        if (parsed.version !== STORAGE_VERSION) {
            console.warn('⚠️ Версія storage застаріла, очищаємо...');
            clearProducts();
            return [];
        }

        return parsed.products || [];
    } catch (error) {
        console.error('❌ Помилка читання localStorage:', error);
        return [];
    }
}

/**
 * Зберегти всі товари в localStorage
 * @param {Array<Product>} products
 */
export function saveProducts(products) {
    try {
        const data = {
            version: STORAGE_VERSION,
            products: products,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('❌ Помилка збереження в localStorage:', error);
        // Якщо localStorage переповнений
        if (error.name === 'QuotaExceededError') {
            console.error('⚠️ localStorage переповнений!');
        }
    }
}

/**
 * Отримати товар за ID
 * @param {number} id
 * @returns {Product|null}
 */
export function getProductById(id) {
    const products = getProducts();
    return products.find(p => p.id === id) || null;
}

/**
 * Додати новий товар
 * @param {Partial<Product>} productData
 * @returns {Product}
 */
export function addProduct(productData) {
    const products = getProducts();

    // Генеруємо новий ID
    const maxId = products.reduce((max, p) => Math.max(max, p.id), 0);
    const newId = maxId + 1;

    const now = new Date().toISOString();

    const newProduct = {
        id: newId,
        name_uk: productData.name_uk || '',
        name_ru: productData.name_ru || '',
        name_short: productData.name_short || productData.name_uk || '',
        brand_id: productData.brand_id || '',
        brand: productData.brand || '',
        category_id: productData.category_id || '',
        category: productData.category || '',
        photo: productData.photo || '',
        photos: productData.photos || [],
        variants_count: (productData.variants || []).length || 1,
        status: productData.status || 'draft',
        storefronts: productData.storefronts || { sportmeals: null, fitnessshop: null },
        show_on_site: productData.show_on_site ?? false,
        variants: productData.variants || [{
            id: 1,
            name: 'Стандарт',
            sku: `SKU-${Date.now()}`,
            barcode: '',
            price: 0,
            stock: 0,
            flavor: '',
            size: '',
            weight: '',
            condition: '',
            photos: [],
            own_composition: null
        }],
        composition: productData.composition || {
            ingredients_uk: '',
            ingredients_ru: '',
            table_uk: '',
            table_ru: ''
        },
        description: productData.description || {
            main_uk: '',
            main_ru: '',
            sportmeals_uk: '',
            sportmeals_ru: '',
            fitnessshop_uk: '',
            fitnessshop_ru: ''
        },
        seo: productData.seo || {
            title_uk: '',
            title_ru: '',
            description_uk: '',
            description_ru: '',
            keywords_uk: '',
            keywords_ru: ''
        },
        attributes: productData.attributes || {},
        fulfillment: productData.fulfillment || {
            weight: 0,
            length: 0,
            width: 0,
            height: 0,
            warranty: '',
            cargo_places: 1
        },
        created_at: now,
        updated_at: now
    };

    products.unshift(newProduct);
    saveProducts(products);

    return newProduct;
}

/**
 * Оновити товар
 * @param {number} id
 * @param {Partial<Product>} updates
 * @returns {Product|null}
 */
export function updateProduct(id, updates) {
    const products = getProducts();
    const index = products.findIndex(p => p.id === id);

    if (index === -1) {
        console.warn(`⚠️ Товар #${id} не знайдено`);
        return null;
    }

    // Оновлюємо
    products[index] = {
        ...products[index],
        ...updates,
        updated_at: new Date().toISOString()
    };

    // Оновлюємо variants_count якщо змінились варіанти
    if (updates.variants) {
        products[index].variants_count = updates.variants.length;
    }

    saveProducts(products);
    return products[index];
}

/**
 * Видалити товар
 * @param {number} id
 * @returns {boolean}
 */
export function deleteProduct(id) {
    const products = getProducts();
    const index = products.findIndex(p => p.id === id);

    if (index === -1) {
        console.warn(`⚠️ Товар #${id} не знайдено`);
        return false;
    }

    products.splice(index, 1);
    saveProducts(products);
    return true;
}

/**
 * Дублювати товар
 * @param {number} id
 * @returns {Product|null}
 */
export function duplicateProduct(id) {
    const product = getProductById(id);
    if (!product) {
        console.warn(`⚠️ Товар #${id} не знайдено`);
        return null;
    }

    const duplicate = {
        ...product,
        name_uk: product.name_uk + ' (копія)',
        name_ru: product.name_ru + ' (копія)',
        name_short: product.name_short + ' (копія)',
        status: 'draft',
        storefronts: { sportmeals: null, fitnessshop: null },
        show_on_site: false,
        variants: product.variants.map((v, i) => ({
            ...v,
            id: i + 1,
            sku: v.sku + '-COPY'
        }))
    };

    // Видаляємо id щоб addProduct згенерував новий
    delete duplicate.id;
    delete duplicate.created_at;
    delete duplicate.updated_at;

    return addProduct(duplicate);
}

/**
 * Очистити всі товари
 */
export function clearProducts() {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Експортувати товари в JSON
 * @returns {string}
 */
export function exportProductsJSON() {
    const products = getProducts();
    return JSON.stringify(products, null, 2);
}

/**
 * Імпортувати товари з JSON
 * @param {string} jsonString
 * @returns {boolean}
 */
export function importProductsJSON(jsonString) {
    try {
        const imported = JSON.parse(jsonString);
        if (!Array.isArray(imported)) {
            throw new Error('Очікується масив товарів');
        }

        // Валідація базових полів
        imported.forEach((p, i) => {
            if (!p.name_uk && !p.name_short) {
                throw new Error(`Товар #${i} не має назви`);
            }
        });

        const products = getProducts();
        const maxId = products.reduce((max, p) => Math.max(max, p.id), 0);

        // Додаємо імпортовані товари з новими ID
        imported.forEach((p, i) => {
            p.id = maxId + i + 1;
            p.created_at = p.created_at || new Date().toISOString();
            p.updated_at = new Date().toISOString();
        });

        const merged = [...imported, ...products];
        saveProducts(merged);

        return true;
    } catch (error) {
        console.error('❌ Помилка імпорту:', error);
        return false;
    }
}

/**
 * Отримати статистику
 * @returns {Object}
 */
export function getProductsStats() {
    const products = getProducts();

    const stats = {
        total: products.length,
        active: products.filter(p => p.status === 'active').length,
        draft: products.filter(p => p.status === 'draft').length,
        hidden: products.filter(p => p.status === 'hidden').length,
        variants: products.reduce((sum, p) => sum + (p.variants_count || 0), 0),
        onSite: products.filter(p => p.show_on_site).length
    };

    return stats;
}

/**
 * Ініціалізація з демо-даними (якщо localStorage порожній)
 * @param {Array<Product>} demoProducts
 */
export function initWithDemoData(demoProducts) {
    const existing = getProducts();
    if (existing.length > 0) {
        return existing;
    }

    saveProducts(demoProducts);
    return demoProducts;
}
