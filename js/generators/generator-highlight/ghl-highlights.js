// js/generators/generator-highlight/ghl-highlights.js

/**
 * HIGHLIGHTS - Підсвічування заборонених слів
 */

import { getHighlightDOM } from './ghl-dom.js';
import { getCurrentMode } from './ghl-mode.js';
import { getValidationRegex } from './ghl-validator.js';
import { saveCaretPosition, restoreCaretPosition } from './ghl-caret.js';

/**
 * Підсвітити текстові ноди
 */
function highlightTextNodes(node, regex) {
    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (!text || !text.trim()) return;

        regex.lastIndex = 0;
        const matches = [...text.matchAll(regex)];
        if (matches.length === 0) return;

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        for (const match of matches) {
            if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
            }

            const span = document.createElement('span');
            span.className = 'highlight-banned-word';
            span.textContent = match[0];
            fragment.appendChild(span);

            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        node.parentNode.replaceChild(fragment, node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.classList?.contains('highlight-banned-word')) return;
        if (node.tagName === 'BR') return;

        const children = Array.from(node.childNodes);
        for (const child of children) {
            highlightTextNodes(child, regex);
        }
    }
}

/**
 * Застосувати підсвічування
 */
export function applyHighlights() {
    if (getCurrentMode() !== 'text') return;

    const dom = getHighlightDOM();
    if (!dom.editor) return;

    const regex = getValidationRegex();
    if (!regex) return;

    // Зберігаємо позицію курсора
    const caretPos = saveCaretPosition(dom.editor);

    // Видаляємо старі підсвічування
    dom.editor.querySelectorAll('.highlight-banned-word').forEach(el => {
        const text = document.createTextNode(el.textContent);
        el.parentNode.replaceChild(text, el);
    });
    dom.editor.normalize();

    // Застосовуємо нові
    highlightTextNodes(dom.editor, regex);

    // Відновлюємо курсор
    restoreCaretPosition(dom.editor, caretPos);
}

/**
 * Очистити підсвічування
 */
export function clearHighlights() {
    const dom = getHighlightDOM();
    if (!dom.editor) return;

    dom.editor.querySelectorAll('.highlight-banned-word').forEach(el => {
        const text = document.createTextNode(el.textContent);
        el.parentNode.replaceChild(text, el);
    });
    dom.editor.normalize();
}
