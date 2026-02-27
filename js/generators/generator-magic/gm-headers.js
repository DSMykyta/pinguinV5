// js/generators/generator-magic/gm-headers.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAGIC LEGO - HEADERS PLUGIN                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Обробка спеціальних заголовків                              ║
 * ║                                                                          ║
 * ║  ФУНКЦІЇ:                                                                ║
 * ║  - processHeaders(entries, servingSize) — Обробити заголовки             ║
 * ║  - isHeaderLine(text) — Чи рядок є заголовком                            ║
 * ║  - isSameHeader(h1, h2) — Чи заголовки однакові                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { markPluginLoaded } from './gm-state.js';
import { isServingLine } from './gm-serving.js';

export const PLUGIN_NAME = 'gm-headers';

// ============================================================================
// ІНІЦІАЛІЗАЦІЯ
// ============================================================================

export function init() {
    markPluginLoaded(PLUGIN_NAME);
}

// ============================================================================
// ПАТЕРНИ
// ============================================================================

export const HEADER_PATTERNS = {
    nutrition: /^(пищевая ценность|харчова цінність)$/i,
    ingredients: /^(ингредиенты|інгредієнти|другие ингредиенты|інші інгредієнти):?$/i,
    composition: /^(состав|склад):?$/i,
};

// ============================================================================
// ФУНКЦІЇ
// ============================================================================

export function isHeaderLine(text) {
    if (!text) return false;
    const trimmed = text.trim();
    return HEADER_PATTERNS.ingredients.test(trimmed) ||
           HEADER_PATTERNS.composition.test(trimmed) ||
           HEADER_PATTERNS.nutrition.test(trimmed);
}

export function isSameHeader(header1, header2) {
    const h1 = (header1 || '').toLowerCase().trim();
    const h2 = (header2 || '').toLowerCase().trim();

    if (h1 === h2) return true;

    const synonyms = [
        ['пищевая ценность', 'харчова цінність'],
        ['ингредиенты', 'інгредієнти'],
        ['другие ингредиенты', 'інші інгредієнти'],
        ['состав', 'склад']
    ];

    return synonyms.some(group => group.includes(h1) && group.includes(h2));
}

export function processHeaders(entries, servingSize = '') {
    const result = [];

    const hasNutritionHeader = entries.some(e =>
        HEADER_PATTERNS.nutrition.test((e.left || '').trim())
    );

    if (servingSize && !hasNutritionHeader) {
        result.push({
            left: 'Пищевая ценность',
            right: servingSize,
            isHeader: true
        });
    }

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const nextEntry = entries[i + 1];
        const leftTrimmed = (entry.left || '').trim();

        // ПИЩЕВАЯ ЦЕННОСТЬ
        if (HEADER_PATTERNS.nutrition.test(leftTrimmed)) {
            let rightValue = entry.right || servingSize || '';

            if (!rightValue && nextEntry && isServingLine(nextEntry.left)) {
                rightValue = nextEntry.left + (nextEntry.right ? ' ' + nextEntry.right : '');
                i++;
            }

            result.push({
                left: entry.left,
                right: rightValue,
                isHeader: true
            });
        }
        // ИНГРЕДИЕНТЫ
        else if (HEADER_PATTERNS.ingredients.test(leftTrimmed)) {
            result.push({ left: '', right: '', isSeparator: true });

            const normalizedHeader = /другие|інші/i.test(leftTrimmed) ? 'Ингредиенты' : entry.left.replace(/:$/, '');
            result.push({
                left: normalizedHeader,
                right: '',
                isHeader: true,
                isSingle: true
            });

            if (nextEntry && !isHeaderLine(nextEntry.left)) {
                const hasValue = /\d+\s*(г|мг|мкг|mg|mcg|g|iu|ме)/i.test(nextEntry.right || '');
                if (!hasValue) {
                    result.push({
                        left: nextEntry.left,
                        right: nextEntry.right || '',
                        isSingle: true,
                        isField: true
                    });
                    i++;
                }
            }
        }
        // СОСТАВ
        else if (HEADER_PATTERNS.composition.test(leftTrimmed)) {
            result.push({ left: '', right: '', isSeparator: true });

            result.push({
                left: entry.left.replace(/:$/, ''),
                right: entry.right || '',
                isSingle: true,
                isBold: true
            });
        }
        // ЗВИЧАЙНИЙ РЯДОК
        else {
            result.push(entry);
        }
    }

    return result;
}
