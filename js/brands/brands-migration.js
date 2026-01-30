// js/brands/brands-migration.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS - DATA MIGRATION SCRIPT                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Скрипт для міграції даних брендів з старого формату в новий JSON формат.
 *
 * СТАРИЙ ФОРМАТ:
 * - names_alt: "AllNutrition" або "AllNutrition, allnutrition"
 * - brand_links: "https://example.com/" (просто URL)
 *
 * НОВИЙ ФОРМАТ:
 * - names_alt: ["AllNutrition"] або ["AllNutrition", "allnutrition"]
 * - brand_links: [{"name":"site","url":"https://example.com/"}]
 *
 * ВИКОРИСТАННЯ:
 * 1. Відкрийте brands.html
 * 2. Відкрийте консоль браузера (F12)
 * 3. Виконайте: await migrateBrandsData()
 */

import { brandsState } from './brands-state.js';
import { callSheetsAPI } from '../services/api-sheets.js';

const SHEET_NAME = 'Brands';

/**
 * Конвертувати старий формат names_alt в JSON масив
 * @param {string|Array} value - Значення з таблиці
 * @returns {string} JSON рядок
 */
function convertNamesAlt(value) {
    // Якщо вже масив або JSON - повернути як є
    if (Array.isArray(value)) {
        return JSON.stringify(value);
    }

    if (!value || typeof value !== 'string') {
        return '[]';
    }

    // Спробувати парсити як JSON
    const trimmed = value.trim();
    if (trimmed.startsWith('[')) {
        try {
            JSON.parse(trimmed);
            return trimmed; // Вже валідний JSON
        } catch (e) {
            // Не валідний JSON, обробити як текст
        }
    }

    // Розділити по комі або пробілу
    const names = trimmed
        .split(/[,\s]+/)
        .map(n => n.trim())
        .filter(n => n.length > 0);

    return JSON.stringify(names);
}

/**
 * Конвертувати старий формат brand_links в JSON масив
 * @param {string|Array} value - Значення з таблиці
 * @returns {string} JSON рядок
 */
function convertBrandLinks(value) {
    // Якщо вже масив - повернути як JSON
    if (Array.isArray(value)) {
        return JSON.stringify(value);
    }

    if (!value || typeof value !== 'string') {
        return '[]';
    }

    const trimmed = value.trim();

    // Спробувати парсити як JSON
    if (trimmed.startsWith('[')) {
        try {
            JSON.parse(trimmed);
            return trimmed; // Вже валідний JSON
        } catch (e) {
            // Не валідний JSON, обробити як URL
        }
    }

    // Якщо це просто URL
    if (trimmed.startsWith('http')) {
        // Визначити name на основі домену
        const name = extractLinkName(trimmed);
        return JSON.stringify([{ name, url: trimmed }]);
    }

    // Пустий масив якщо нічого не підійшло
    return '[]';
}

/**
 * Витягнути назву посилання з URL
 * @param {string} url - URL
 * @returns {string} Назва
 */
function extractLinkName(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        // Визначити тип посилання
        if (hostname.includes('drive.google')) return 'drive';
        if (hostname.includes('pinterest')) return 'pinterest';
        if (hostname.includes('amazon')) return 'amazon';
        if (hostname.includes('.ua') || hostname.includes('ukraine')) return 'ua';
        if (hostname.includes('.de') || hostname.includes('german')) return 'de';
        if (hostname.includes('.pl') || hostname.includes('poland')) return 'pl';
        if (hostname.includes('.uk') || hostname.includes('british')) return 'uk';
        if (hostname.includes('.ru')) return 'ru';

        return 'site'; // За замовчуванням
    } catch (e) {
        return 'site';
    }
}

/**
 * Перевірити чи потрібна міграція для рядка
 * @param {Object} brand - Об'єкт бренду
 * @returns {boolean} Чи потрібна міграція
 */
