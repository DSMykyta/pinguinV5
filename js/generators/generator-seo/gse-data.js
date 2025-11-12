// js/generators/generator-seo/gse-data.js

let triggersData = [];
let brandsData = {};

/**
 * Конвертує масив масивів (з Google Sheets API) в CSV текст
 */
function convertValuesToCSV(values) {
    if (!values || !values.length) return '';

    return values.map(row =>
        row.map(cell => {
            // Екранування значень що містять коми або лапки
            const cellStr = String(cell || '');
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
        }).join(',')
    ).join('\n');
}

export function getTriggersData() {
    return triggersData;
}

export function getBrandsData() {
    return brandsData;
}

export async function fetchData() {
    const API_BASE = window.location.origin;
    const triggersRange = 'Тригери!A:C'; // Тригери: name_uk, trigers, keywords_ru
    const brandsRange = 'SEO!A:E'; // SEO: name_uk, name_ru, names_alt, country_option_id

    try {
        const [triggersResponse, brandsResponse] = await Promise.all([
            fetch(`${API_BASE}/api/sheets/public?range=${encodeURIComponent(triggersRange)}`),
            fetch(`${API_BASE}/api/sheets/public?range=${encodeURIComponent(brandsRange)}`)
        ]);

        if (!triggersResponse.ok || !brandsResponse.ok) {
            throw new Error('Помилка завантаження однієї з таблиць');
        }

        const [triggersJson, brandsJson] = await Promise.all([
            triggersResponse.json(),
            brandsResponse.json()
        ]);

        // Конвертуємо JSON values в CSV формат для PapaParse
        const triggersCsv = convertValuesToCSV(triggersJson.data.values);
        const brandsCsv = convertValuesToCSV(brandsJson.data.values);
        
        const parsedBrands = Papa.parse(brandsCsv, { header: true, skipEmptyLines: true }).data;
        
        console.log('[АНАЛІЗ ТАБЛИЦІ БРЕНДІВ]: Ось як виглядає перший рядок:', parsedBrands[0]);

        brandsData = parsedBrands.reduce((acc, row) => {
            // Збираємо ВСІ можливі назви бренду
            const nameUk = (row.name_uk || '').trim();
            const nameRu = (row.name_ru || '').trim();
            const namesAlt = (row.names_alt || '').split(',')
                                                .map(name => name.trim())
                                                .filter(Boolean); // Розбиваємо рядок alt_names на масив

            // Створюємо унікальний список всіх назв (без порожніх)
            const allNames = [...new Set([nameUk, nameRu, ...namesAlt])].filter(Boolean);

            // Визначаємо "головну" назву (ключ для об'єкта), пріоритет у name_ua
            const primaryName = (nameUk || nameRu || '').toLowerCase(); 

            if (primaryName && allNames.length > 0) {
                acc[primaryName] = {
                    country: row.country_option_id || '',
                    // Зберігаємо список ВСІХ назв для пошуку
                    searchNames: allNames 
                };
            }
            return acc;
        }, {});

        const parsedTriggers = Papa.parse(triggersCsv, { header: true, skipEmptyLines: true }).data;
        triggersData = parsedTriggers.map(row => ({
            title: row.name_uk ? row.name_uk.trim() : '',
            triggers: row.trigers ? row.trigers.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [],
            keywords: row.keywords_ru ? row.keywords_ru.split(',').map(k => k.trim()).filter(Boolean) : []
        })).filter(t => t.title);

        console.log('Дані для SEO (бренди і тригери) успішно завантажено.');

    } catch (error) {
        console.error("Помилка при завантаженні SEO-даних:", error);
    }
}