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
import { initValidator } from './ghl-validator.js';
import { sanitizeEditor } from './ghl-sanitizer.js';
import { saveUndoState, undo, redo, initLastSavedContent } from './ghl-undo.js';
import { setupToolbar, wrapSelection } from './ghl-formatting.js';
import { setupInfoButtonTooltip, setupEditorTooltips } from './ghl-tooltip.js';
import { clearHighlights } from './ghl-highlights.js';
import { validateAndHighlight, validateOnly, updateValidationScrollFade } from './ghl-validation.js';
import { findAndReplaceAll } from './ghl-find-replace.js';
import { resetEditor } from './ghl-reset.js';
import { setupCopyHandler, setupPasteHandler } from './ghl-copy.js';
import { updateSeoFromEditor } from './ghl-seo.js';

// ============================================================================
// ІНІЦІАЛІЗАЦІЯ
// ============================================================================

async function initHighlightGenerator() {
    const dom = getHighlightDOM();
    if (!dom.editor) return;

    await initValidator();

    // Налаштовуємо тулбар з колбеками
    setupToolbar(clearHighlights, validateAndHighlight, validateOnly);
    setupEditorTooltips();
    setupInfoButtonTooltip();

    // Ініціалізуємо lastSavedContent
    initLastSavedContent(dom.editor.innerHTML);

    // Дебаунсовані функції
    const debouncedValidateAndHighlight = debounce(validateAndHighlight, 500);
    const debouncedSaveUndo = debounce(saveUndoState, 300);
    const debouncedSanitize = debounce(sanitizeEditor, 100);
    const debouncedSeoUpdate = debounce(updateSeoFromEditor, 300);

    // Обробник введення
    dom.editor.addEventListener('input', () => {
        debouncedSanitize();
        debouncedSaveUndo();
        debouncedValidateAndHighlight();
        debouncedSeoUpdate();
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
            document.execCommand('insertParagraph');
            setTimeout(sanitizeEditor, 0);
        }
        // Shift+Enter - <br>
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            saveUndoState();
            document.execCommand('insertLineBreak');
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
            e.preventDefault();
            const selection = window.getSelection();
            if (selection.rangeCount) {
                const plainText = selection.toString();
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
