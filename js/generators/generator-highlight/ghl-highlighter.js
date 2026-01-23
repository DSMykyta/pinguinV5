// js/generators/generator-highlight/ghl-highlighter.js

import { getHighlightDOM } from './ghl-dom.js';

let backdropElement = null;
let highlightsElement = null;
let isInitialized = false;

/**
 * Ініціалізація overlay структури для підсвічування
 */
export function initHighlighter() {
    const dom = getHighlightDOM();
    if (!dom.editorContainer || !dom.textarea || isInitialized) return;

    // Додаємо клас контейнеру
    dom.editorContainer.classList.add('hwt-container');

    // Створюємо backdrop (фоновий шар для підсвічення)
    backdropElement = document.createElement('div');
    backdropElement.className = 'hwt-backdrop';

    // Створюємо елемент для підсвіченого тексту
    highlightsElement = document.createElement('div');
    highlightsElement.className = 'hwt-highlights hwt-content';

    backdropElement.appendChild(highlightsElement);

    // Додаємо клас до textarea
    dom.textarea.classList.add('hwt-input', 'hwt-content');

    // Вставляємо backdrop перед textarea
    dom.editorContainer.insertBefore(backdropElement, dom.textarea);

    // Синхронізація скролу
    dom.textarea.addEventListener('scroll', syncScroll);

    // Синхронізація при зміні розміру (якщо textarea resizable)
    const resizeObserver = new ResizeObserver(() => {
        syncStyles();
    });
    resizeObserver.observe(dom.textarea);

    isInitialized = true;
}

/**
 * Синхронізація скролу між textarea і backdrop
 */
function syncScroll() {
    const dom = getHighlightDOM();
    if (!backdropElement || !dom.textarea) return;

    backdropElement.scrollTop = dom.textarea.scrollTop;
    backdropElement.scrollLeft = dom.textarea.scrollLeft;
}

/**
 * Синхронізація розмірів
 */
function syncStyles() {
    const dom = getHighlightDOM();
    if (!backdropElement || !dom.textarea) return;

    const styles = getComputedStyle(dom.textarea);
    backdropElement.style.width = styles.width;
    backdropElement.style.height = styles.height;
}

/**
 * Екранування HTML символів
 */
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Оновити підсвічування тексту
 * @param {string} text - Текст для відображення
 * @param {RegExp|null} regex - Регулярний вираз для пошуку слів
 * @param {string} highlightClass - CSS клас для підсвічування
 */
export function updateHighlights(text, regex, highlightClass = 'highlight-banned-word') {
    if (!highlightsElement) return;

    if (!regex || !text) {
        // Просто показуємо текст без підсвічування
        highlightsElement.innerHTML = escapeHtml(text) + '\n';
        return;
    }

    // Скидаємо lastIndex
    regex.lastIndex = 0;

    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Текст до співпадіння
        result += escapeHtml(text.slice(lastIndex, match.index));

        // Підсвічене слово
        const word = match[0];
        result += `<mark class="${highlightClass}">${escapeHtml(word)}</mark>`;

        lastIndex = match.index + word.length;
    }

    // Додаємо залишок тексту
    result += escapeHtml(text.slice(lastIndex));

    // Додаємо \n в кінці для правильної висоти
    highlightsElement.innerHTML = result + '\n';

    // Синхронізуємо скрол
    syncScroll();
}

/**
 * Очистити підсвічування
 */
export function clearHighlights() {
    if (highlightsElement) {
        highlightsElement.innerHTML = '';
    }
}
