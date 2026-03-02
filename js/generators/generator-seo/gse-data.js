// js/generators/generator-seo/gse-data.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                     GENERATOR SEO - DATA                                ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Завантаження даних брендів та тригерів                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { MAIN_SPREADSHEET_ID } from '../../config/spreadsheet-config.js';

let triggersData = [];
let brandsData = {};

export function getTriggersData() {
    return triggersData;
}

export function getBrandsData() {
    return brandsData;
}

export async function fetchData() {
    const triggersSheetUrl = `https://docs.google.com/spreadsheets/d/${MAIN_SPREADSHEET_ID}/export?format=csv&gid=90240383`;
    const brandsSheetUrl = `https://docs.google.com/spreadsheets/d/${MAIN_SPREADSHEET_ID}/export?format=csv&gid=653695455`;

    try {
        const settled1 = await Promise.allSettled([
            fetch(triggersSheetUrl),
            fetch(brandsSheetUrl)
        ]);
        const [triggersResponse, brandsResponse] = settled1.map(r => {
            if (r.status === 'fulfilled') return r.value;
            throw r.reason;
        });

        if (!triggersResponse.ok || !brandsResponse.ok) {
            throw new Error('Помилка завантаження однієї з CSV таблиць');
        }

        const settled2 = await Promise.allSettled([
            triggersResponse.text(),
            brandsResponse.text()
        ]);
        const [triggersCsv, brandsCsv] = settled2.map(r => {
            if (r.status === 'fulfilled') return r.value;
            throw r.reason;
        });

        const parsedBrands = Papa.parse(brandsCsv, { header: true, skipEmptyLines: true }).data;

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
            keywords: row.keywords_ru ? row.keywords_ru.split(',').map(k => k.trim()).filter(Boolean) : [],
            keywords_ua: row.keywords_ua ? row.keywords_ua.split(',').map(k => k.trim()).filter(Boolean) : []
        })).filter(t => t.title);

    } catch (error) {
        // Помилка завантаження SEO-даних - тихо ігноруємо
    }
}
