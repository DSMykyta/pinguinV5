// js/brands/brands-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - DATA MANAGEMENT                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Робота з Google Sheets API для брендів через backend API.
 * Використовує уніфікований api-client для всіх операцій
 */

import { brandsState } from './brands-init.js';
import { callSheetsAPI } from '../utils/api-client.js';
import { MAIN_SPREADSHEET_ID as SPREADSHEET_ID } from '../config/spreadsheet-config.js';

const SHEET_NAME = 'Brands';
const SHEET_GID = '653695455'; // GID для Brands

/**
 * Завантажити всі бренди через CSV export (без авторизації)
 * @returns {Promise<Array>} Масив брендів
 */
export async function loadBrands() {
    console.log('📥 Завантаження брендів з Google Sheets...');

    try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
        const response = await fetch(csvUrl);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvText = await response.text();

        // Перевіряємо чи завантажено PapaParse
        if (typeof Papa === 'undefined') {
            throw new Error('PapaParse library is not loaded');
        }

        const parsedData = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        const rows = parsedData.data;

        if (!rows || rows.length === 0) {
            console.warn('⚠️ Немає даних в Brands');
            brandsState.brands = [];
            return brandsState.brands;
        }

        brandsState.brands = rows.map((row, index) => ({
            ...row,
            _rowIndex: index + 2 // +2 бо заголовок + 1-based indexing
        }));

        console.log(`✅ Завантажено ${brandsState.brands.length} брендів`);
        return brandsState.brands;
    } catch (error) {
        console.error('❌ Помилка завантаження брендів:', error);
        throw error;
    }
}

// callSheetsAPI імпортується з '../utils/api-client.js'

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
        await callSheetsAPI('append', {
            range: `${SHEET_NAME}!A:G`,
            values: [newRow],
            spreadsheetType: 'main'
        });

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

        await callSheetsAPI('update', {
            range: range,
            values: [updatedRow],
            spreadsheetType: 'main'
        });

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
        const range = `${SHEET_NAME}!A${brand._rowIndex}:G${brand._rowIndex}`;
        await callSheetsAPI('update', {
            range: range,
            values: [['', '', '', '', '', '', '']],
            spreadsheetType: 'main'
        });

        // Видалити з state
        brandsState.brands.splice(brandIndex, 1);

        console.log('✅ Бренд видалено');
    } catch (error) {
        console.error('❌ Помилка видалення бренду:', error);
        throw error;
    }
}

