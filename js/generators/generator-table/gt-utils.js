/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                  TABLE GENERATOR - УТИЛІТИ (UTILS)                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * * ПРИЗНАЧЕННЯ:
 * Набір невеликих, незалежних допоміжних функцій, які використовуються
 * в різних частинах генератора. Наприклад, копіювання в буфер обміну,
 * очищення тексту, затримка виконання (debounce).
 */

import { debounce } from '../../utils/common-utils.js';

/**
 * Копіює переданий текст у буфер обміну.
 * @param {string} text - Текст для копіювання.
 * @param {HTMLElement} [cardElement] - Елемент картки для візуального фідбеку.
 */
export function copyToClipboard(text, cardElement) {
    navigator.clipboard.writeText(text).then(() => {
        if (cardElement) {
            const status = cardElement.querySelector('.result-status');
            if (status) {
                const originalText = status.textContent;
                status.textContent = 'Скопійовано!';
                cardElement.classList.add('copied');
                setTimeout(() => {
                    status.textContent = originalText;
                    cardElement.classList.remove('copied');
                }, 2000);
            }
        }
    }).catch(err => {
        console.error('Не вдалося скопіювати текст: ', err);
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