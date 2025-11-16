// js/brands/brands-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - DATA MANAGEMENT                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Робота з Google Sheets API для брендів через backend API.
 * Використовує механізми з GOOGLE-SHEETS-GUIDE.md
 * Backend автоматично працює з spreadsheet з конфігурації.
 */

const SHEET_NAME = 'Brands';

// Кеш для даних
let brandsCache = null;
let countriesCache = null;

/**
 * Завантажити всі бренди з Google Sheets
 * @returns {Promise<Array>} Масив брендів
 */
export async function loadBrands() {
    console.log('📥 Завантаження брендів з Google Sheets...');

    try {
        const response = await window.apiClient.sheets.get(SHEET_NAME);

        const values = response.result?.values || response.data || [];
        if (!values || values.length === 0) {
            console.warn('⚠️ Немає даних в Brands');
            brandsCache = [];
            return brandsCache;
        }

        brandsCache = parseSheetData(values);
        console.log(`✅ Завантажено ${brandsCache.length} брендів`);

        // Також завантажити країни для відображення
        await loadCountries();

        // Збагатити бренди назвами країн
        enrichBrandsWithCountryNames();

        return brandsCache;
    } catch (error) {
        console.error('❌ Помилка завантаження брендів:', error);
        throw error;
    }
}

/**
 * Завантажити країни (Options з характеристикою "Країна")
 * @returns {Promise<Array>} Масив країн
 */
async function loadCountries() {
    console.log('📥 Завантаження країн...');

    try {
        const response = await window.apiClient.sheets.get('Options');

        const values = response.result?.values || response.data || [];
        if (!values || values.length === 0) {
            console.warn('⚠️ Немає даних в Options');
            countriesCache = [];
            return countriesCache;
        }

        const allOptions = parseSheetData(values);

        // Фільтруємо тільки країни (якщо є char_id або інша ознака)
        // Припускаємо, що всі опції з характеристикою "Країна" мають певний char_id
        // Для простоти зараз беремо всі опції
        countriesCache = allOptions;

        console.log(`✅ Завантажено ${countriesCache.length} опцій (країн)`);
        return countriesCache;
    } catch (error) {
        console.error('❌ Помилка завантаження країн:', error);
        countriesCache = [];
        return countriesCache;
    }
}

/**
 * Збагатити бренди назвами країн
 */
function enrichBrandsWithCountryNames() {
    if (!brandsCache || !countriesCache) return;

    brandsCache.forEach(brand => {
        if (brand.country_option_id) {
            const country = countriesCache.find(c => c.local_id === brand.country_option_id);
            brand.country_name = country ? country.name_uk : '';
        } else {
            brand.country_name = '';
        }
    });

    console.log('✅ Бренди збагачено назвами країн');
}

/**
 * Парсить дані з аркуша (перший рядок - заголовки)
 * @param {Array<Array<string>>} values - Дані з Google Sheets
 * @returns {Array<Object>} Масив об'єктів
 */
function parseSheetData(values) {
    if (!values || values.length === 0) return [];

    const headers = values[0];
    const rows = values.slice(1);

    return rows.map((row, index) => {
        const obj = { _rowIndex: index + 2 }; // +2 бо рядок 1 це заголовки, а рядки починаються з 2
        headers.forEach((header, colIndex) => {
            obj[header] = row[colIndex] || '';
        });
        return obj;
    });
}

/**
 * Отримати бренди з кешу
 * @returns {Array} Масив брендів
 */
export function getBrands() {
    return brandsCache || [];
}

/**
 * Отримати країни з кешу
 * @returns {Array} Масив країн
 */
export function getCountries() {
    return countriesCache || [];
}

/**
 * Додати новий бренд
 * @param {Object} brandData - Дані бренду
 * @returns {Promise<Object>} Доданий бренд
 */
