// js/generators/generator-highlight/ghl-undo.js

/**
 * UNDO/REDO - Власна система для обходу проблем contentEditable
 */

import { getHighlightDOM } from './ghl-dom.js';

const undoStack = [];
const redoStack = [];
const MAX_UNDO_STACK = 50;
let lastSavedContent = '';

/**
 * Отримати чистий HTML без підсвічувань
 */
export function getCleanHtml() {
    const dom = getHighlightDOM();
    if (!dom.editor) return '';

    const clone = dom.editor.cloneNode(true);

    // Видаляємо highlight spans
    clone.querySelectorAll('.highlight-banned-word').forEach(el => {
        const text = document.createTextNode(el.textContent);
        el.parentNode.replaceChild(text, el);
    });

    // Отримуємо HTML і очищаємо
    let html = clone.innerHTML;

    // Замінюємо &nbsp; на звичайний пробіл
    html = html.replace(/&nbsp;/g, ' ');
    html = html.replace(/\u00A0/g, ' ');

    // Очищаємо множинні пробіли
    html = html.replace(/ {2,}/g, ' ');

    // Видаляємо порожні параграфи з br
    html = html.replace(/<p><br><\/p>/gi, '');
    html = html.replace(/<p><br\/><\/p>/gi, '');

    return html.trim();
}

/**
 * Зберегти стан для undo
 */
export function saveUndoState() {
    const dom = getHighlightDOM();
    if (!dom.editor) return;

    const content = getCleanHtml();

    // Не зберігаємо якщо контент не змінився
    if (content === lastSavedContent) return;

    undoStack.push(lastSavedContent);
    lastSavedContent = content;

    // Очищаємо redo при новій дії
    redoStack.length = 0;

    // Обмежуємо розмір стеку
    if (undoStack.length > MAX_UNDO_STACK) {
        undoStack.shift();
    }
}

/**
 * Поставити курсор в кінець редактора
 */
function placeCursorAtEnd(editor) {
    const range = document.createRange();
    const selection = window.getSelection();

    // Знаходимо останній текстовий вузол або елемент
    let lastNode = editor;
    while (lastNode.lastChild) {
        lastNode = lastNode.lastChild;
    }

    if (lastNode.nodeType === Node.TEXT_NODE) {
        range.setStart(lastNode, lastNode.length);
        range.setEnd(lastNode, lastNode.length);
    } else {
        range.selectNodeContents(editor);
        range.collapse(false);
    }

    selection.removeAllRanges();
    selection.addRange(range);
}

/**
 * Скасувати дію
 */
export function undo(validateAndHighlight) {
    if (undoStack.length === 0) return;

    const dom = getHighlightDOM();
    if (!dom.editor) return;

    const currentContent = getCleanHtml();
    redoStack.push(currentContent);

    const previousContent = undoStack.pop();
    lastSavedContent = previousContent;

    dom.editor.innerHTML = previousContent;

    // Ставимо курсор в кінець
    placeCursorAtEnd(dom.editor);

    if (validateAndHighlight) validateAndHighlight();
}

/**
 * Повторити дію
 */
export function redo(validateAndHighlight) {
    if (redoStack.length === 0) return;

    const dom = getHighlightDOM();
    if (!dom.editor) return;

    const currentContent = getCleanHtml();
    undoStack.push(currentContent);

    const nextContent = redoStack.pop();
    lastSavedContent = nextContent;

    dom.editor.innerHTML = nextContent;

    // Ставимо курсор в кінець
    placeCursorAtEnd(dom.editor);

    if (validateAndHighlight) validateAndHighlight();
}

/**
 * Скинути стек undo/redo
 */
export function resetUndoStack() {
    undoStack.length = 0;
    redoStack.length = 0;
    lastSavedContent = '';
}

/**
 * Ініціалізувати lastSavedContent
 */
export function initLastSavedContent(content) {
    lastSavedContent = content;
}

/**
 * Оновити lastSavedContent
 */
export function updateLastSavedContent() {
    lastSavedContent = getCleanHtml();
}
