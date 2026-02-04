// js/generators/generator-table/gt-smart-value-parser.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║         SMART VALUE PARSER - РОЗУМНИЙ ПАРСЕР ЗНАЧЕНЬ v1.0               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Інтелектуальний парсинг рядків з етикеток добавок (iHerb, тощо).
 * Правильно обробляє складні випадки:
 * - Модифікатори після одиниць (RAE, DFE, NE, АТЕ)
 * - Альтернативні значення в дужках (50 мкг (2000 IU))
 * - Ферментні співвідношення (2500 HUT/400 мг)
 * - Пробіотики (10 billion CFU)
 * - Форми речовин в дужках (як цитрат цинку)
 *
 * ВИКОРИСТАННЯ:
 * import { smartParseLine } from './gt-smart-value-parser.js';
 * const result = smartParseLine("Витамин А 900 мкг RAE");
 * // { left: "Витамин А", right: "900 мкг RAE" }
 */

// ============================================================================
// КОНФІГУРАЦІЯ ОДИНИЦЬ
// ============================================================================

/** Базові одиниці маси/об'єму */
const MASS_UNITS = ['г', 'мг', 'мкг', 'кг', 'g', 'mg', 'mcg', 'kg', 'µg'];

/** Одиниці об'єму */
const VOLUME_UNITS = ['мл', 'л', 'ml', 'l', 'fl oz', 'oz'];

/** Енергетичні одиниці */
const ENERGY_UNITS = ['ккал', 'кдж', 'kcal', 'kJ', 'cal'];

/** Міжнародні одиниці */
const INTERNATIONAL_UNITS = ['IU', 'МЕ', 'iu', 'ме', 'UI'];

/** Ферментні одиниці (FCC стандарт) */
const ENZYME_UNITS = [
    'HUT',   // Hemoglobin Unit Tyrosine base (протеази)
    'GDU',   // Gelatin Digesting Units (бромелаїн)
    'TU',    // Tyrosine Units (папаїн)
    'FIP',   // Federation Internationale Pharmaceutique (ліпаза)
    'LACU',  // Lactase Units
    'GALU',  // Galactosidase Units
    'ALU',   // Acid Lactase Units
    'SKB',   // (амілаза)
    'DU',    // Dextrinizing Units (амілаза)
    'LU',    // Lipase Units
    'HCU',   // Hemoglobin Coagulating Units
    'PU',    // Papain Units
    'FCC',   // Food Chemical Codex
    'SAU',   // Spectrophotometric Acid Units
    'AGU',   // Amyloglucosidase Units
    'CU',    // Cellulase Units
    'SU',    // Sumner Units
    'XU',    // Xylanase Units
    'AJDU',  // Apple Juice Depectinization Units
    'DP',    // Degrees of Diastatic Power
    'USP',   // US Pharmacopeia units
    'FCCPU', // FCC Papain Units
    'FCCLU', // FCC Lipase Units
    'PC',    // Protease Units
    'endo-PGU', // Endo-polygalacturonase Units
    'MU',    // Maltase Units
    'INVU',  // Invertase Units
    'AGS',   // Amyloglucosidase Sumner
    'SPU',   // Spectrophotometric Units
];

/** Пробіотичні одиниці */
const PROBIOTIC_UNITS = ['CFU', 'КУО', 'cfu'];

/** Множники для пробіотиків */
const MULTIPLIERS = ['billion', 'million', 'bil', 'mil', 'млрд', 'млн', 'тыс', 'тис', 'trillion', 'трлн'];

/** Модифікатори (йдуть ПІСЛЯ одиниці) */
const UNIT_MODIFIERS = [
    'RAE',   // Retinol Activity Equivalents (вітамін A)
    'RE',    // Retinol Equivalents (вітамін A)
    'DFE',   // Dietary Folate Equivalents (фолат)
    'NE',    // Niacin Equivalents (ніацин B3)
    'ATE',   // Alpha-Tocopherol Equivalents (вітамін E)
    'АТЕ',   // кирилиця
    'TE',    // Tocopherol Equivalents
    'mcg DFE', // комбінований
    'мкг DFE',
];

/** Всі одиниці разом */
const ALL_UNITS = [
    ...MASS_UNITS,
    ...VOLUME_UNITS,
    ...ENERGY_UNITS,
    ...INTERNATIONAL_UNITS,
    ...ENZYME_UNITS,
    ...PROBIOTIC_UNITS
];

// ============================================================================
// ГОЛОВНА ФУНКЦІЯ ПАРСИНГУ
// ============================================================================

/**
 * Розумний парсинг рядка на назву та значення
 * @param {string} line - Рядок для парсингу
 * @returns {{left: string, right: string}} - Назва та значення
 */
export function smartParseLine(line) {
    if (!line || typeof line !== 'string') {
        return { left: '', right: '' };
    }

    const trimmed = line.trim();
    if (!trimmed) {
        return { left: '', right: '' };
    }

    // Спробувати різні стратегії парсингу
    const strategies = [
        parseEnzymeRatio,      // "2500 HUT/400 мг"
        parseWithModifier,      // "900 мкг RAE"
        parseWithAltValue,      // "50 мкг (2000 IU)"
        parseProbiotic,         // "10 billion CFU"
        parseStandard,          // "500 мг"
        parseCaloriesNoUnit,    // "Калории 120" (без одиниці)
    ];

    for (const strategy of strategies) {
        const result = strategy(trimmed);
        if (result && result.right) {
            return result;
        }
    }

    // Нічого не знайдено - повертаємо як є
    return { left: trimmed, right: '' };
}

