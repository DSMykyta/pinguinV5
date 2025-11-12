/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                  TABLE GENERATOR - УТИЛІТИ (UTILS)                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * * ПРИЗНАЧЕННЯ:
 * Набір невеликих, незалежних допоміжних функцій, які використовуються
 * в різних частинах генератора. Наприклад, копіювання в буфер обміну,
 * очищення тексту, затримка виконання (debounce).
 */

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

/**
 * Створює версію функції, яка буде викликана лише через певний час 
 * після останнього виклику.
 * @param {Function} func - Функція, яку потрібно викликати.
 * @param {number} delay - Затримка в мілісекундах.
 * @returns {Function} - Нова функція з debounce-логікою.
 */
export function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}