export async function addBrand(brandData) {
    console.log('➕ Додавання нового бренду:', brandData);

    try {
        // Генеруємо новий ID (беремо максимальний + 1)
        const maxId = brandsCache.reduce((max, b) => {
            const id = parseInt(b.brand_id) || 0;
            return id > max ? id : max;
        }, 0);
        const newId = maxId + 1;

        // Формуємо новий рядок
        const newRow = [
            newId.toString(),
            brandData.name_uk || '',
            brandData.names_alt || '',
            brandData.country_option_id || '',
            brandData.brand_text || '',
            brandData.brand_site_link || ''
        ];

        // Додаємо через API
        await window.apiClient.sheets.append(SHEET_NAME, [newRow]);

        // Оновлюємо кеш
        const newBrand = {
            _rowIndex: brandsCache.length + 2,
            brand_id: newId.toString(),
            name_uk: brandData.name_uk || '',
            names_alt: brandData.names_alt || '',
            country_option_id: brandData.country_option_id || '',
            brand_text: brandData.brand_text || '',
            brand_site_link: brandData.brand_site_link || '',
            country_name: ''
        };

        // Знайти назву країни
        if (newBrand.country_option_id && countriesCache) {
            const country = countriesCache.find(c => c.local_id === newBrand.country_option_id);
            newBrand.country_name = country ? country.name_uk : '';
        }

        brandsCache.push(newBrand);

        console.log('✅ Бренд додано:', newBrand);
        return newBrand;
    } catch (error) {
        console.error('❌ Помилка додавання бренду:', error);
        throw error;
    }
}

/**
 * Оновити бренд
 * @param {string} brandId - ID бренду
 * @param {Object} updates - Оновлення
 * @returns {Promise<Object>} Оновлений бренд
 */
export async function updateBrand(brandId, updates) {
    console.log(`📝 Оновлення бренду ${brandId}:`, updates);

    try {
        // Знайти бренд в кеші
        const brand = brandsCache.find(b => b.brand_id === brandId);
        if (!brand) {
            throw new Error(`Бренд ${brandId} не знайдено`);
        }

        // Оновити рядок в Google Sheets
        const range = `${SHEET_NAME}!A${brand._rowIndex}:F${brand._rowIndex}`;
        const updatedRow = [
            brand.brand_id,
            updates.name_uk !== undefined ? updates.name_uk : brand.name_uk,
            updates.names_alt !== undefined ? updates.names_alt : brand.names_alt,
            updates.country_option_id !== undefined ? updates.country_option_id : brand.country_option_id,
            updates.brand_text !== undefined ? updates.brand_text : brand.brand_text,
            updates.brand_site_link !== undefined ? updates.brand_site_link : brand.brand_site_link
        ];

        await window.apiClient.sheets.update(range, [updatedRow]);

        // Оновити кеш
        Object.assign(brand, updates);

        // Оновити назву країни
        if (brand.country_option_id && countriesCache) {
            const country = countriesCache.find(c => c.local_id === brand.country_option_id);
            brand.country_name = country ? country.name_uk : '';
        } else {
            brand.country_name = '';
        }

        console.log('✅ Бренд оновлено:', brand);
        return brand;
    } catch (error) {
        console.error('❌ Помилка оновлення бренду:', error);
        throw error;
    }
}

/**
 * Видалити бренд
 * @param {string} brandId - ID бренду
 * @returns {Promise<void>}
 */
export async function deleteBrand(brandId) {
    console.log(`🗑️ Видалення бренду ${brandId}`);

    try {
        // Знайти бренд в кеші
        const brandIndex = brandsCache.findIndex(b => b.brand_id === brandId);
        if (brandIndex === -1) {
            throw new Error(`Бренд ${brandId} не знайдено`);
        }

        const brand = brandsCache[brandIndex];

        // Видалити рядок (очистити дані)
        const range = `${SHEET_NAME}!A${brand._rowIndex}:F${brand._rowIndex}`;
        await window.apiClient.sheets.update(range, [['', '', '', '', '', '']]);

        // Видалити з кешу
        brandsCache.splice(brandIndex, 1);

        console.log('✅ Бренд видалено');
    } catch (error) {
        console.error('❌ Помилка видалення бренду:', error);
        throw error;
    }
}

/**
 * Batch оновлення чекбоксів для вибраних брендів
 * @param {Array<string>} brandIds - Масив ID брендів
 * @param {boolean} checked - Значення чекбоксу
 * @returns {Promise<void>}
 */
export async function batchUpdateChecked(brandIds, checked) {
    console.log(`📦 Batch оновлення чекбоксів для ${brandIds.length} брендів`);

    try {
        const updates = [];

        brandIds.forEach(brandId => {
            const brand = brandsCache.find(b => b.brand_id === brandId);
            if (!brand) return;

            // Припускаємо, що колонка G це checked (потрібно додати в Google Sheets)
            updates.push({
                range: `${SHEET_NAME}!G${brand._rowIndex}`,
                values: [[checked ? 'TRUE' : 'FALSE']]
            });

            // Оновити кеш
            brand.checked = checked;
        });

        if (updates.length > 0) {
            await window.apiClient.sheets.batchUpdate(updates);
            console.log('✅ Batch оновлення виконано');
        }
    } catch (error) {
        console.error('❌ Помилка batch оновлення:', error);
        throw error;
    }
}
