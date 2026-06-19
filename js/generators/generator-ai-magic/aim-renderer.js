// js/generators/generator-ai-magic/aim-renderer.js

/**
 * Renders AI Magic results inside the modal preview.
 */

import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';
import { getField, getModalDOM } from './aim-dom.js';
import { state } from './aim-state.js';

export function initAvatar(dom) {
    if (!dom?.avatarContainer) return;
    dom.avatarContainer.innerHTML = renderAvatarState('loading', {
        size: 'md',
        showMessage: false,
        containerClass: 'modal-confirm-avatar',
        avatarClass: 'modal-confirm-avatar-image',
    });
}

export function setStatus(dom, message, type = '') {
    if (!dom?.status) return;
    dom.status.textContent = message || '';
    dom.status.classList.remove('c-red', 'c-green', 'c-yellow');
    if (type) dom.status.classList.add(type);
}

export function setLoadingUI(dom, isLoading) {
    dom?.modal?.classList.toggle('is-loading', isLoading);
    if (dom?.generateBtn) {
        dom.generateBtn.textContent = isLoading ? 'Генерую...' : 'Заповнити';
    }
}

export function renderResult(modal) {
    const dom = getModalDOM(modal);
    const result = state.result;
    if (!dom || !result) return false;

    fillLanguage(modal, 'ua', result.ua);
    fillLanguage(modal, 'ru', result.ru);

    setField(modal, 'ai-magic-table-ua', result.table?.ua_text || '');
    setField(modal, 'ai-magic-table-ru', result.table?.ru_text || '');
    renderNotes(dom, result.manual_check_notes || []);

    if (!hasResultContent(result)) {
        dom.resultSection?.classList.add('u-hidden');
        dom.modal.classList.remove('has-result');
        setStatus(dom, 'AI повернув відповідь, але без полів для заповнення. Спробуй вставити текст/HTML сторінки або точну назву товару.', 'c-yellow');
        return false;
    }

    dom.resultSection?.classList.remove('u-hidden');
    dom.modal.classList.add('has-result');
    setStatus(dom, 'Готово. Перевір результат перед застосуванням.', 'c-green');
    requestAnimationFrame(() => dom.resultSection?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    return true;
}

function fillLanguage(modal, lang, data = {}) {
    const suffix = lang === 'ru' ? 'ru' : 'ua';
    setField(modal, `ai-magic-h1-${suffix}`, data.h1 || '');
    setField(modal, `ai-magic-seo-title-${suffix}`, data.seo_title || '');
    setField(modal, `ai-magic-seo-description-${suffix}`, data.seo_description || '');
    setField(modal, `ai-magic-seo-keywords-${suffix}`, Array.isArray(data.seo_keywords) ? data.seo_keywords.join(', ') : '');
    setField(modal, `ai-magic-description-${suffix}`, data.description_html || '');
}

function setField(modal, id, value) {
    const field = getField(modal, id);
    if (field) field.value = value || '';
}

function hasResultContent(result) {
    return [
        result?.source?.product_name_original,
        result?.source?.brand,
        result?.source?.packaging,
        result?.ua?.h1,
        result?.ua?.seo_title,
        result?.ua?.seo_description,
        ...(Array.isArray(result?.ua?.seo_keywords) ? result.ua.seo_keywords : []),
        result?.ua?.description_html,
        result?.ru?.h1,
        result?.ru?.seo_title,
        result?.ru?.seo_description,
        ...(Array.isArray(result?.ru?.seo_keywords) ? result.ru.seo_keywords : []),
        result?.ru?.description_html,
        result?.table?.ua_text,
        result?.table?.ru_text,
    ].some(value => String(value || '').trim());
}

function renderNotes(dom, notes) {
    if (!dom.notes) return;
    dom.notes.innerHTML = '';
    notes.filter(Boolean).forEach(note => {
        const badge = document.createElement('span');
        badge.className = 'badge c-yellow';
        badge.textContent = note;
        dom.notes.appendChild(badge);
    });
}
