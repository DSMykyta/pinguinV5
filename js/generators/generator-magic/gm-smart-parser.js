// js/generators/generator-magic/gm-smart-parser.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAGIC LEGO - SMART PARSER PLUGIN                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Розумний парсинг значень з етикеток добавок                 ║
 * ║                                                                          ║
 * ║  ОБРОБЛЯЄ:                                                               ║
 * ║  - Модифікатори (RAE, DFE, NE, АТЕ)                                      ║
 * ║  - Альтернативні значення (50 мкг (2000 IU))                             ║
 * ║  - Ферментні співвідношення (2500 HUT/400 мг)                            ║
 * ║  - Пробіотики (10 billion CFU)                                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { markPluginLoaded } from './gm-state.js';

export const PLUGIN_NAME = 'gm-smart-parser';

// ============================================================================
// ІНІЦІАЛІЗАЦІЯ
// ============================================================================

export function init() {
    markPluginLoaded(PLUGIN_NAME);
}

// ============================================================================
// ОДИНИЦІ
// ============================================================================

const MASS_UNITS = ['г', 'мг', 'мкг', 'кг', 'g', 'mg', 'mcg', 'kg', 'µg'];
const VOLUME_UNITS = ['мл', 'л', 'ml', 'l', 'fl oz', 'oz'];
const ENERGY_UNITS = ['ккал', 'кдж', 'kcal', 'kJ', 'cal'];
const INTERNATIONAL_UNITS = ['IU', 'МЕ', 'iu', 'ме', 'UI'];

const ENZYME_UNITS = [
    'HUT', 'GDU', 'TU', 'FIP', 'LACU', 'GALU', 'ALU', 'SKB', 'DU', 'LU',
    'HCU', 'PU', 'FCC', 'SAU', 'AGU', 'CU', 'SU', 'XU', 'AJDU', 'DP',
    'USP', 'FCCPU', 'FCCLU', 'PC', 'endo-PGU', 'MU', 'INVU', 'AGS', 'SPU',
];

const PROBIOTIC_UNITS = ['CFU', 'КУО', 'cfu'];
const MULTIPLIERS = ['billion', 'million', 'bil', 'mil', 'млрд', 'млн', 'тыс', 'тис', 'trillion', 'трлн'];

const UNIT_MODIFIERS = [
    'RAE', 'RE', 'DFE', 'NE', 'ATE', 'АТЕ', 'TE', 'mcg DFE', 'мкг DFE',
];

const ALL_UNITS = [
    ...MASS_UNITS, ...VOLUME_UNITS, ...ENERGY_UNITS,
    ...INTERNATIONAL_UNITS, ...ENZYME_UNITS, ...PROBIOTIC_UNITS
];

// ============================================================================
// ГОЛОВНА ФУНКЦІЯ
// ============================================================================

export function smartParseLine(line) {
    if (!line || typeof line !== 'string') {
        return { left: '', right: '' };
    }

    const trimmed = line.trim();
    if (!trimmed) {
        return { left: '', right: '' };
    }

    const strategies = [
        parseEnzymeRatio,
        parseWithModifier,
        parseWithAltValue,
        parseProbiotic,
        parseCaloriesDualUnit,
        parseStandard,
        parseCaloriesNoUnit,
    ];

    for (const strategy of strategies) {
        const result = strategy(trimmed);
        if (result && result.right) {
            return result;
        }
    }

    return { left: trimmed, right: '' };
}

// ============================================================================
// СТРАТЕГІЇ ПАРСИНГУ
// ============================================================================

function parseEnzymeRatio(line) {
    const enzymeUnitsPattern = ENZYME_UNITS.join('|');
    const massUnitsPattern = MASS_UNITS.join('|');

    const regex = new RegExp(
        `^(.+?)\\s+` +
        `(\\d+[\\d,.]*\\s*(?:${enzymeUnitsPattern})\\s*/\\s*\\d+[\\d,.]*\\s*(?:${massUnitsPattern}))\\s*$`,
        'i'
    );

    const match = line.match(regex);
    return match ? { left: match[1].trim(), right: match[2].trim() } : null;
}

function parseWithModifier(line) {
    const massUnitsPattern = MASS_UNITS.join('|');
    const modifiersPattern = UNIT_MODIFIERS.join('|');

    const regex = new RegExp(
        `^(.+?)\\s+(\\d+[\\d,.]*\\s*(?:${massUnitsPattern})\\s+(?:${modifiersPattern}))\\s*$`,
        'i'
    );

    const match = line.match(regex);
    return match ? { left: match[1].trim(), right: match[2].trim() } : null;
}

function parseWithAltValue(line) {
    const unitsPattern = ALL_UNITS.join('|');

    const regex = new RegExp(
        `^(.+?)\\s+(\\d+[\\d,.]*\\s*(?:${unitsPattern})\\s*\\(\\s*\\d+[\\d,.]*\\s*(?:${unitsPattern})\\s*\\))\\s*$`,
        'i'
    );

    const match = line.match(regex);
    return match ? { left: match[1].trim(), right: match[2].trim() } : null;
}

function parseProbiotic(line) {
    const multipliersPattern = MULTIPLIERS.join('|');
    const probioticUnitsPattern = PROBIOTIC_UNITS.join('|');

    const regex = new RegExp(
        `^(.+?)\\s+(\\d+[\\d,.]*\\s*(?:${multipliersPattern})\\s*(?:${probioticUnitsPattern}))\\s*$`,
        'i'
    );

    const match = line.match(regex);
    return match ? { left: match[1].trim(), right: match[2].trim() } : null;
}

function parseCaloriesDualUnit(line) {
    const regex = /^(калории|калорії|калорий|calories?|energy|энергия|енергія)\s+(\d+[\d,.]*\s*(?:ккал|kcal|cal)\s*\/\s*\d+[\d,.]*\s*(?:кдж|kj))$/i;

    const match = line.match(regex);
    return match ? { left: match[1].trim(), right: match[2].trim() } : null;
}

function parseCaloriesNoUnit(line) {
    const regex = /^(калории|калорії|калорий|calories?|energy|kcal|энергия|енергія)\s+(\d+[\d,.]*)$/i;

    const match = line.match(regex);
    return match ? { left: match[1].trim(), right: match[2].trim() + ' ккал' } : null;
}

function parseStandard(line) {
    const unitsPattern = [...ALL_UNITS, ...ENZYME_UNITS].join('|');

    const regex = new RegExp(
        `^(.+?)\\s+([<>]?\\s*\\d+[\\d,.]*\\s*(?:${unitsPattern}))(?:\\s+[<>]?\\d+[\\d,.]*%)?\\s*$`,
        'i'
    );

    const match = line.match(regex);
    return match ? { left: match[1].trim(), right: match[2].trim() } : null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const UNITS = {
    MASS: MASS_UNITS,
    VOLUME: VOLUME_UNITS,
    ENERGY: ENERGY_UNITS,
    INTERNATIONAL: INTERNATIONAL_UNITS,
    ENZYME: ENZYME_UNITS,
    PROBIOTIC: PROBIOTIC_UNITS,
    MULTIPLIERS,
    MODIFIERS: UNIT_MODIFIERS,
    ALL: ALL_UNITS,
};
