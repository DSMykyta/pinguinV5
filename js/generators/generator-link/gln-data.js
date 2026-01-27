// js/generators/generator-link/gln-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    GENERATOR LINK - DATA                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Завантаження даних брендів для генератора посилань.
 *
 * ФОРМАТ ДАНИХ:
 * linksData = [
 *   { brand: "MST", linkName: "ua", url: "https://mst.ua", country: "Німеччина" },
 *   { brand: "MST", linkName: "de", url: "https://mst.de", country: "Німеччина" },
 *   { brand: "NOW", linkName: "site", url: "https://now.com", country: "США" },
 *   ...
 * ]
 *
 * Кожне посилання бренду = окремий елемент масиву.
 */

import { MAIN_SPREADSHEET_ID } from '../../config/spreadsheet-config.js';

let linksData = [];
let countriesData = {};

export function getLinksData() { return linksData; }
export function getCountriesData() { return countriesData; }

/**
 * Безпечний парсинг JSON
 */
function safeJsonParse(value, defaultValue = null) {
    if (!value || typeof value !== 'string') return defaultValue;

    const trimmed = value.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            return JSON.parse(trimmed);
        } catch (e) {
            return defaultValue;
        }
    }

    return defaultValue;
}

/**
 * Завантажити дані посилань з Google Sheets
 */
export async function fetchLinksData() {
    const sheetId = MAIN_SPREADSHEET_ID;
    const sheetGid = '653695455'; // GID для Brands
    const csvUrlLinksBase = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${sheetGid}`;
    const csvUrlLinks = `${csvUrlLinksBase}&_=${Date.now()}`; // Anti-cache

    try {
        const response = await fetch(csvUrlLinks);
        if (!response.ok) throw new Error('Помилка завантаження CSV посилань');
        const csvText = await response.text();
        const parsedData = Papa.parse(csvText, { header: true, skipEmptyLines: true }).data;

        // Очищаємо масив
        linksData = [];
        countriesData = {};

        parsedData.forEach(row => {
            const brandName = (row.name_uk || '').trim();
            const country = (row.country_option_id || '').trim();

            if (!brandName) return;

            // Зберігаємо країну для бренду
            if (country) {
                countriesData[brandName.toLowerCase()] = country;
            }

            // Парсимо посилання
            // Спочатку перевіряємо нове поле brand_links (JSON)
            const brandLinksJson = row.brand_links;
            const brandLinks = safeJsonParse(brandLinksJson, null);

            if (Array.isArray(brandLinks) && brandLinks.length > 0) {
                // Нова структура: масив посилань
                brandLinks.forEach(link => {
                    if (link.url) {
                        linksData.push({
                            brand: brandName,
                            linkName: link.name || '',
                            url: link.url,
                            country: country
                        });
                    }
                });
            } else if (row.brand_site_link) {
                // Стара структура: одне посилання
                linksData.push({
                    brand: brandName,
                    linkName: 'site', // Дефолтна назва для старих даних
                    url: row.brand_site_link.trim(),
                    country: country
                });
            }
        });

        // Сортуємо по назві бренду
        linksData.sort((a, b) => a.brand.localeCompare(b.brand));

        if (linksData.length === 0) {
            console.warn('[gln-data] Список посилань порожній після обробки');
        } else {
            console.log(`[gln-data] Завантажено ${linksData.length} посилань`);
        }

    } catch (error) {
        console.error('Помилка при завантаженні даних Посилань:', error);
    }
}
