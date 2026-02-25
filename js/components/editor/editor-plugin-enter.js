// js/common/editor/editor-enter.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🔌 ПЛАГІН — Обробка Enter / Shift+Enter                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Enter → новий параграф, Shift+Enter → новий рядок (<br>).               ║
 * ║  Можна видалити — браузер використає стандартну поведінку.               ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export function init(state) {
    if (!state.dom.editor) return;

    state.registerHook('onKeydown', (e) => {
        if (e.key !== 'Enter') return;

        e.preventDefault();

        // Зберігаємо стан для undo (якщо є undoPlugin)
        state.isSanitizing = true;
        setTimeout(() => { state.isSanitizing = false; }, 200);

        if (e.shiftKey) {
            insertLineBreakAndFocus();
        } else {
            insertParagraphAndFocus(state.dom.editor);
        }
    }, { plugin: 'enter' });

    /**
     * Вставити новий параграф і встановити курсор в нього
     */
    function insertParagraphAndFocus(editor) {
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

        // Видаляємо виділений контент (якщо є)
        if (!range.collapsed) {
            range.deleteContents();
            container = range.startContainer;
            offset = range.startOffset;
        }

        // Знаходимо поточний блок-елемент
        let currentBlock = container;
        if (currentBlock.nodeType === Node.TEXT_NODE) {
            currentBlock = currentBlock.parentNode;
        }

        while (currentBlock && currentBlock !== editor && !['P', 'H1', 'H2', 'H3', 'LI'].includes(currentBlock.nodeName)) {
            currentBlock = currentBlock.parentNode;
        }

        const newParagraph = document.createElement('p');

        if (currentBlock && currentBlock !== editor) {
            // Витягуємо контент після курсора
            const afterRange = document.createRange();
            afterRange.setStart(container, offset);
            afterRange.setEndAfter(currentBlock.lastChild || currentBlock);
            const afterContent = afterRange.extractContents();

            // Вставляємо новий параграф після поточного
            if (currentBlock.nextSibling) {
                currentBlock.parentNode.insertBefore(newParagraph, currentBlock.nextSibling);
            } else {
                currentBlock.parentNode.appendChild(newParagraph);
            }

            // Переносимо контент в новий параграф або додаємо br
            if (afterContent.textContent || afterContent.querySelector('*')) {
                newParagraph.appendChild(afterContent);
            } else {
                newParagraph.appendChild(document.createElement('br'));
            }

            // Якщо поточний блок порожній — додаємо br
            if (!currentBlock.textContent && !currentBlock.querySelector('br')) {
                currentBlock.appendChild(document.createElement('br'));
            }
        } else {
            newParagraph.appendChild(document.createElement('br'));
            editor.appendChild(newParagraph);
        }

        // Гарантуємо що новий параграф має <br> для позиціонування курсора
        if (!newParagraph.querySelector('br')) {
            newParagraph.appendChild(document.createElement('br'));
        }

        editor.focus();

        const newRange = document.createRange();
        newRange.setStart(newParagraph, 0);
        newRange.collapse(true);

        selection.removeAllRanges();
        selection.addRange(newRange);

        // Скролимо до курсора
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
}
