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

import { brandsState } from './brands-init.js';

const SHEET_NAME = 'Brands';

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
            brandsState.brands = [];
            return brandsState.brands;
        }

        brandsState.brands = parseSheetData(values);
        console.log(`✅ Завантажено ${brandsState.brands.length} брендів`);

        return brandsState.brands;
    } catch (error) {
        console.error('❌ Помилка завантаження брендів:', error);
        throw error;
    }
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
 * Отримати бренди з state
 * @returns {Array} Масив брендів
 */
export function getBrands() {
    return brandsState.brands || [];
}

/**
 * Генерувати новий ID для бренду
 * @returns {string} Новий ID у форматі bran-XXXXXX (6 цифр)
 */
function generateBrandId() {
    // Знайти максимальний номер
    let maxNum = 0;

    brandsState.brands.forEach(brand => {
        if (brand.brand_id && brand.brand_id.startsWith('bran-')) {
            const num = parseInt(brand.brand_id.replace('bran-', ''), 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });

    // Новий номер
    const newNum = maxNum + 1;

    // Форматувати як bran-XXXXXX (6 цифр)
    return `bran-${String(newNum).padStart(6, '0')}`;
}

/**
 * Додати новий бренд
 * @param {Object} brandData - Дані бренду
 * @returns {Promise<Object>} Доданий бренд
 */
export async function addBrand(brandData) {
    console.log('➕ Додавання нового бренду:', brandData);

    try {
        // Генеруємо новий ID
        const newId = generateBrandId();

        // Формуємо новий рядок
        const newRow = [
            newId,
            brandData.name_uk || '',
            brandData.names_alt || '',
            brandData.country_option_id || '',
            brandData.brand_text || '',
            brandData.brand_site_link || ''
        ];

        // Додаємо через API
        await window.apiClient.sheets.append(SHEET_NAME, [newRow]);

        // Оновлюємо state
        const newBrand = {
            _rowIndex: brandsState.brands.length + 2,
            brand_id: newId,
            name_uk: brandData.name_uk || '',
            names_alt: brandData.names_alt || '',
            country_option_id: brandData.country_option_id || '',
            brand_text: brandData.brand_text || '',
            brand_site_link: brandData.brand_site_link || ''
        };

        brandsState.brands.push(newBrand);

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
        // Знайти бренд в state
        const brand = brandsState.brands.find(b => b.brand_id === brandId);
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

        // Оновити state
        Object.assign(brand, updates);

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
        // Знайти бренд в state
        const brandIndex = brandsState.brands.findIndex(b => b.brand_id === brandId);
        if (brandIndex === -1) {
            throw new Error(`Бренд ${brandId} не знайдено`);
        }

        const brand = brandsState.brands[brandIndex];

        // Видалити рядок (очистити дані)
        const range = `${SHEET_NAME}!A${brand._rowIndex}:F${brand._rowIndex}`;
        await window.apiClient.sheets.update(range, [['', '', '', '', '', '']]);

        // Видалити з state
        brandsState.brands.splice(brandIndex, 1);

        console.log('✅ Бренд видалено');
    } catch (error) {
        console.error('❌ Помилка видалення бренду:', error);
        throw error;
    }
}

