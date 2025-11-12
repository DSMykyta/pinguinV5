// js/generators/generator-text/gte-results.js

import { getTextDOM } from './gte-dom.js';
import { copyToClipboard, showCopiedFeedback } from './gte-utils.js';
import { generateTextHtml, generateTextBr, generateTextClean, generateTextKeepTags } from './gte-builder.js';

function activateResultCard(cardElement, generatorFunction) {
    if (!cardElement) return;

    cardElement.addEventListener('click', async (e) => {
        if (e.target.closest('[data-dropdown-trigger]')) return;

        const dom = getTextDOM();
        const textToProcess = dom.inputMarkup.value || '';

        if (!textToProcess.trim()) {
            console.error('[Result Card] Empty input!');
            return;
        }

        const result = generatorFunction(textToProcess);

        if (!result || result.trim() === '') {
            console.error('[Result Card] Empty result!');
            return;
        }

        await copyToClipboard(result);
        showCopiedFeedback(cardElement);
    });
}

/**
 * Обробляє modal-opened event для preview
 */
function handleModalOpened(event) {
    const { modalId, trigger } = event.detail;

    // Перевіряємо чи це preview-modal-text
    if (modalId !== 'preview-modal-text') return;

    // Перевіряємо чи trigger має preview-target
    const previewType = trigger?.dataset?.previewTarget;
    if (!previewType) return;

    // Перевіряємо чи це текстовий preview
    if (!['html', 'br', 'clean', 'keep-tags'].includes(previewType)) return;

    const dom = getTextDOM();
    const textToProcess = dom.inputMarkup.value || '';

    if (!textToProcess.trim()) {
        const contentTarget = document.getElementById('preview-content-target-text');
        if (contentTarget) {
            contentTarget.innerHTML = `<p style="color: var(--text-secondary);">Введіть текст для попереднього перегляду</p>`;
        }
        return;
    }

    setTimeout(() => {
        const contentTarget = document.getElementById('preview-content-target-text');
        if (!contentTarget) return;

        let generatedContent = '';
        let displayAsHtml = false; // Чи відображати як HTML (рендерити), чи як текст

        switch (previewType) {
            case 'html':
                generatedContent = generateTextHtml(textToProcess);
                displayAsHtml = true;
                break;
            case 'br':
                generatedContent = generateTextBr(textToProcess);
                displayAsHtml = true;
                break;
            case 'clean':
                generatedContent = generateTextClean(textToProcess);
                displayAsHtml = false;
                break;
            case 'keep-tags':
                generatedContent = generateTextKeepTags(textToProcess);
                displayAsHtml = true;
                break;
        }

        // Завжди показуємо код в textarea
        contentTarget.innerHTML = `<textarea class="input-main" readonly style="width: 100%; height: 400px; resize: vertical; font-family: monospace; padding: 16px;">${escapeHtml(generatedContent)}</textarea>`;
    }, 50);
}

// Допоміжна функція для екранування HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Очищає HTML від підсвічування (mark теги)
function cleanHighlights(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Видаляємо всі mark теги
    const marks = tempDiv.querySelectorAll('mark.banned-word-highlight');
    marks.forEach(mark => {
        const textNode = document.createTextNode(mark.textContent);
        mark.parentNode.replaceChild(textNode, mark);
    });

    return tempDiv.innerHTML;
}

export function initResultCards() {
    const dom = getTextDOM();
    
    activateResultCard(dom.resultCardHtml,       generateTextHtml);
    activateResultCard(dom.resultCardBr,         generateTextBr);
    activateResultCard(dom.resultCardClean,      generateTextClean);
    activateResultCard(dom.resultCardCleanTags,  generateTextKeepTags);

    // Слухаємо modal-opened event
    document.addEventListener('modal-opened', handleModalOpened);
}
