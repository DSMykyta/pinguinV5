// js/utils/utils-layout-fix.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    LAYOUT FIX — РОЗКЛАДКА КЛАВІАТУРИ                    ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Виправлення тексту набраного в неправильній розкладці клавіатури       ║
 * ║  EN → UA, UA → EN                                                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// Маппінг клавіш: EN → UA (QWERTY → ЙЦУКЕН)
const EN_KEYS = 'qwertyuiop[]asdfghjkl;\'zxcvbnm,.`QWERTYUIOP{}ASDFGHJKL:"ZXCVBNM<>~';
const UA_KEYS = 'йцукенгшщзхїфівапролджєячсмитьбю\'ЙЦУКЕНГШЩЗХЇФІВАПРОЛДЖЄЯЧСМИТЬБЮ₴';

const EN_TO_UA = {};
const UA_TO_EN = {};

for (let i = 0; i < EN_KEYS.length; i++) {
    EN_TO_UA[EN_KEYS[i]] = UA_KEYS[i];
    UA_TO_EN[UA_KEYS[i]] = EN_KEYS[i];
}

/**
 * Виправити текст набраний в EN розкладці → UA
 * "Ghbdsn" → "Привіт"
 * @param {string} str
 * @returns {string}
 */
export function fixLayoutToUA(str) {
    return [...str].map(ch => EN_TO_UA[ch] ?? ch).join('');
}

/**
 * Виправити текст набраний в UA розкладці → EN
 * "Привіт" при EN розкладці не буває, але "кугыеш" → "...":
 * Зворотний маппінг для RU/UA символів → EN клавіші
 * @param {string} str
 * @returns {string}
 */
export function fixLayoutToEN(str) {
    return [...str].map(ch => UA_TO_EN[ch] ?? ch).join('');
}

/**
 * Автоматично визначити та виправити розкладку
 * Якщо більшість символів латинські — конвертує в UA
 * Якщо більшість кириличні — конвертує в EN
 * @param {string} str
 * @returns {{ result: string, from: string, to: string }}
 */
export function fixLayoutAuto(str) {
    let latin = 0;
    let cyrillic = 0;
    for (const ch of str) {
        if (/[a-zA-Z]/.test(ch)) latin++;
        else if (/[а-яА-ЯїієґЇІЄҐ]/.test(ch)) cyrillic++;
    }
    if (latin > cyrillic) {
        return { result: fixLayoutToUA(str), from: 'EN', to: 'UA' };
    }
    return { result: fixLayoutToEN(str), from: 'UA', to: 'EN' };
}
