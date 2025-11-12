// js/generators/generator-text/gte-formatting.js

import { getTextDOM } from './gte-dom.js';

// --- Логіка обгортання тексту (з твого файлу) ---
function wrapTag(tag) {
    const { inputMarkup } = getTextDOM();
    const { value, selectionStart, selectionEnd } = inputMarkup;
    const sel = value.slice(selectionStart, selectionEnd);
    const before = value.slice(0, selectionStart);
    const after  = value.slice(selectionEnd);
    const wrapped = `<${tag}>${sel}</${tag}>`;
    inputMarkup.value = before + wrapped + after;
    
    const pos = before.length + wrapped.length;
    inputMarkup.focus();
    inputMarkup.setSelectionRange(pos, pos);
}

function makeLowercase() {
    const { inputMarkup } = getTextDOM();
    const { value, selectionStart, selectionEnd } = inputMarkup;
    const sel = value.slice(selectionStart, selectionEnd).toLowerCase();
    inputMarkup.setRangeText(sel, selectionStart, selectionEnd, 'end');
    inputMarkup.focus();
}

// --- Функція, яка "включає" всі ці кнопки ---
export function initFormattingButtons() {
    const dom = getTextDOM();

    if (dom.boldBtn)      dom.boldBtn.addEventListener('click', () => wrapTag('strong'));
    if (dom.h1Btn)        dom.h1Btn.addEventListener('click', () => wrapTag('h1'));
    if (dom.h2Btn)        dom.h2Btn.addEventListener('click', () => wrapTag('h2'));
    if (dom.h3Btn)        dom.h3Btn.addEventListener('click', () => wrapTag('h3'));
    if (dom.lowercaseBtn) dom.lowercaseBtn.addEventListener('click', makeLowercase);
}