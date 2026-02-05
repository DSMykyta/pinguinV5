// js/generators/generator-highlight/ghl-hotkeys.js

/**
 * HOTKEYS - Гарячі клавіші редактора
 *
 * HOTKEYS:
 * - Ctrl+Z — Скасувати
 * - Ctrl+Y / Ctrl+Shift+Z — Повторити
 * - Enter — Новий параграф
 * - Shift+Enter — Новий рядок (br)
 * - Ctrl+B — Жирний текст
 * - Ctrl+I — Курсив
 * - Ctrl+Alt+C — Копіювати текст без HTML
 */

import { showToast } from '../../common/ui-toast.js';
import { saveUndoState, undo, redo } from './ghl-undo.js';
import { setSkipCaretRestore } from './ghl-sanitizer.js';
import { wrapSelection } from './ghl-formatting.js';

let editorRef = null;
let validateCallback = null;

// ============================================================================
// ДОПОМІЖНІ ФУНКЦІЇ ДЛЯ ОБРОБКИ ENTER
// ============================================================================

/**
 * Вставити новий параграф і встановити курсор в нього
 */
function insertParagraphAndFocus() {
    const editor = editorRef;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection.rangeCount) {
        const newParagraph = document.createElement('p');
        newParagraph.appendChild(document.createElement('br'));
        editor.appendChild(newParagraph);
        const newRange = document.createRange();
        newRange.setStart(newParagraph, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        editor.focus();
        return;
    }

    const range = selection.getRangeAt(0);
    let container = range.startContainer;
    let offset = range.startOffset;

    if (!range.collapsed) {
        range.deleteContents();
        container = range.startContainer;
        offset = range.startOffset;
    }

    let currentBlock = container;
    if (currentBlock.nodeType === Node.TEXT_NODE) {
        currentBlock = currentBlock.parentNode;
    }

    while (currentBlock && currentBlock !== editor && !['P', 'H1', 'H2', 'H3', 'LI'].includes(currentBlock.nodeName)) {
        currentBlock = currentBlock.parentNode;
    }

    const newParagraph = document.createElement('p');

    if (currentBlock && currentBlock !== editor) {
        const afterRange = document.createRange();
        afterRange.setStart(container, offset);
        afterRange.setEndAfter(currentBlock.lastChild || currentBlock);

        const afterContent = afterRange.extractContents();

        if (currentBlock.nextSibling) {
            currentBlock.parentNode.insertBefore(newParagraph, currentBlock.nextSibling);
        } else {
            currentBlock.parentNode.appendChild(newParagraph);
        }

        if (afterContent.textContent || afterContent.querySelector('*')) {
            newParagraph.appendChild(afterContent);
        } else {
            newParagraph.appendChild(document.createElement('br'));
        }

        if (!currentBlock.textContent && !currentBlock.querySelector('br')) {
            currentBlock.appendChild(document.createElement('br'));
        }
    } else {
        newParagraph.appendChild(document.createElement('br'));
        editor.appendChild(newParagraph);
    }

    let br = newParagraph.querySelector('br');
    if (!br) {
        br = document.createElement('br');
        newParagraph.appendChild(br);
    }

    editor.focus();

    const newRange = document.createRange();
    newRange.setStart(newParagraph, 0);
    newRange.collapse(true);

    selection.removeAllRanges();
    selection.addRange(newRange);

    const rect = newRange.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
        newParagraph.scrollIntoView({ block: 'nearest' });
    }
}

/**
 * Вставити <br> і встановити курсор після нього
 */
function insertLineBreakAndFocus() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const br = document.createElement('br');
    range.insertNode(br);

    const newRange = document.createRange();
    newRange.setStartAfter(br);
    newRange.collapse(true);

    selection.removeAllRanges();
    selection.addRange(newRange);
}

// ============================================================================
// ІНІЦІАЛІЗАЦІЯ
// ============================================================================

/**
 * Ініціалізація гарячих клавіш
 * @param {HTMLElement} editor - Елемент редактора
 * @param {Function} validateAndHighlight - Колбек валідації
 */
export function setupHotkeys(editor, validateAndHighlight) {
    if (!editor) return;

    editorRef = editor;
    validateCallback = validateAndHighlight;
    editor.addEventListener('keydown', handleKeydown);
}

/**
 * Обробник клавіш
 */
function handleKeydown(e) {
    // Ctrl+Z - Undo
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo(validateCallback);
        return;
    }

    // Ctrl+Y або Ctrl+Shift+Z - Redo
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        redo(validateCallback);
        return;
    }

    // Enter - створюємо <p>
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveUndoState();
        setSkipCaretRestore(true);
        insertParagraphAndFocus();
        return;
    }

    // Shift+Enter - <br>
    if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        saveUndoState();
        setSkipCaretRestore(true);
        insertLineBreakAndFocus();
        return;
    }

    // Ctrl+B для жирного (<strong>)
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        wrapSelection('strong');
    }

    // Ctrl+I для курсиву (<em>)
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        wrapSelection('em');
    }

    // Ctrl+Alt+C - копіювати тільки текст без розмітки
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'c') {
        const selection = window.getSelection();
        const plainText = selection.toString();
        if (plainText) {
            e.preventDefault();
            navigator.clipboard.writeText(plainText).then(() => {
                showToast('Скопійовано текст (без HTML)', 'success');
            });
        }
    }
}
