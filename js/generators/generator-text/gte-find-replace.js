// js/generators/generator-text/gte-find-replace.js
import { getTextDOM } from './gte-dom.js';
import { showToast } from '../../common/ui-toast.js';

/**
 * Знаходить та замінює текст в HTML зі збереженням структури
 */
function findAndReplaceAll() {
    const dom = getTextDOM();
    const findText = dom.findInput.value;
    if (!findText) return;

    const replaceText = dom.replaceInput.value;

    // Екрануємо спецсимволи для RegExp
    const escapedFind = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedFind, 'g');

    // Працюємо з textarea value
    const text = dom.inputMarkup.value;
    const newText = text.split(findText).join(replaceText);
    const count = (text.match(regex) || []).length;

    if (count === 0) {
        showToast(`Текст "${findText}" не знайдено`, 'info');
        return;
    }

    // Замінюємо текст
    dom.inputMarkup.value = newText;

    dom.inputMarkup.focus();

    // Тригеримо input event для оновлення валідації та підсвічування
    setTimeout(() => {
        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
        dom.inputMarkup.dispatchEvent(inputEvent);
    }, 0);

    showToast(`Замінено "${findText}" на "${replaceText}" (${count} разів)`, 'success');
}

export function initFindAndReplace() {
    const dom = getTextDOM();
    if (dom.replaceAllBtn) {
        dom.replaceAllBtn.addEventListener('click', findAndReplaceAll);
    }
}