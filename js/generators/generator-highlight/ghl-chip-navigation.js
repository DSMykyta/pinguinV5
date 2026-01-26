// js/generators/generator-highlight/ghl-chip-navigation.js

/**
 * CHIP NAVIGATION - Навігація по кліку на чіпи валідації
 *
 * Функціонал:
 * - Клік на червоний чіп (заборонене слово) → перехід до слова в редакторі
 * - Циклічна навігація: 1→2→3→1...
 * - Flash-ефект для візуального підсвічування
 *
 * ВИДАЛЕННЯ БЕЗ НАСЛІДКІВ:
 * 1. Видалити цей файл
 * 2. Видалити імпорт та виклик setupChipNavigation() з ghl-main.js
 */

import { getHighlightDOM } from './ghl-dom.js';

// Зберігаємо поточний індекс для кожного слова
const navigationState = new Map();

/**
 * Застосувати flash-ефект до елемента
 */
function applyFlash(element) {
    element.classList.remove('flash');
    // Force reflow для перезапуску анімації
    void element.offsetWidth;
    element.classList.add('flash');

    // Видаляємо клас після анімації
    setTimeout(() => {
        element.classList.remove('flash');
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
    applyFlash(target);

    // Ставимо курсор в кінець слова
    placeCursorAtEnd(target);
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
        }
    });
}
