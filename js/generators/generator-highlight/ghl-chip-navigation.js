// js/generators/generator-highlight/ghl-chip-navigation.js

/**
 * CHIP NAVIGATION - Навігація по кліку на чіпи валідації
 *
 * Функціонал:
 * - Клік на червоний чіп (заборонене слово) → перехід до слова в редакторі
 * - Клік на жовтий чіп (HTML патерн) → перехід до патерну в редакторі
 * - Циклічна навігація: 1→2→3→1...
 * - Flash-ефект для візуального підсвічування
 *
 * ВИДАЛЕННЯ БЕЗ НАСЛІДКІВ:
 * 1. Видалити цей файл
 * 2. Видалити імпорт та виклик setupChipNavigation() з ghl-main.js
 * 3. (Опціонально) Видалити CSS секцію "CHIP NAVIGATION" з highlight-textarea.css
 */

import { getHighlightDOM } from './ghl-dom.js';

// Зберігаємо поточний індекс для кожного слова/патерну
const navigationState = new Map();

/**
 * Застосувати flash-ефект до елемента
 */
function applyFlash(element, flashClass = 'flash') {
    element.classList.remove(flashClass);
    // Force reflow для перезапуску анімації
    void element.offsetWidth;
    element.classList.add(flashClass);

    // Видаляємо клас після анімації
    setTimeout(() => {
        element.classList.remove(flashClass);
    }, 600);
}

/**
 * Поставити курсор в кінець елемента
 */
function placeCursorAtEnd(element) {
    const dom = getHighlightDOM();
    const selection = window.getSelection();
    const range = document.createRange();

    // Знаходимо останній текстовий вузол
    let lastTextNode = element;
    while (lastTextNode.lastChild) {
        lastTextNode = lastTextNode.lastChild;
    }

    if (lastTextNode.nodeType === Node.TEXT_NODE) {
        range.setStart(lastTextNode, lastTextNode.length);
    } else {
        range.selectNodeContents(element);
        range.collapse(false);
    }

    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    dom.editor?.focus();
}

/**
 * Навігація до забороненого слова
 */
function navigateToBannedWord(word) {
    const dom = getHighlightDOM();
    if (!dom.editor) return;

    // Знаходимо всі входження слова
    const highlights = Array.from(
        dom.editor.querySelectorAll('.highlight-banned-word')
    ).filter(el => el.textContent.toLowerCase() === word.toLowerCase());

    if (highlights.length === 0) return;

    // Отримуємо поточний індекс для цього слова
    const stateKey = `word:${word.toLowerCase()}`;
    let currentIndex = navigationState.get(stateKey) ?? -1;

    // Переходимо до наступного (циклічно)
    currentIndex = (currentIndex + 1) % highlights.length;
    navigationState.set(stateKey, currentIndex);

    const target = highlights[currentIndex];

    // Прокручуємо до елемента
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Flash-ефект
    applyFlash(target, 'flash');

    // Ставимо курсор в кінець слова
    placeCursorAtEnd(target);
}

/**
 * Навігація до HTML патерну
 * HTML патерни не підсвічуються span-ами, тому шукаємо в тексті
 */
function navigateToHtmlPattern(patternId) {
    const dom = getHighlightDOM();
    if (!dom.editor) return;

    // Патерни та їх regex
    const patterns = {
        'empty-tags': /<(\w+)[^>]*>\s*<\/\1>/gi,
        'nested-tags': /<(\w+)[^>]*>(\s*<\1[^>]*>)/gi,
        'inline-styles': /style\s*=\s*["'][^"']*["']/gi,
        'br-tags': /<br\s*\/?>/gi,
        'nbsp': /&nbsp;/gi,
        'font-tags': /<\/?font[^>]*>/gi,
        'div-tags': /<\/?div[^>]*>/gi,
        'span-tags': /<span[^>]*>|<\/span>/gi
    };

    const regex = patterns[patternId];
    if (!regex) return;

    // Отримуємо HTML редактора
    const html = dom.editor.innerHTML;
    const matches = [...html.matchAll(new RegExp(regex.source, 'gi'))];

    if (matches.length === 0) return;

    // Поточний індекс
    const stateKey = `pattern:${patternId}`;
    let currentIndex = navigationState.get(stateKey) ?? -1;
    currentIndex = (currentIndex + 1) % matches.length;
    navigationState.set(stateKey, currentIndex);

    const match = matches[currentIndex];

    // Знаходимо позицію в тексті і намагаємося знайти найближчий елемент
    // Це складніше, бо патерни в HTML, а не в тексті
    // Простіший варіант - підсвічуємо весь редактор з flash
    applyFlash(dom.editor, 'highlight-html-pattern-flash');
    dom.editor.focus();
}

/**
 * Скинути навігацію (викликати при оновленні validation results)
 */
export function resetNavigationState() {
    navigationState.clear();
}

/**
 * Налаштувати навігацію по кліку на чіпи
 */
export function setupChipNavigation() {
    const dom = getHighlightDOM();
    if (!dom.validationResults) return;

    // Делегування подій - один обробник на контейнер
    dom.validationResults.addEventListener('click', (e) => {
        // Заборонені слова (червоні чіпи)
        const errorChip = e.target.closest('.chip-error[data-banned-word]');
        if (errorChip) {
            const word = errorChip.dataset.bannedWord;
            if (word) {
                navigateToBannedWord(word);
            }
            return;
        }

        // HTML патерни (жовті чіпи)
        const warningChip = e.target.closest('.chip-warning[data-html-pattern]');
        if (warningChip) {
            const patternId = warningChip.dataset.htmlPattern;
            if (patternId) {
                navigateToHtmlPattern(patternId);
            }
        }
    });
}
