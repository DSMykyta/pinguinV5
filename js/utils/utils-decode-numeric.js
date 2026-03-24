// js/utils/utils-decode-numeric.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    DECODE — NUMERIC ENTITIES                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Декодування HTML numeric entities: &#1072; &#x410; → символи           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Декодує decimal entities: &#1072; → а
 * @param {string} str
 * @returns {string}
 */
export function decodeDecimal(str) {
    return str.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

/**
 * Декодує hex entities: &#x410; → А
 * @param {string} str
 * @returns {string}
 */
export function decodeHex(str) {
    return str.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

/**
 * Декодує всі numeric entities (decimal + hex)
 * @param {string} str
 * @returns {string}
 */
export function decodeNumeric(str) {
    return decodeHex(decodeDecimal(str));
}

/**
 * Кодує рядок у decimal entities
 * @param {string} str
 * @returns {string}
 */
export function encodeDecimal(str) {
    return [...str].map(ch => `&#${ch.codePointAt(0)};`).join('');
}

/**
 * Кодує рядок у hex entities
 * @param {string} str
 * @returns {string}
 */
export function encodeHex(str) {
    return [...str].map(ch => `&#x${ch.codePointAt(0).toString(16).toUpperCase()};`).join('');
}
