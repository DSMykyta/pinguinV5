// js/generators/generator-highlight/ghl-main.js

/**
 * HIGHLIGHT GENERATOR - Головний модуль ініціалізації
 *
 * Редактор з підсвічуванням заборонених слів.
 * Два режими: Текст (WYSIWYG) і Код (HTML)
 */

import { registerPanelInitializer } from '../../panel/panel-right.js';
import { debounce } from '../../utils/common-utils.js';
import { showToast } from '../../common/ui-toast.js';

// Модулі генератора
import { getHighlightDOM } from './ghl-dom.js';
import { initValidator, initBannedWordsModalListener } from './ghl-validator.js';
import { sanitizeEditor, setSkipCaretRestore } from './ghl-sanitizer.js';
import { saveUndoState, undo, redo, initLastSavedContent } from './ghl-undo.js';
import { setupToolbar, wrapSelection } from './ghl-formatting.js';
import { setupInfoButtonTooltip, setupEditorTooltips } from './ghl-tooltip.js';
import { clearHighlights } from './ghl-highlights.js';
import { validateAndHighlight, validateOnly, updateValidationScrollFade } from './ghl-validation.js';
import { findAndReplaceAll } from './ghl-find-replace.js';
import { resetEditor } from './ghl-reset.js';
import { setupCopyHandler, setupPasteHandler } from './ghl-copy.js';
import { setupChipNavigation } from './ghl-chip-navigation.js';

// ============================================================================
// ДОПОМІЖНІ ФУНКЦІЇ ДЛЯ ОБРОБКИ ENTER
// ============================================================================

/**
 * Вставити новий параграф і встановити курсор в нього
 */
function insertParagraphAndFocus(editor) {
    const selection = window.getSelection();
    if (!selection.rangeCount) {
        // Якщо немає selection - створюємо параграф в кінці
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

    // Зберігаємо позицію до видалення
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

    // Шукаємо найближчий блок-елемент (p, h1, h2, h3, li, etc.)
    while (currentBlock && currentBlock !== editor && !['P', 'H1', 'H2', 'H3', 'LI'].includes(currentBlock.nodeName)) {
        currentBlock = currentBlock.parentNode;
    }

    // Створюємо новий параграф
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

        // Якщо поточний блок порожній - додаємо br
        if (!currentBlock.textContent && !currentBlock.querySelector('br')) {
            currentBlock.appendChild(document.createElement('br'));
        }
    } else {
        // Якщо ми на верхньому рівні - створюємо параграф
        newParagraph.appendChild(document.createElement('br'));
        editor.appendChild(newParagraph);
    }

    // Гарантуємо що новий параграф має <br> для позиціонування курсора
    let br = newParagraph.querySelector('br');
    if (!br) {
        br = document.createElement('br');
        newParagraph.appendChild(br);
    }

    // Фокусуємо редактор
    editor.focus();

    // Встановлюємо курсор перед <br> в новому параграфі
    const newRange = document.createRange();
    newRange.setStart(newParagraph, 0);
    newRange.collapse(true);

    selection.removeAllRanges();
    selection.addRange(newRange);

    // Додатково скролимо до курсора
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

    // Встановлюємо курсор після br
    const newRange = document.createRange();
    newRange.setStartAfter(br);
    newRange.collapse(true);

    selection.removeAllRanges();
    selection.addRange(newRange);
}

// ============================================================================
// ІНІЦІАЛІЗАЦІЯ
// ============================================================================

async function initHighlightGenerator() {
    const dom = getHighlightDOM();
    if (!dom.editor) return;

    await initValidator();
    initBannedWordsModalListener();

    // Налаштовуємо тулбар з колбеками
    setupToolbar(clearHighlights, validateAndHighlight, validateOnly);
    setupEditorTooltips();
    setupInfoButtonTooltip();
    setupChipNavigation();

    // Ініціалізуємо lastSavedContent
    initLastSavedContent(dom.editor.innerHTML);

    // Дебаунсовані функції
    const debouncedValidateAndHighlight = debounce(validateAndHighlight, 500);
    const debouncedSaveUndo = debounce(saveUndoState, 300);
    const debouncedSanitize = debounce(sanitizeEditor, 100);

    // Обробник введення
    dom.editor.addEventListener('input', () => {
        debouncedSanitize();
        debouncedSaveUndo();
        debouncedValidateAndHighlight();
        // SEO слухає цей редактор напряму через свій власний listener
    });

    // Reset кнопка
    const reloadBtn = document.getElementById('reload-section-highlight');
    reloadBtn?.addEventListener('click', resetEditor);

    // Find and Replace
    dom.replaceAllBtn?.addEventListener('click', () => {
        findAndReplaceAll(validateAndHighlight, validateOnly);
    });

    // Кнопка "Додати заборонене слово"
    const addBannedWordBtn = document.getElementById('ghl-btn-add-banned-word');
    if (addBannedWordBtn) {
        addBannedWordBtn.addEventListener('click', async () => {
            const { loadBannedWords } = await import('../../banned-words/banned-words-data.js');
            await loadBannedWords();

            const { openBannedWordModal } = await import('../../banned-words/banned-words-manage.js');
            await openBannedWordModal();
        });
    }

    // Копіювання та вставка
    setupCopyHandler();
    setupPasteHandler(validateAndHighlight);

    // Обробка клавіш
    dom.editor.addEventListener('keydown', (e) => {
        // Ctrl+Z - Undo
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undo(validateAndHighlight);
            return;
        }
        // Ctrl+Y або Ctrl+Shift+Z - Redo
        if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
            e.preventDefault();
            redo(validateAndHighlight);
            return;
        }
        // Enter - створюємо <p>
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveUndoState();
            setSkipCaretRestore(true); // Блокуємо відновлення курсора санітайзером
            insertParagraphAndFocus(dom.editor);
            return;
        }
        // Shift+Enter - <br>
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            saveUndoState();
            setSkipCaretRestore(true); // Блокуємо відновлення курсора санітайзером
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
        // Ctrl+Shift+C - копіювати тільки текст без розмітки
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
            const selection = window.getSelection();
            const plainText = selection.toString();
            // Only prevent default and copy if there's actual text selected
            if (plainText) {
                e.preventDefault();
                navigator.clipboard.writeText(plainText).then(() => {
                    showToast('Скопійовано текст (без HTML)', 'success');
                });
            }
        }
    });

    // Режим коду
    dom.codeEditor?.addEventListener('input', debounce(validateOnly, 300));

    // Fade-ефект при прокрутці validation results
    dom.validationResults?.addEventListener('scroll', updateValidationScrollFade);

    validateAndHighlight();
    console.log('✅ Highlight Generator ініціалізовано');
}

registerPanelInitializer('aside-highlight', initHighlightGenerator);
