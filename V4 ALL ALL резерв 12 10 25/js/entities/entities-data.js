// js/entities/entities-data.js
// Робота з Google Sheets API для сутностей

const SPREADSHEET_ID = '1iFOCQUbisLprSfIkfCar3Oc5f8JW12kA0dpHzjEXSsk';

// Назви аркушів
const SHEET_NAMES = {
    CATEGORIES: 'Categories',
    CHARACTERISTICS: 'Characteristics',
    OPTIONS: 'Options',
    BRANDS: 'Brands',
    MARKETPLACES: 'Marketplaces',
    MP_COLUMNS_META: 'MP_Columns_Meta'
};

// Кеш для даних
let dataCache = {
    categories: null,
    characteristics: null,
    options: null,
    brands: null,
    marketplaces: null,
    mpColumnsMeta: null, // Метадані колонок маркетплейсів
    marketplaceData: {}  // Дані з MP_* листів
};

/**
 * Завантажити всі дані з Google Sheets
 */
export async function loadAllEntitiesData() {
    console.log('📥 Завантаження даних з Google Sheets...');

    try {
        const ranges = [
            SHEET_NAMES.CATEGORIES,
            SHEET_NAMES.CHARACTERISTICS,
            SHEET_NAMES.OPTIONS,
            SHEET_NAMES.BRANDS,
            SHEET_NAMES.MARKETPLACES,
            SHEET_NAMES.MP_COLUMNS_META
        ];

        const response = await gapi.client.sheets.spreadsheets.values.batchGet({
            spreadsheetId: SPREADSHEET_ID,
            ranges: ranges
        });

        const valueRanges = response.result.valueRanges;

        // Парсимо дані
        dataCache.categories = parseSheetData(valueRanges[0].values);
        dataCache.characteristics = parseSheetData(valueRanges[1].values);
        dataCache.options = parseSheetData(valueRanges[2].values);
        dataCache.brands = parseSheetData(valueRanges[3].values);
        dataCache.marketplaces = parseSheetData(valueRanges[4].values);
        dataCache.mpColumnsMeta = parseSheetData(valueRanges[5].values);

        console.log('✅ Дані завантажені:', {
            categories: dataCache.categories.length,
            characteristics: dataCache.characteristics.length,
            options: dataCache.options.length,
            brands: dataCache.brands.length,
            marketplaces: dataCache.marketplaces.length,
            mpColumnsMeta: dataCache.mpColumnsMeta.length
        });

        // Додаткове логування для MP_Columns_Meta
        if (dataCache.mpColumnsMeta.length > 0) {
            console.log('📋 Перші 3 записи MP_Columns_Meta:', dataCache.mpColumnsMeta.slice(0, 3));
            console.log('📋 Ключі першого запису:', Object.keys(dataCache.mpColumnsMeta[0]));
        }

        // Завантажити дані з аркушів маркетплейсів
        await loadMarketplaceSheets();

        return dataCache;
    } catch (error) {
        console.error('❌ Помилка завантаження даних:', error);
        throw error;
    }
}

/**
 * Парсить дані з аркуша (перший рядок - заголовки)
 */
function parseSheetData(values) {
    if (!values || values.length === 0) return [];

    const headers = values[0];
    const rows = values.slice(1);

    return rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] || '';
        });
        return obj;
    });
}

/**
 * Завантажити дані з аркушів маркетплейсів (MP_*_Categories, MP_*_Characteristics, MP_*_Options)
 */
async function loadMarketplaceSheets() {
    if (!dataCache.marketplaces || dataCache.marketplaces.length === 0) {
        return;
    }

    console.log('📥 Завантаження даних маркетплейсів...');

    try {
        // Отримати метадані всіх аркушів
        const metadata = await getSheetMetadata();
        const allSheetNames = metadata.sheets.map(s => s.properties.title);

        // Знайти всі аркуші маркетплейсів
        const marketplaceSheetNames = allSheetNames.filter(name => name.startsWith('MP_'));

        if (marketplaceSheetNames.length === 0) {
            console.log('ℹ️ Немає аркушів маркетплейсів');
            return;
        }

        // Завантажити дані з усіх аркушів маркетплейсів
        const response = await gapi.client.sheets.spreadsheets.values.batchGet({
            spreadsheetId: SPREADSHEET_ID,
            ranges: marketplaceSheetNames
        });

        // Зберегти дані маркетплейсів у кеші
        dataCache.marketplaceData = {};
        response.result.valueRanges.forEach((valueRange, index) => {
            const sheetName = marketplaceSheetNames[index];
            const data = parseSheetData(valueRange.values);
            dataCache.marketplaceData[sheetName] = data;
        });

        console.log('✅ Дані маркетплейсів завантажені:', Object.keys(dataCache.marketplaceData));
    } catch (error) {
        console.error('❌ Помилка завантаження даних маркетплейсів:', error);
    }
}

