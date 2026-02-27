// js/generators/generator-magic/gm-merge.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAGIC LEGO - MERGE PLUGIN                             ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Склейка осиротілих значень                                  ║
 * ║                                                                          ║
 * ║  ФУНКЦІЇ:                                                                ║
 * ║  - mergeOrphanValues(lines) — Склеїти осиротілі значення                 ║
 * ║  - isOrphanValue(line) — Чи рядок є осиротілим значенням                 ║
 * ║  - hasValue(line) — Чи рядок має значення                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { markPluginLoaded } from './gm-state.js';

export const PLUGIN_NAME = 'gm-merge';

// ============================================================================
// ІНІЦІАЛІЗАЦІЯ
// ============================================================================

export function init() {
    markPluginLoaded(PLUGIN_NAME);
}

// ============================================================================
// ПАТЕРНИ
// ============================================================================

const UNITS_PATTERN = '(?:г|мг|мкг|ml|g|mg|mcg|iu|ме|IU|МЕ|cfu|КУО)';
const MULTIPLIERS_PATTERN = '(?:billion|million|bil|mil|тыс|тис|млн|млрд)?';

const VALUE_ONLY_REGEX = new RegExp(
    `^[<>]?\\s*[\\d,.]+\\s*${MULTIPLIERS_PATTERN}\\s*${UNITS_PATTERN}$`,
    'i'
);

const HAS_VALUE_REGEX = /\d+\s*(?:г|мг|мкг|mg|mcg|g|iu|ме)/i;

// ============================================================================
// ФУНКЦІЇ
// ============================================================================

export function mergeOrphanValues(lines) {
    if (!Array.isArray(lines)) return [];

    const result = [...lines];

    for (let i = result.length - 1; i > 0; i--) {
        const currentLine = result[i];
        const prevLine = result[i - 1];

        if (VALUE_ONLY_REGEX.test(currentLine)) {
            if (prevLine && !HAS_VALUE_REGEX.test(prevLine)) {
                result[i - 1] = prevLine + ' ' + currentLine;
                result.splice(i, 1);
            }
        }
    }

    return result;
}

export function isOrphanValue(line) {
    return VALUE_ONLY_REGEX.test(line);
}

export function hasValue(line) {
    return HAS_VALUE_REGEX.test(line);
}
