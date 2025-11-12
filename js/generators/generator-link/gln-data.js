// js/generators/generator-link/gln-data.js
let linksData = [];
let countriesData = {};

export function getLinksData() { return linksData; }
export function getCountriesData() { return countriesData; }

export async function fetchLinksData() {
    const API_BASE = window.location.origin;
    const linksRange = 'SEO!A:E'; // name_uk, name_ru, names_alt, country_option_id, brand_site_link

    try {
        const response = await fetch(`${API_BASE}/api/sheets/public?range=${encodeURIComponent(linksRange)}&_=${Date.now()}`);
        if (!response.ok) throw new Error('Помилка завантаження даних посилань');

        const jsonData = await response.json();
        const values = jsonData.data.values;

        // Конвертуємо в CSV для PapaParse
        const csvText = values.map(row => row.join(',')).join('\n');
        const parsedData = Papa.parse(csvText, { header: true, skipEmptyLines: true }).data;

        console.log('[АНАЛІЗ ТАБЛИЦІ ПОСИЛАНЬ]: Ось як виглядає перший рядок:', parsedData[0]);

        // === ВИПРАВЛЕННЯ: Використовуємо ПРАВИЛЬНІ назви колонок ===
        linksData = parsedData
            .filter(row => row.name_uk && row.brand_site_link) // Фільтруємо за name_uk та brand_site_link
            .map(row => ({
                brand: row.name_uk.trim(),           // Беремо з name_uk
                link: row.brand_site_link.trim(), // Беремо з brand_site_link
                country: (row.country_option_id || '').trim() // Беремо з country_option_id
            }));
        // ========================================================

        // Перевіряємо, чи щось завантажилось
        if (linksData.length > 0) {
            console.log('[ПЕРЕВІРКА]: Перше оброблене посилання:', linksData[0]);
        } else {
            console.warn('[ПОПЕРЕДЖЕННЯ]: Список посилань порожній після обробки!');
        }


        // Створюємо об'єкт країн (використовуємо вже оброблені linksData)
        countriesData = linksData.reduce((acc, row) => {
            const brandLower = row.brand.toLowerCase();
            if (brandLower && row.country && !acc[brandLower]) {
                acc[brandLower] = row.country;
            }
            return acc;
        }, {});

        console.log('Дані для Посилань завантажено та оброблено.');

    } catch (error) {
        console.error('Помилка при завантаженні даних Посилань:', error);
    }
}