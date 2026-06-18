// js/generators/generator-ai-magic/aim-dom.js

/**
 * DOM lookups for the Instruments AI Magic module.
 */

export function getModalDOM(modal = document.getElementById('modal-ai-magic-modal')) {
    if (!modal) return null;

    return {
        modal,
        avatarContainer: modal.querySelector('#ai-magic-avatar-container'),
        avatarMessage: modal.querySelector('#ai-magic-avatar-message'),
        sourceInput: modal.querySelector('#ai-magic-source'),
        sourceText: modal.querySelector('#ai-magic-source-text'),
        rules: modal.querySelector('#ai-magic-rules'),
        generateBtn: modal.querySelector('#ai-magic-generate-btn'),
        resultSection: modal.querySelector('#ai-magic-result'),
        status: modal.querySelector('#ai-magic-status'),
        notes: modal.querySelector('#ai-magic-notes'),
        applySeoBtn: modal.querySelector('#ai-magic-apply-seo-btn'),
        applyTextBtn: modal.querySelector('#ai-magic-apply-text-btn'),
        applyTableBtn: modal.querySelector('#ai-magic-apply-table-btn'),
        applyAllBtn: modal.querySelector('#ai-magic-apply-all-btn'),
    };
}

export function getSelectedLanguage(modal) {
    return modal?.querySelector('input[name="ai-magic-apply-lang"]:checked')?.value || 'ua';
}

export function getPageDOM() {
    return {
        brandName: document.getElementById('brand-name'),
        productName: document.getElementById('product-name'),
        packaging: document.getElementById('product-packaging'),
        seoTitle: document.getElementById('seo-title'),
        seoDescription: document.getElementById('seo-description'),
        seoKeywords: document.getElementById('seo-keywords'),
        seoTitleCounter: document.getElementById('seo-title-counter'),
        seoDescriptionCounter: document.getElementById('seo-description-counter'),
        seoKeywordsCounter: document.getElementById('seo-keywords-counter'),
        textEditor: document.getElementById('ghl-editor'),
    };
}

export function getField(modal, id) {
    return modal?.querySelector(`#${id}`) || null;
}