/**
 * Отримати метадані таблиці (список всіх аркушів)
 */
export async function getSheetMetadata() {
    const response = await gapi.client.sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
        fields: 'sheets.properties'
    });
    return response.result;
}

/**
 * Отримати кешовані дані
 */
export function getCachedData(entityType) {
    return dataCache[entityType] || [];
}

/**
 * Отримати зведені дані для відображення (з JOIN маркетплейсів)
 */
export function getEnrichedData(entityType) {
    const baseData = getCachedData(entityType);
    if (!baseData || baseData.length === 0) return [];

    // Клонуємо дані, щоб не мутувати оригінал
    const enrichedData = baseData.map(item => ({ ...item }));

    // Resolve ID → names
    switch (entityType) {
        case 'categories':
            enrichedData.forEach(cat => {
                // Знайти батьківську категорію
                if (cat.parent_local_id) {
                    const parent = baseData.find(c => c.local_id === cat.parent_local_id);
                    cat.parent_name = parent ? parent.name_uk : cat.parent_local_id;
                } else {
                    cat.parent_name = '—';
                }
            });
            break;

        case 'characteristics':
            enrichedData.forEach(char => {
                // Resolve category_local_ids → category names
                if (char.category_local_ids) {
                    const catIds = char.category_local_ids.split(',').map(id => id.trim());
                    const categories = dataCache.categories || [];
                    const catNames = catIds.map(id => {
                        const cat = categories.find(c => c.local_id === id);
                        return cat ? cat.name_uk : id;
                    });
                    char.category_names = catNames.join(', ');
                } else {
                    char.category_names = '—';
                }

                // Resolve triggering_option_id → option name
                if (char.triggering_option_id) {
                    const options = dataCache.options || [];
                    const option = options.find(o => o.local_id === char.triggering_option_id);
                    char.triggering_option_name = option ? option.name_uk : char.triggering_option_id;
                }
            });
            break;

        case 'options':
            enrichedData.forEach(opt => {
                // Resolve char_local_id → characteristic name
                if (opt.char_local_id) {
                    const characteristics = dataCache.characteristics || [];
                    const char = characteristics.find(c => c.local_id === opt.char_local_id);
                    opt.char_name = char ? char.name_uk : opt.char_local_id;
                } else {
                    opt.char_name = '—';
                }
            });
            break;
    }

    // JOIN з даними маркетплейсів
    if (dataCache.marketplaceData) {
        enrichedData.forEach(item => {
            const localId = item.local_id || item.brand_id;
            if (!localId) return;

            // Шукаємо відповідні аркуші маркетплейсів
            Object.keys(dataCache.marketplaceData).forEach(sheetName => {
                // Визначити тип аркуша (MP_rozetka_Categories → Categories)
                const sheetType = sheetName.split('_').pop(); // 'Categories', 'Characteristics', etc.
                const entityTypeCapitalized = entityType.charAt(0).toUpperCase() + entityType.slice(1);

                if (sheetType === entityTypeCapitalized) {
                    const mpData = dataCache.marketplaceData[sheetName];
                    const mpRow = mpData.find(row => row.local_id === localId);

                    if (mpRow) {
                        // Додати всі колонки з маркетплейс-аркуша (крім local_id)
                        Object.keys(mpRow).forEach(key => {
                            if (key !== 'local_id') {
                                item[key] = mpRow[key];
                            }
                        });
                    }
                }
            });
        });
    }

    return enrichedData;
}

