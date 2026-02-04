// js/common/editor/editor-undo.js

/**
 * 🔌 ПЛАГІН — Undo/Redo (Ctrl+Z, Ctrl+Y)
 *
 * Можна видалити — редактор працюватиме без undo/redo.
 */

import { debounce } from '../../utils/common-utils.js';

const MAX_UNDO_STACK = 50;

export function init(state) {
    const undoStack = [];
    const redoStack = [];

    // Зберегти стан для undo
    const saveState = () => {
        // Не зберігаємо під час sanitization
        if (state.currentMode !== 'text' || !state.dom.editor || state.isSanitizing) return;

        const content = state.dom.editor.innerHTML;
        if (content === state.lastSavedContent) return;

        undoStack.push({
            content: state.lastSavedContent,
            caret: saveCaretPosition(state.dom.editor)
        });

        if (undoStack.length > MAX_UNDO_STACK) undoStack.shift();
        redoStack.length = 0;
        state.lastSavedContent = content;
    };

    const debouncedSave = debounce(saveState, 300);

    // Реєструємо хук для збереження стану
    state.registerHook('onInput', debouncedSave);

    // Хук для явного збереження перед зміною
    state.registerHook('onBeforeChange', saveState);

    // Keyboard shortcuts
    state.registerHook('onKeydown', (e) => {
        // Ctrl+Z — Undo
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undo();
            return;
        }
        // Ctrl+Y або Ctrl+Shift+Z — Redo
        if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
            e.preventDefault();
            redo();
            return;
        }
    });

    function undo() {
        if (undoStack.length === 0 || state.currentMode !== 'text') return;

        const current = undoStack.pop();
        redoStack.push({
            content: state.dom.editor.innerHTML,
            caret: saveCaretPosition(state.dom.editor)
        });

        state.dom.editor.innerHTML = current.content;
        state.lastSavedContent = current.content;

        if (current.caret) {
            restoreCaretPosition(state.dom.editor, current.caret);
        }

        state.runHook('onValidate');
    }

    function redo() {
        if (redoStack.length === 0 || state.currentMode !== 'text') return;

        const current = redoStack.pop();
        undoStack.push({
            content: state.dom.editor.innerHTML,
            caret: saveCaretPosition(state.dom.editor)
        });

        state.dom.editor.innerHTML = current.content;
        state.lastSavedContent = current.content;

        if (current.caret) {
            restoreCaretPosition(state.dom.editor, current.caret);
        }

        state.runHook('onValidate');
    }
}

function saveCaretPosition(editor) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editor);
    preCaretRange.setEnd(range.startContainer, range.startOffset);

    return {
        start: preCaretRange.toString().length,
        end: preCaretRange.toString().length + range.toString().length
    };
}

function restoreCaretPosition(editor, pos) {
    if (!pos) return;

    try {
        const range = document.createRange();
        const selection = window.getSelection();

        let charCount = 0;
        let startNode = null;
        let startOffset = 0;

        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);

        while (walker.nextNode()) {
            const node = walker.currentNode;
            const nodeLength = node.textContent.length;

            if (!startNode && charCount + nodeLength >= pos.start) {
                startNode = node;
                startOffset = pos.start - charCount;
            }

            charCount += nodeLength;
        }

        if (startNode) {
            range.setStart(startNode, Math.min(startOffset, startNode.textContent.length));
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    } catch (e) {
        // Ignore
    }
}
