// js/generators/generator-highlight/ghl-main.js

/**
 * HIGHLIGHT GENERATOR - Головний модуль ініціалізації
 *
 * Редактор з підсвічуванням заборонених слів.
 * Два режими: Текст (WYSIWYG) і Код (HTML)
 */

import { registerPanelInitializer } from '../../panel/panel-right.js';
import { debounce } from '../../utils/common-utils.js';

// Модулі генератора
import { getHighlightDOM } from './ghl-dom.js';
import { initValidator, initBannedWordsModalListener } from './ghl-validator.js';
import { sanitizeEditor } from './ghl-sanitizer.js';
import { saveUndoState, initLastSavedContent } from './ghl-undo.js';
import { setupToolbar } from './ghl-formatting.js';
import { setupInfoButtonTooltip, setupEditorTooltips } from './ghl-tooltip.js';
import { clearHighlights } from './ghl-highlights.js';
import { validateAndHighlight, validateOnly, updateValidationScrollFade } from './ghl-validation.js';
import { findAndReplaceAll } from './ghl-find-replace.js';
import { resetEditor } from './ghl-reset.js';
import { setupCopyHandler, setupPasteHandler } from './ghl-copy.js';
import { setupChipNavigation } from './ghl-chip-navigation.js';
import { setupHotkeys } from './ghl-hotkeys.js';

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

    // Гарячі клавіші
    setupHotkeys(dom.editor, validateAndHighlight);

    // Режим коду
    dom.codeEditor?.addEventListener('input', debounce(validateOnly, 300));

    // Fade-ефект при прокрутці validation results
    dom.validationResults?.addEventListener('scroll', updateValidationScrollFade);

    validateAndHighlight();
}

registerPanelInitializer('aside-highlight', initHighlightGenerator);