function needsMigration(brand) {
    // Перевірити names_alt
    if (brand.names_alt && typeof brand.names_alt === 'string' && !brand.names_alt.startsWith('[')) {
        return true;
    }

    // Перевірити brand_links
    if (brand.brand_links && typeof brand.brand_links === 'string' && !brand.brand_links.startsWith('[')) {
        return true;
    }

    return false;
}

/**
 * Підготувати рядок для оновлення
 * @param {Object} brand - Об'єкт бренду з raw даними
 * @returns {Array} Масив значень для рядка
 */
function prepareMigratedRow(brand) {
    return [
        brand.brand_id || '',                           // A
        brand.name_uk || '',                            // B
        convertNamesAlt(brand.names_alt_raw),           // C
        brand.country_option_id || '',                  // D
        brand.brand_text || '',                         // E
        brand.brand_status || 'active',                 // F
        convertBrandLinks(brand.brand_links_raw),       // G
        brand.mapper_option_id || '',                   // H
        brand.brand_logo_url || ''                      // I
    ];
}

/**
 * Головна функція міграції
 * @returns {Promise<Object>} Результат міграції
 */
export async function migrateBrandsData() {
    console.log('🔄 Початок міграції даних брендів...');

    const results = {
        total: 0,
        migrated: 0,
        skipped: 0,
        errors: []
    };

    try {
        // Завантажити сирі дані з таблиці
        const response = await callSheetsAPI('get', {
            range: `${SHEET_NAME}!A:I`,
            spreadsheetType: 'main'
        });

        const rows = response.values || [];
        if (rows.length <= 1) {
            console.log('⚠️ Таблиця порожня або містить тільки заголовки');
            return results;
        }

        // Пропустити заголовок
        const dataRows = rows.slice(1);
        results.total = dataRows.length;

        console.log(`📊 Знайдено ${results.total} брендів`);

        // Аналіз та підготовка оновлень
        const updates = [];

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const rowIndex = i + 2; // +2 бо пропустили заголовок і індекс з 1

            const brand = {
                brand_id: row[0] || '',
                name_uk: row[1] || '',
                names_alt_raw: row[2] || '',
                country_option_id: row[3] || '',
                brand_text: row[4] || '',
                brand_status: row[5] || 'active',
                brand_links_raw: row[6] || '',
                mapper_option_id: row[7] || '',
                brand_logo_url: row[8] || '',
                _rowIndex: rowIndex
            };

            // Перевірити чи потрібна міграція
            const namesAltNeedsMigration = brand.names_alt_raw &&
                typeof brand.names_alt_raw === 'string' &&
                !brand.names_alt_raw.trim().startsWith('[') &&
                brand.names_alt_raw.trim().length > 0;

            const linksNeedsMigration = brand.brand_links_raw &&
                typeof brand.brand_links_raw === 'string' &&
                !brand.brand_links_raw.trim().startsWith('[') &&
                brand.brand_links_raw.trim().length > 0;

            if (namesAltNeedsMigration || linksNeedsMigration) {
                const migratedRow = prepareMigratedRow(brand);
                updates.push({
                    rowIndex,
                    brand_id: brand.brand_id,
                    name_uk: brand.name_uk,
                    oldNamesAlt: brand.names_alt_raw,
                    newNamesAlt: migratedRow[2],
                    oldLinks: brand.brand_links_raw,
                    newLinks: migratedRow[6],
                    values: migratedRow
                });
            } else {
                results.skipped++;
            }
        }

        console.log(`📝 Потребують міграції: ${updates.length} брендів`);
        console.log(`⏭️ Пропущено (вже в новому форматі): ${results.skipped}`);

        if (updates.length === 0) {
            console.log('✅ Всі дані вже в новому форматі!');
            return results;
        }

        // Показати превью змін
        console.log('\n📋 Превью змін (перші 10):');
        updates.slice(0, 10).forEach(u => {
            console.log(`  ${u.brand_id} | ${u.name_uk}`);
            if (u.oldNamesAlt !== u.newNamesAlt) {
                console.log(`    names_alt: "${u.oldNamesAlt}" → ${u.newNamesAlt}`);
            }
            if (u.oldLinks !== u.newLinks) {
                console.log(`    brand_links: "${u.oldLinks}" → ${u.newLinks}`);
            }
        });

        // Запитати підтвердження
        const confirmed = confirm(`Мігрувати ${updates.length} брендів? Це оновить дані в Google Sheets.`);

        if (!confirmed) {
            console.log('❌ Міграцію скасовано');
            return results;
        }

        // Виконати оновлення batch-ами по 50
        const BATCH_SIZE = 50;

        for (let i = 0; i < updates.length; i += BATCH_SIZE) {
            const batch = updates.slice(i, i + BATCH_SIZE);

            console.log(`📤 Оновлення batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(updates.length / BATCH_SIZE)}...`);

            // Оновити кожен рядок в batch
            for (const update of batch) {
                try {
                    await callSheetsAPI('update', {
                        range: `${SHEET_NAME}!A${update.rowIndex}:I${update.rowIndex}`,
                        values: [update.values],
                        spreadsheetType: 'main'
                    });
                    results.migrated++;
                } catch (error) {
                    console.error(`❌ Помилка оновлення ${update.brand_id}:`, error);
                    results.errors.push({ brand_id: update.brand_id, error: error.message });
                }
            }

            // Пауза між batch-ами щоб не перевищити rate limit
            if (i + BATCH_SIZE < updates.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log('\n✅ Міграція завершена!');
        console.log(`   Мігровано: ${results.migrated}`);
        console.log(`   Пропущено: ${results.skipped}`);
        console.log(`   Помилок: ${results.errors.length}`);

        if (results.errors.length > 0) {
            console.log('   Помилки:', results.errors);
        }

        return results;

    } catch (error) {
        console.error('❌ Критична помилка міграції:', error);
        results.errors.push({ brand_id: 'GLOBAL', error: error.message });
        return results;
    }
}

/**
 * Тестова функція - показати що буде мігровано без реального оновлення
 */
export async function previewMigration() {
    console.log('🔍 Превью міграції (без змін)...');

    try {
        const response = await callSheetsAPI('get', {
            range: `${SHEET_NAME}!A:I`,
            spreadsheetType: 'main'
        });

        const rows = response.values || [];
        if (rows.length <= 1) {
            console.log('⚠️ Таблиця порожня');
            return;
        }

        const dataRows = rows.slice(1);
        let needsMigrationCount = 0;

        console.log('\n📋 Бренди що потребують міграції:\n');

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const brand_id = row[0] || '';
            const name_uk = row[1] || '';
            const names_alt_raw = row[2] || '';
            const brand_links_raw = row[6] || '';

            const namesAltNeedsMigration = names_alt_raw &&
                !names_alt_raw.trim().startsWith('[') &&
                names_alt_raw.trim().length > 0;

            const linksNeedsMigration = brand_links_raw &&
                !brand_links_raw.trim().startsWith('[') &&
                brand_links_raw.trim().length > 0;

            if (namesAltNeedsMigration || linksNeedsMigration) {
                needsMigrationCount++;
                console.log(`${brand_id} | ${name_uk}`);

                if (namesAltNeedsMigration) {
                    console.log(`  names_alt: "${names_alt_raw}" → ${convertNamesAlt(names_alt_raw)}`);
                }
                if (linksNeedsMigration) {
                    console.log(`  brand_links: "${brand_links_raw.substring(0, 50)}..." → ${convertBrandLinks(brand_links_raw)}`);
                }
                console.log('');
            }
        }

        console.log(`\n📊 Всього потребують міграції: ${needsMigrationCount} з ${dataRows.length}`);

    } catch (error) {
        console.error('❌ Помилка:', error);
    }
}

// Експорт в глобальний scope для використання в консолі
if (typeof window !== 'undefined') {
    window.migrateBrandsData = migrateBrandsData;
    window.previewMigration = previewMigration;
    console.log('[Brands Migration] Скрипт завантажено. Використовуйте:');
    console.log('  - previewMigration() - превью змін');
    console.log('  - migrateBrandsData() - виконати міграцію');
}
