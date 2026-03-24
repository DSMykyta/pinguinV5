// js/utils/utils-decode-unicode.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    DECODE — UNICODE ESCAPES                             ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Декодування unicode escape sequences: \u0410 \u{1F600} → символи       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Декодує \uXXXX (BMP) та \u{XXXXX} (extended) escape sequences
 * @param {string} str
 * @returns {string}
 */
export function decodeUnicode(str) {
    return str
        .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

/**
 * Кодує рядок у \uXXXX escape sequences
 * @param {string} str
 * @returns {string}
 */
export function encodeUnicode(str) {
    return [...str].map(ch => {
        const cp = ch.codePointAt(0);
        if (cp > 0xFFFF) return `\\u{${cp.toString(16).toUpperCase()}}`;
        return `\\u${cp.toString(16).toUpperCase().padStart(4, '0')}`;
    }).join('');
}
