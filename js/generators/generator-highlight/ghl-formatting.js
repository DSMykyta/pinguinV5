// js/generators/generator-highlight/ghl-formatting.js

/**
 * FORMATTING - Форматування тексту (Bold, Italic, H2, H3, List, Lowercase)
 */

import { getHighlightDOM } from './ghl-dom.js';
import { getCurrentMode, switchToTextMode, switchToCodeMode } from './ghl-mode.js';
import { saveUndoState } from './ghl-undo.js';

/**
 * Перевірити чи курсор всередині тегу
 */
function isInsideTag(tagName) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;

    const dom = getHighlightDOM();
    let node = selection.anchorNode;

    while (node && node !== dom.editor) {
        if (node.nodeName?.toLowerCase() === tagName.toLowerCase()) return true;
        node = node.parentNode;
    }
    return false;
}

/**
 * Оновити стан кнопок тулбара
 */
export function updateToolbarState() {
    if (getCurrentMode() !== 'text') return;
    const dom = getHighlightDOM();

    dom.btnBold?.classList.toggle('active', isInsideTag('strong'));
    dom.btnItalic?.classList.toggle('active', isInsideTag('em'));

    try {
        const block = document.queryCommandValue('formatBlock').toLowerCase();
        dom.btnH2?.classList.toggle('active', block === 'h2');
        dom.btnH3?.classList.toggle('active', block === 'h3');
    } catch (e) {}

    dom.btnList?.classList.toggle('active', document.queryCommandState('insertUnorderedList'));
}

/**
 * Обгорнути виділення тегом
 */
export function wrapSelection(tagName) {
    if (getCurrentMode() !== 'text') return;
    const dom = getHighlightDOM();
    dom.editor?.focus();

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    saveUndoState();

    const range = selection.getRangeAt(0);

    let node = selection.anchorNode;
    if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
    }
    const parentTag = node?.closest?.(tagName);

    if (parentTag && dom.editor.contains(parentTag)) {
        const parent = parentTag.parentNode;

        while (parentTag.firstChild) {
            parent.insertBefore(parentTag.firstChild, parentTag);
        }
        parent.removeChild(parentTag);
        parent.normalize();
    } else if (!range.collapsed) {
        const wrapper = document.createElement(tagName);
        wrapper.appendChild(range.extractContents());
        range.insertNode(wrapper);

        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(wrapper);
        selection.addRange(newRange);
    }

    updateToolbarState();
}

/**
 * Виконати команду форматування
 */
export function execFormat(command, value = null) {
    if (getCurrentMode() !== 'text') return;
    const dom = getHighlightDOM();
    dom.editor?.focus();

    saveUndoState();

    document.execCommand(command, false, value);
    updateToolbarState();
}

/**
 * Переключити заголовок
 */
export function toggleHeading(tag) {
    if (getCurrentMode() !== 'text') return;
    const dom = getHighlightDOM();
    dom.editor?.focus();

    saveUndoState();

    try {
        const currentBlock = document.queryCommandValue('formatBlock').toLowerCase();
        if (currentBlock === tag.toLowerCase()) {
            document.execCommand('formatBlock', false, '<p>');
        } else {
            document.execCommand('formatBlock', false, `<${tag}>`);
        }
    } catch (e) {
        document.execCommand('formatBlock', false, `<${tag}>`);
    }

    updateToolbarState();
}

/**
 * Конвертувати виділення в нижній регістр
 */
export function convertToLowercase() {
    if (getCurrentMode() !== 'text') return;
    const dom = getHighlightDOM();
    dom.editor?.focus();

    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) return;

    saveUndoState();

    const selectedText = selection.toString();
    const lowercaseText = selectedText.toLowerCase();

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(lowercaseText));

    selection.removeAllRanges();
}

/**
 * Налаштувати тулбар
 */
export function setupToolbar(clearHighlights, validateAndHighlight, validateOnly) {
    const dom = getHighlightDOM();

    dom.btnBold?.addEventListener('click', () => wrapSelection('strong'));
    dom.btnItalic?.addEventListener('click', () => wrapSelection('em'));
    dom.btnH2?.addEventListener('click', () => toggleHeading('h2'));
    dom.btnH3?.addEventListener('click', () => toggleHeading('h3'));
    dom.btnList?.addEventListener('click', () => execFormat('insertUnorderedList'));
    dom.btnLowercase?.addEventListener('click', convertToLowercase);

    // Radio buttons для перемикання режимів
    dom.btnModeText?.addEventListener('change', () => {
        if (dom.btnModeText.checked) switchToTextMode(validateAndHighlight);
    });
    dom.btnModeCode?.addEventListener('change', () => {
        if (dom.btnModeCode.checked) switchToCodeMode(clearHighlights, validateOnly);
    });

    dom.toolbar?.addEventListener('mousedown', (e) => {
        if (e.target.closest('.btn-icon')) e.preventDefault();
    });

    dom.editor?.addEventListener('keyup', updateToolbarState);
    dom.editor?.addEventListener('mouseup', updateToolbarState);
}
