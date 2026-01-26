// js/generators/generator-highlight/ghl-copy.js

/**
 * COPY - Копіювання та вставка
 */

import { getHighlightDOM } from './ghl-dom.js';
import { saveUndoState } from './ghl-undo.js';
import { sanitizeHtml, escapeHtml, sanitizeEditor } from './ghl-sanitizer.js';
import { showToast } from '../../common/ui-toast.js';

/**
 * Налаштувати копіювання
 */
export function setupCopyHandler() {
    const dom = getHighlightDOM();
    if (!dom.editor) return;

    // Ctrl+C - копіюємо HTML код як plain text
    dom.editor.addEventListener('copy', (e) => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const fragment = range.cloneContents();

        // Видаляємо підсвічування з копії
        const temp = document.createElement('div');
        temp.appendChild(fragment);
        temp.querySelectorAll('.highlight-banned-word').forEach(el => {
            const text = document.createTextNode(el.textContent);
            el.parentNode.replaceChild(text, el);
        });

        // Санітизуємо HTML при копіюванні
        const htmlCode = sanitizeHtml(temp.innerHTML);

        e.preventDefault();
        e.clipboardData.setData('text/plain', htmlCode);
        showToast('Скопійовано HTML код', 'success');
    });
}

/**
 * Налаштувати вставку
 */
export function setupPasteHandler(validateAndHighlight) {
    const dom = getHighlightDOM();
    if (!dom.editor) return;

    dom.editor.addEventListener('paste', (e) => {
        e.preventDefault();

        saveUndoState();

        const clipboardData = e.clipboardData || window.clipboardData;
        let text = clipboardData.getData('text/plain');

        // Детекція HTML в plain text
        const looksLikeHtml = /<(p|strong|em|h[1-6]|ul|ol|li|br|div|span|b|i)[^>]*>/i.test(text);

        if (looksLikeHtml) {
            const sanitized = sanitizeHtml(text);
            document.execCommand('insertHTML', false, sanitized);
        } else {
            text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
            const lines = text.split('\n');
            const html = lines
                .map(line => line.trim() ? `<p>${escapeHtml(line)}</p>` : '')
                .filter(Boolean)
                .join('');

            if (html) {
                document.execCommand('insertHTML', false, html);
            }
        }

        // Санітизуємо весь контент після вставки
        setTimeout(() => {
            sanitizeEditor();
            if (validateAndHighlight) validateAndHighlight();
        }, 50);
    });
}
