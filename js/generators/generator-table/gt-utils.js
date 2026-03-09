// js/generators/generator-table/gt-utils.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                 TABLE GENERATOR — УТИЛІТИ (UTILS)                       ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🛠️ УТИЛІТА — Копіювання, очищення тексту, debounce для генератора      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { debounce } from '../../utils/utils-debounce.js';
import { showToast } from '../../components/feedback/toast.js';

/**
 * Копіює переданий текст у буфер обміну.
 * @param {string} text - Текст для копіювання.
 * @param {string} [label=''] - Що саме копіюється (для toast).
 */
export function copyToClipboard(text, label = '') {
    const msg = label ? `${label} скопійовано` : 'Скопійовано';
    navigator.clipboard.writeText(text).then(() => {
        showToast(msg, 'success', 2000);
    }).catch(err => {
        console.error('Не вдалося скопіювати текст: ', err);
        showToast('Помилка копіювання', 'error', 2000);
    });
}

/**
 * Очищує текст: прибирає зайві пробіли, замінює коми на крапки в числах.
 * @param {string} text - Вхідний текст.
 * @returns {string} - Очищений текст.
 */
export function sanitizeText(text) {
    if (!text) return '';
    return text.trim().replace(/МСМ/g, "MSM").replace(/(\d+),(\d+)/g, '$1.$2');
}

// Re-export debounce from common utils for backwards compatibility
export { debounce };