// ============================================================================
// СТРАТЕГІЇ ПАРСИНГУ
// ============================================================================

/**
 * Парсинг ферментних співвідношень: "2500 HUT/400 мг"
 */
function parseEnzymeRatio(line) {
    // Патерн: [назва] [число] [ферм.одиниця]/[число] [маса]
    const enzymeUnitsPattern = ENZYME_UNITS.join('|');
    const massUnitsPattern = MASS_UNITS.join('|');

    const regex = new RegExp(
        `^(.+?)\\s+` +                           // Назва (не жадібний)
        `(\\d+[\\d,.]*\\s*` +                    // Число
        `(?:${enzymeUnitsPattern})` +            // Ферментна одиниця
        `\\s*/\\s*` +                            // Слеш
        `\\d+[\\d,.]*\\s*` +                     // Друге число
        `(?:${massUnitsPattern}))` +             // Одиниця маси
        `\\s*$`,
        'i'
    );

    const match = line.match(regex);
    if (match) {
        return {
            left: match[1].trim(),
            right: match[2].trim()
        };
    }
    return null;
}

/**
 * Парсинг з модифікатором після одиниці: "900 мкг RAE"
 */
function parseWithModifier(line) {
    const massUnitsPattern = MASS_UNITS.join('|');
    const modifiersPattern = UNIT_MODIFIERS.join('|');

    const regex = new RegExp(
        `^(.+?)\\s+` +                           // Назва (не жадібний)
        `(\\d+[\\d,.]*\\s*` +                    // Число
        `(?:${massUnitsPattern})\\s+` +          // Одиниця маси
        `(?:${modifiersPattern}))` +             // Модифікатор
        `\\s*$`,
        'i'
    );

    const match = line.match(regex);
    if (match) {
        return {
            left: match[1].trim(),
            right: match[2].trim()
        };
    }
    return null;
}

/**
 * Парсинг з альтернативним значенням в дужках: "50 мкг (2000 IU)"
 */
function parseWithAltValue(line) {
    const unitsPattern = ALL_UNITS.join('|');

    // Патерн: [назва] [число] [одиниця] ([число] [одиниця])
    const regex = new RegExp(
        `^(.+?)\\s+` +                           // Назва (не жадібний)
        `(\\d+[\\d,.]*\\s*` +                    // Основне число
        `(?:${unitsPattern})\\s*` +              // Основна одиниця
        `\\(\\s*` +                              // Відкриваюча дужка
        `\\d+[\\d,.]*\\s*` +                     // Альт. число
        `(?:${unitsPattern})\\s*` +              // Альт. одиниця
        `\\))` +                                 // Закриваюча дужка
        `\\s*$`,
        'i'
    );

    const match = line.match(regex);
    if (match) {
        return {
            left: match[1].trim(),
            right: match[2].trim()
        };
    }
    return null;
}

/**
 * Парсинг пробіотиків: "10 billion CFU"
 */
function parseProbiotic(line) {
    const multipliersPattern = MULTIPLIERS.join('|');
    const probioticUnitsPattern = PROBIOTIC_UNITS.join('|');

    const regex = new RegExp(
        `^(.+?)\\s+` +                           // Назва (не жадібний)
        `(\\d+[\\d,.]*\\s*` +                    // Число
        `(?:${multipliersPattern})\\s*` +        // Множник
        `(?:${probioticUnitsPattern}))` +        // Пробіотична одиниця
        `\\s*$`,
        'i'
    );

    const match = line.match(regex);
    if (match) {
        return {
            left: match[1].trim(),
            right: match[2].trim()
        };
    }
    return null;
}

/**
 * Парсинг калорій без одиниці: "Калории 120" → "120 ккал"
 */
function parseCaloriesNoUnit(line) {
    // Патерн: Калорії/Calories/Energy + число (без одиниці)
    const regex = /^(калории|калорії|калорий|calories?|energy|kcal|энергия|енергія)\s+(\d+[\d,.]*)$/i;

    const match = line.match(regex);
    if (match) {
        return {
            left: match[1].trim(),
            right: match[2].trim() + ' ккал'  // Додаємо одиницю
        };
    }
    return null;
}

/**
 * Стандартний парсинг: "500 мг", "1000 мкг"
 */
function parseStandard(line) {
    const unitsPattern = [...ALL_UNITS, ...ENZYME_UNITS].join('|');

    // Патерн: [назва] [число] [одиниця] [можливий %]
    const regex = new RegExp(
        `^(.+?)\\s+` +                           // Назва (не жадібний)
        `([<>]?\\s*\\d+[\\d,.]*\\s*` +           // Число з можливим < >
        `(?:${unitsPattern}))` +                 // Одиниця
        `(?:\\s+[<>]?\\d+[\\d,.]*%)?` +          // Опційний відсоток
        `\\s*$`,
        'i'
    );

    const match = line.match(regex);
    if (match) {
        return {
            left: match[1].trim(),
            right: match[2].trim()
        };
    }
    return null;
}

// ============================================================================
// ЕКСПОРТ ДЛЯ ТЕСТУВАННЯ
// ============================================================================

export const _testExports = {
    ALL_UNITS,
    ENZYME_UNITS,
    UNIT_MODIFIERS,
    MULTIPLIERS,
    parseEnzymeRatio,
    parseWithModifier,
    parseWithAltValue,
    parseProbiotic,
    parseStandard,
    parseCaloriesNoUnit
};
