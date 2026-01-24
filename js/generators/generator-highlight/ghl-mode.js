// js/generators/generator-highlight/ghl-mode.js

/**
 * MODE - Перемикання режимів Text/Code
 */

import { getHighlightDOM } from './ghl-dom.js';
import { getCleanHtml, initLastSavedContent, resetUndoStack } from './ghl-undo.js';

let currentMode = 'text';

/**
 * Отримати поточний режим
 */
export function getCurrentMode() {
    return currentMode;
}

/**
 * Форматування HTML коду для кращої читабельності
 */
export function formatHtmlCode(html) {
    let formatted = html
        .replace(/>\s+</g, '><')
        .trim();

    // Додаємо переноси рядків після закриваючих тегів
    formatted = formatted
        .replace(/<\/p>/g, '</p>\n')
        .replace(/<\/h([1-6])>/g, '</h$1>\n')
        .replace(/<\/li>/g, '</li>\n')
        .replace(/<\/ul>/g, '</ul>\n')
        .replace(/<\/ol>/g, '</ol>\n');

    // Додаємо переноси після відкриваючих ul/ol
    formatted = formatted
        .replace(/<ul>/g, '<ul>\n')
        .replace(/<ol>/g, '<ol>\n');

    // Додаємо відступи відповідно до рівня вкладеності
    const lines = formatted.split('\n');
    const result = [];
    let indentLevel = 0;
    const indentStr = '  ';

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('</ul>') || trimmed.startsWith('</ol>')) {
            indentLevel = Math.max(0, indentLevel - 1);
        }

        result.push(indentStr.repeat(indentLevel) + trimmed);

        if (trimmed.startsWith('<ul>') || trimmed.startsWith('<ol>')) {
            indentLevel++;
        }
    }

    return result.join('\n');
}

/**
 * Увімкнути/вимкнути кнопки форматування
 */
export function enableFormatButtons(enabled) {
    const dom = getHighlightDOM();
    [dom.btnBold, dom.btnItalic, dom.btnH2, dom.btnH3, dom.btnList, dom.btnLowercase].forEach(btn => {
        if (btn) {
            btn.disabled = !enabled;
            btn.classList.toggle('text-disabled', !enabled);
        }
    });
}

/**
 * Перемкнути на текстовий режим
 */
export function switchToTextMode(validateAndHighlight) {
    const dom = getHighlightDOM();
    if (currentMode === 'text') return;

    dom.editor.innerHTML = dom.codeEditor.value;
    dom.editor.style.display = '';
    dom.codeEditor.style.display = 'none';

    enableFormatButtons(true);
    currentMode = 'text';

    // Скидаємо стек undo для нового режиму
    initLastSavedContent(dom.editor.innerHTML);
    resetUndoStack();

    if (validateAndHighlight) validateAndHighlight();
}

/**
 * Перемкнути на режим коду
 */
export function switchToCodeMode(clearHighlights, validateOnly) {
    const dom = getHighlightDOM();
    if (currentMode === 'code') return;

    if (clearHighlights) clearHighlights();

    const cleanHtml = getCleanHtml();
    dom.codeEditor.value = formatHtmlCode(cleanHtml);

    dom.editor.style.display = 'none';
    dom.codeEditor.style.display = '';

    enableFormatButtons(false);
    currentMode = 'code';

    if (validateOnly) validateOnly();
}
