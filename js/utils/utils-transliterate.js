// js/utils/utils-transliterate.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    TRANSLITERATE — UA ↔ LATIN                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Транслітерація українського тексту за стандартом КМУ 2010 (паспортний) ║
 * ║  + зворотна транслітерація Latin → UA                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// КМУ 2010 — таблиця транслітерації
const UA_TO_LAT = {
    'А': 'A',   'а': 'a',
    'Б': 'B',   'б': 'b',
    'В': 'V',   'в': 'v',
    'Г': 'H',   'г': 'h',
    'Ґ': 'G',   'ґ': 'g',
    'Д': 'D',   'д': 'd',
    'Е': 'E',   'е': 'e',
    'Є': 'Ye',  'є': 'ie',
    'Ж': 'Zh',  'ж': 'zh',
    'З': 'Z',   'з': 'z',
    'И': 'Y',   'и': 'y',
    'І': 'I',   'і': 'i',
    'Ї': 'Yi',  'ї': 'i',
    'Й': 'Y',   'й': 'i',
    'К': 'K',   'к': 'k',
    'Л': 'L',   'л': 'l',
    'М': 'M',   'м': 'm',
    'Н': 'N',   'н': 'n',
    'О': 'O',   'о': 'o',
    'П': 'P',   'п': 'p',
    'Р': 'R',   'р': 'r',
    'С': 'S',   'с': 's',
    'Т': 'T',   'т': 't',
    'У': 'U',   'у': 'u',
    'Ф': 'F',   'ф': 'f',
    'Х': 'Kh',  'х': 'kh',
    'Ц': 'Ts',  'ц': 'ts',
    'Ч': 'Ch',  'ч': 'ch',
    'Ш': 'Sh',  'ш': 'sh',
    'Щ': 'Shch','щ': 'shch',
    'Ь': '',    'ь': '',
    'Ю': 'Yu',  'ю': 'iu',
    'Я': 'Ya',  'я': 'ia',
    '\'': '',
    '\u2019': '',
    // RU fallback
    'Ё': 'Yo',  'ё': 'yo',
    'Ы': 'Y',   'ы': 'y',
    'Э': 'E',   'э': 'e',
};

// Lowercase-only map для slugify/normalizeName
const TRANSLIT_LOWER = {};
for (const [k, v] of Object.entries(UA_TO_LAT)) {
    const lk = k.toLowerCase();
    if (!TRANSLIT_LOWER[lk]) TRANSLIT_LOWER[lk] = v.toLowerCase();
}

// Зворотна таблиця (multi-char → UA), сортована по довжині ключа (найдовші першими)
const LAT_TO_UA_MULTI = [
    ['shch', 'щ'], ['Shch', 'Щ'], ['SHCH', 'Щ'],
    ['zh',   'ж'], ['Zh',   'Ж'], ['ZH',   'Ж'],
    ['kh',   'х'], ['Kh',   'Х'], ['KH',   'Х'],
    ['ts',   'ц'], ['Ts',   'Ц'], ['TS',   'Ц'],
    ['ch',   'ч'], ['Ch',   'Ч'], ['CH',   'Ч'],
    ['sh',   'ш'], ['Sh',   'Ш'], ['SH',   'Ш'],
    ['ye',   'є'], ['Ye',   'Є'], ['YE',   'Є'],
    ['yi',   'ї'], ['Yi',   'Ї'], ['YI',   'Ї'],
    ['yu',   'ю'], ['Yu',   'Ю'], ['YU',   'Ю'],
    ['ya',   'я'], ['Ya',   'Я'], ['YA',   'Я'],
    ['ie',   'є'], ['Ie',   'Є'],
    ['iu',   'ю'], ['Iu',   'Ю'],
    ['ia',   'я'], ['Ia',   'Я'],
];

const LAT_TO_UA_SINGLE = {
    'A': 'А', 'a': 'а',
    'B': 'Б', 'b': 'б',
    'V': 'В', 'v': 'в',
    'H': 'Г', 'h': 'г',
    'G': 'Ґ', 'g': 'ґ',
    'D': 'Д', 'd': 'д',
    'E': 'Е', 'e': 'е',
    'Z': 'З', 'z': 'з',
    'Y': 'И', 'y': 'и',
    'I': 'І', 'i': 'і',
    'K': 'К', 'k': 'к',
    'L': 'Л', 'l': 'л',
    'M': 'М', 'm': 'м',
    'N': 'Н', 'n': 'н',
    'O': 'О', 'o': 'о',
    'P': 'П', 'p': 'п',
    'R': 'Р', 'r': 'р',
    'S': 'С', 's': 'с',
    'T': 'Т', 't': 'т',
    'U': 'У', 'u': 'у',
    'F': 'Ф', 'f': 'ф',
};

/**
 * Транслітерація UA → Latin (КМУ 2010)
 * @param {string} str
 * @returns {string}
 */
export function transliterateToLatin(str) {
    return [...str].map(ch => UA_TO_LAT[ch] ?? ch).join('');
}

/**
 * Зворотна транслітерація Latin → UA
 * (наближена — транслітерація не є бієктивною)
 * @param {string} str
 * @returns {string}
 */
/**
 * Транслітерація + slug для URL: "Optimum Nutrition 100% Whey" → "optimum-nutrition-100-whey"
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
    if (!text) return '';
    let result = text.toLowerCase();
    result = result.replace(/./g, ch => TRANSLIT_LOWER[ch] || ch);
    result = result.replace(/[^a-z0-9]+/g, '-');
    result = result.replace(/^-+|-+$/g, '');
    return result;
}

/**
 * Нормалізувати назву для файлів: транслітерація UA→EN, lowercase, пробіли→_
 * @param {string} name
 * @returns {string}
 */
export function normalizeName(name) {
    if (!name) return '';
    let result = name.trim().toLowerCase();
    result = result.replace(/./g, ch => TRANSLIT_LOWER[ch] || ch);
    result = result.replace(/\s+/g, '_');
    result = result.replace(/[^a-z0-9_\-]/g, '');
    return result;
}

/**
 * Зворотна транслітерація Latin → UA
 * (наближена — транслітерація не є бієктивною)
 * @param {string} str
 * @returns {string}
 */
export function transliterateToUA(str) {
    let result = '';
    let i = 0;
    while (i < str.length) {
        let matched = false;
        for (const [lat, ua] of LAT_TO_UA_MULTI) {
            if (str.slice(i, i + lat.length) === lat) {
                result += ua;
                i += lat.length;
                matched = true;
                break;
            }
        }
        if (!matched) {
            result += LAT_TO_UA_SINGLE[str[i]] ?? str[i];
            i++;
        }
    }
    return result;
}
