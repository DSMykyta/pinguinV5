// js/generators/generator-ai-magic/aim-renderer.js

/**
 * Renders AI Magic results into standalone copy fields.
 */

import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';
import { getAiMagicDOM, getField } from './aim-dom.js';
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
    dom?.surface?.classList.toggle('is-loading', isLoading);
    if (dom?.generateBtn) {
        dom.generateBtn.textContent = isLoading ? 'Генерую...' : 'Заповнити';
    }
}

export function renderResult(surface) {
    const dom = getAiMagicDOM(surface);
    const result = state.result;
    if (!dom || !result) return false;

    fillLanguage(surface, 'ua', result.ua);
    fillLanguage(surface, 'ru', result.ru);

    setField(surface, 'ai-magic-table-ua', result.table?.ua_text || '');
    setField(surface, 'ai-magic-table-ru', result.table?.ru_text || '');
    setField(surface, 'ai-magic-images', Array.isArray(result.source?.image_urls) ? result.source.image_urls.join('\n') : '');
    renderNotes(dom, result.manual_check_notes || []);

    if (!hasResultContent(result)) {
        dom.resultSection?.classList.add('u-hidden');
        dom.surface.classList.remove('has-result');
        setStatus(dom, 'AI повернув відповідь, але без полів для заповнення. Спробуй вставити текст/HTML сторінки або точну назву товару.', 'c-yellow');
        return false;
    }

    dom.resultSection?.classList.remove('u-hidden');
    dom.surface.classList.add('has-result');
    setStatus(dom, 'Готово. Перевір результат перед копіюванням.', 'c-green');
    requestAnimationFrame(() => dom.resultSection?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    return true;
}

function fillLanguage(surface, lang, data = {}) {
    const suffix = lang === 'ru' ? 'ru' : 'ua';
    setField(surface, `ai-magic-h1-${suffix}`, data.h1 || '');
    setField(surface, `ai-magic-seo-title-${suffix}`, data.seo_title || '');
    setField(surface, `ai-magic-seo-description-${suffix}`, data.seo_description || '');
    setField(surface, `ai-magic-seo-keywords-${suffix}`, Array.isArray(data.seo_keywords) ? data.seo_keywords.join(', ') : '');
    setField(surface, `ai-magic-description-${suffix}`, data.description_html || '');
}

function setField(surface, id, value) {
    const field = getField(surface, id);
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
        ...(Array.isArray(result?.source?.image_urls) ? result.source.image_urls : []),
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
