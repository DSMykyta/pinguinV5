// js/generators/generator-table/gt-magic-merge.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    GT-MAGIC-MERGE v1.0                                   ║
 * ║              Склейка осиротілих значень                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Коли значення опиняється на окремому рядку від назви,
 * цей плагін склеює їх назад.
 *
 * ПРИКЛАД:
 * Вхід:                    Вихід:
 * ["Вітамін D",            ["Вітамін D 10 мкг",
 *  "10 мкг",        →       "Вітамін C 500 мг"]
 *  "Вітамін C 500 мг"]
 *
 * ЕКСПОРТ:
 * - mergeOrphanValues(lines) - склеїти осиротілі значення
 */

// ============================================================================
// КОНСТАНТИ
// ============================================================================

/** Одиниці для визначення "осиротілого" значення */
const UNITS_PATTERN = '(?:г|мг|мкг|ml|g|mg|mcg|iu|ме|IU|МЕ|cfu|КУО)';
const MULTIPLIERS_PATTERN = '(?:billion|million|bil|mil|тыс|тис|млн|млрд)?';

/** Regex для рядка що містить ТІЛЬКИ значення */
const VALUE_ONLY_REGEX = new RegExp(
    `^[<>]?\\s*[\\d,.]+\\s*${MULTIPLIERS_PATTERN}\\s*${UNITS_PATTERN}$`,
    'i'
);

/** Regex для перевірки чи рядок вже має значення */
const HAS_VALUE_REGEX = /\d+\s*(?:г|мг|мкг|mg|mcg|g|iu|ме)/i;

// ============================================================================
// ГОЛОВНА ФУНКЦІЯ
// ============================================================================

/**
 * Склеює осиротілі значення з попередніми рядками
 *
 * @param {string[]} lines - Масив рядків
 * @returns {string[]} - Масив з склеєними рядками
 *
 * @example
 * mergeOrphanValues(["Вітамін D", "10 мкг", "Білок 25 г"])
 * // → ["Вітамін D 10 мкг", "Білок 25 г"]
 */
export function mergeOrphanValues(lines) {
    if (!Array.isArray(lines)) return [];

    const result = [...lines];

    // Йдемо з кінця, щоб індекси не зсувались
    for (let i = result.length - 1; i > 0; i--) {
        const currentLine = result[i];
        const prevLine = result[i - 1];

        // Якщо поточний рядок - це тільки значення
        if (VALUE_ONLY_REGEX.test(currentLine)) {
            // Склеюємо ТІЛЬКИ з безпосередньо попереднім рядком
            // якщо він не має значення (безпечніше, ніж шукати далі)
            if (prevLine && !HAS_VALUE_REGEX.test(prevLine)) {
                result[i - 1] = prevLine + ' ' + currentLine;
                result.splice(i, 1);
            }
            // Якщо попередній вже має значення - залишаємо осиротіле як є
            // (можливо, це окремий запис)
        }
    }

    return result;
}

/**
 * Перевіряє чи рядок є осиротілим значенням
 * @param {string} line - Рядок для перевірки
 * @returns {boolean}
 */
export function isOrphanValue(line) {
    return VALUE_ONLY_REGEX.test(line);
}

/**
 * Перевіряє чи рядок вже містить значення
 * @param {string} line - Рядок для перевірки
 * @returns {boolean}
 */
export function hasValue(line) {
    return HAS_VALUE_REGEX.test(line);
}
