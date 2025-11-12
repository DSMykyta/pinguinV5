// js/generators/generator-link/gln-data.js
let linksData = [];
let countriesData = {};

export function getLinksData() { return linksData; }
export function getCountriesData() { return countriesData; }

export async function fetchLinksData() {
    // === ВИКОРИСТОВУЄМО ПРАВИЛЬНИЙ GID для таблиці брендів ===
    const sheetId = '1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk';
    const sheetGid = '653695455'; // GID для Brands
    const csvUrlLinksBase = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${sheetGid}`;
    // =======================================================

    const csvUrlLinks = `${csvUrlLinksBase}&_=${Date.now()}`; // Додаємо параметр проти кешу

    try {
        const response = await fetch(csvUrlLinks);
        if (!response.ok) throw new Error('Помилка завантаження CSV посилань');
        const csvText = await response.text();
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