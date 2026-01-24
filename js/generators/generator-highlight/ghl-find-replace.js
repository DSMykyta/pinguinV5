// js/generators/generator-highlight/ghl-find-replace.js

/**
 * FIND & REPLACE - Пошук і заміна тексту
 */

import { getHighlightDOM } from './ghl-dom.js';
import { getCurrentMode } from './ghl-mode.js';
import { saveUndoState, getCleanHtml, updateLastSavedContent } from './ghl-undo.js';
import { clearHighlights } from './ghl-highlights.js';
import { showToast } from '../../common/ui-toast.js';

/**
 * Знайти і замінити всі входження
 */
export function findAndReplaceAll(validateAndHighlight, validateOnly) {
    const dom = getHighlightDOM();
    const findText = dom.findInput?.value;
    if (!findText) return;

    const replaceText = dom.replaceInput?.value || '';

    saveUndoState();

    if (getCurrentMode() === 'text') {
        clearHighlights();
        let html = dom.editor.innerHTML;

        const escapedFind = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedFind, 'g');
        const count = (html.match(regex) || []).length;

        if (count === 0) {
            showToast(`Текст "${findText}" не знайдено`, 'info');
            return;
        }

        html = html.split(findText).join(replaceText);
        dom.editor.innerHTML = html;

        updateLastSavedContent();

        if (validateAndHighlight) validateAndHighlight();
        showToast(`Замінено "${findText}" на "${replaceText}" (${count} разів)`, 'success');

        dom.editor.focus();
    } else {
        const text = dom.codeEditor.value;
        const escapedFind = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedFind, 'g');
        const count = (text.match(regex) || []).length;

        if (count === 0) {
            showToast(`Текст "${findText}" не знайдено`, 'info');
            return;
        }

        dom.codeEditor.value = text.split(findText).join(replaceText);
        if (validateOnly) validateOnly();
        showToast(`Замінено "${findText}" на "${replaceText}" (${count} разів)`, 'success');

        dom.codeEditor.focus();
    }
}