/**
 * Додати нову сутність
 */
export async function addEntity(entityType, data) {
    const sheetName = SHEET_NAMES[entityType.toUpperCase()] || entityType;

    try {
        // Отримати заголовки таблиці для правильного порядку колонок
        const headersResponse = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!1:1`
        });

        const headers = headersResponse.result.values[0];
        console.log(`📋 Заголовки таблиці ${sheetName}:`, headers);
        console.log(`📊 Дані для вставки:`, data);

        // Створити масив значень у правильному порядку згідно з заголовками
        const values = [headers.map(header => data[header] || '')];
        console.log(`✅ Відсортовані значення:`, values);

        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A:Z`,
            valueInputOption: 'USER_ENTERED',
            resource: { values }
        });

        console.log(`✅ ${entityType} додано`);

        // Оновити кеш
        await loadAllEntitiesData();

        return true;
    } catch (error) {
        console.error(`❌ Помилка додавання ${entityType}:`, error);
        throw error;
    }
}

/**
 * Оновити сутність
 */
export async function updateEntity(entityType, rowIndex, data) {
    const sheetName = SHEET_NAMES[entityType.toUpperCase()] || entityType;

    try {
        const values = [Object.values(data)];

        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values }
        });

        console.log(`✅ ${entityType} оновлено`);

        // Оновити кеш
        await loadAllEntitiesData();

        return true;
    } catch (error) {
        console.error(`❌ Помилка оновлення ${entityType}:`, error);
        throw error;
    }
}

/**
 * Видалити сутність
 */
export async function deleteEntity(entityType, rowIndex) {
    const sheetName = SHEET_NAMES[entityType.toUpperCase()] || entityType;

    try {
        // Отримати sheetId
        const metadata = await getSheetMetadata();
        const sheet = metadata.sheets.find(s => s.properties.title === sheetName);
        if (!sheet) throw new Error(`Sheet ${sheetName} not found`);

        const sheetId = sheet.properties.sheetId;

        // Видалити рядок
        await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex - 1,
                            endIndex: rowIndex
                        }
                    }
                }]
            }
        });

        console.log(`✅ ${entityType} видалено`);

        // Оновити кеш
        await loadAllEntitiesData();

        return true;
    } catch (error) {
        console.error(`❌ Помилка видалення ${entityType}:`, error);
        throw error;
    }
}

/**
 * Очистити кеш (для force reload)
 */
export function clearCache() {
    dataCache = {
        categories: null,
        characteristics: null,
        options: null,
        brands: null,
        marketplaces: null,
        mpColumnsMeta: null,
        marketplaceData: {}
    };
}

/**
 * Отримати метадані колонок для маркетплейсу та типу сутності
 * @param {string} mpId - ID маркетплейсу (напр. 'rozetka')
 * @param {string} entityType - Тип сутності: 'Categories', 'Characteristics', 'Options'
 * @returns {Array} Масив об'єктів метаданих колонок
 */
export function getMpColumns(mpId, entityType) {
    console.log(`🔍 getMpColumns викликано: mpId="${mpId}", entityType="${entityType}"`);

    if (!dataCache.mpColumnsMeta) {
        console.error('❌ dataCache.mpColumnsMeta є null або undefined!');
        return [];
    }

    console.log(`📊 dataCache.mpColumnsMeta має ${dataCache.mpColumnsMeta.length} записів`);
    console.log('📋 Перший запис для перевірки структури:', dataCache.mpColumnsMeta[0]);

    const filtered = dataCache.mpColumnsMeta.filter(meta => {
        const metaMpId = meta.marketplace_id || meta.mp_id;
        const metaEntityType = meta.entity_type;

        console.log(`  Перевіряємо запис:`, {
            metaMpId,
            metaEntityType,
            matches: metaMpId === mpId && metaEntityType === entityType,
            fullMeta: meta
        });

        return metaMpId === mpId && metaEntityType === entityType;
    });

    console.log(`✅ Відфільтровано ${filtered.length} записів`);
    return filtered;
}

/**
 * Отримати список маркетплейсів
 * @returns {Array} Масив маркетплейсів
 */
export function getMarketplaces() {
    return dataCache.marketplaces || [];
}
