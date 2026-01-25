// js/generators/generator-highlight/ghl-sanitizer.js

/**
 * SANITIZER - Очищення HTML від небезпечних/непотрібних елементів
 */

import { getHighlightDOM } from './ghl-dom.js';
import { getCurrentMode } from './ghl-mode.js';

/**
 * Екранування HTML символів
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Очищення HTML рядка
 */
export function sanitizeHtml(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Видаляємо небезпечні та непотрібні теги повністю
    temp.querySelectorAll('script, style, iframe, object, embed, img, meta, link').forEach(el => {
        el.remove();
    });

    // Конвертуємо посилання <a> - залишаємо тільки текст
    temp.querySelectorAll('a').forEach(a => {
        const text = document.createTextNode(a.textContent);
        a.parentNode.replaceChild(text, a);
    });

    // Конвертуємо PRE в P
    temp.querySelectorAll('pre').forEach(pre => {
        const p = document.createElement('p');
        p.innerHTML = pre.innerHTML;
        pre.parentNode.replaceChild(p, pre);
    });

    // Конвертуємо DIV в P
    temp.querySelectorAll('div').forEach(div => {
        const p = document.createElement('p');
        p.innerHTML = div.innerHTML;
        div.parentNode.replaceChild(p, div);
    });

    // Конвертуємо B в STRONG, I в EM
    temp.querySelectorAll('b').forEach(b => {
        const strong = document.createElement('strong');
        strong.innerHTML = b.innerHTML;
        b.parentNode.replaceChild(strong, b);
    });

    temp.querySelectorAll('i').forEach(i => {
        const em = document.createElement('em');
        em.innerHTML = i.innerHTML;
        i.parentNode.replaceChild(em, i);
    });

    // Видаляємо SPAN (залишаємо вміст)
    temp.querySelectorAll('span').forEach(span => {
        const fragment = document.createDocumentFragment();
        while (span.firstChild) {
            fragment.appendChild(span.firstChild);
        }
        span.parentNode.replaceChild(fragment, span);
    });

    // Видаляємо всі атрибути з дозволених тегів
    temp.querySelectorAll('*').forEach(el => {
        const isHighlight = el.classList?.contains('highlight-banned-word');
        while (el.attributes && el.attributes.length > 0) {
            el.removeAttribute(el.attributes[0].name);
        }
        if (isHighlight) {
            el.className = 'highlight-banned-word';
        }
    });

    // Видаляємо порожні параграфи
    temp.querySelectorAll('p').forEach(p => {
        if (!p.textContent.trim() && !p.querySelector('br')) {
            p.remove();
        }
    });

    // Отримуємо HTML і очищаємо
    let result = temp.innerHTML;

    // Декодуємо HTML entities
    result = result
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    // Видаляємо маркери списків
    result = result.replace(/[•·●○■□▪▫]/g, '');

    // Видаляємо contentReference (від ChatGPT)
    result = result.replace(/:contentReference\[oaicite:\d+\]\{index=\d+\}/g, '');

    // Очищаємо множинні пробіли
    result = result.replace(/ {2,}/g, ' ');

    return result;
}

/**
 * Очищення DOM редактора напряму
 */
export function sanitizeEditor() {
    const dom = getHighlightDOM();
    if (!dom.editor || getCurrentMode() !== 'text') return;

    let changed = false;

    // Видаляємо небезпечні та непотрібні теги повністю
    dom.editor.querySelectorAll('script, style, iframe, object, embed, img, meta, link').forEach(el => {
        el.remove();
        changed = true;
    });

    // Конвертуємо посилання <a> - залишаємо тільки текст
    dom.editor.querySelectorAll('a').forEach(a => {
        const text = document.createTextNode(a.textContent);
        a.parentNode.replaceChild(text, a);
        changed = true;
    });

    // Конвертуємо PRE в P
    dom.editor.querySelectorAll('pre').forEach(pre => {
        const p = document.createElement('p');
        p.innerHTML = pre.innerHTML;
        pre.parentNode.replaceChild(p, pre);
        changed = true;
    });

    // Конвертуємо DIV в P
    dom.editor.querySelectorAll('div').forEach(div => {
        const p = document.createElement('p');
        p.innerHTML = div.innerHTML;
        div.parentNode.replaceChild(p, div);
        changed = true;
    });

    // Конвертуємо B в STRONG
    dom.editor.querySelectorAll('b').forEach(b => {
        const strong = document.createElement('strong');
        strong.innerHTML = b.innerHTML;
        b.parentNode.replaceChild(strong, b);
        changed = true;
    });

    // Конвертуємо I в EM
    dom.editor.querySelectorAll('i').forEach(i => {
        const em = document.createElement('em');
        em.innerHTML = i.innerHTML;
        i.parentNode.replaceChild(em, i);
        changed = true;
    });

    // Видаляємо SPAN (залишаємо вміст) - крім highlight-banned-word
    dom.editor.querySelectorAll('span:not(.highlight-banned-word)').forEach(span => {
        const fragment = document.createDocumentFragment();
        while (span.firstChild) {
            fragment.appendChild(span.firstChild);
        }
        span.parentNode.replaceChild(fragment, span);
        changed = true;
    });

    // Видаляємо всі атрибути (style, class, etc.) з дозволених тегів
    dom.editor.querySelectorAll('p, strong, em, h2, h3, ul, li').forEach(el => {
        while (el.attributes.length > 0) {
            el.removeAttribute(el.attributes[0].name);
        }
    });

    // Видаляємо порожні параграфи
    dom.editor.querySelectorAll('p').forEach(p => {
        if (!p.textContent.trim() && !p.querySelector('br')) {
            p.remove();
            changed = true;
        }
    });

    // Очищаємо текстові ноди від маркерів списків та entities
    const walker = document.createTreeWalker(dom.editor, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
        let text = node.textContent;
        const original = text;

        // Видаляємо маркери списків
        text = text.replace(/[•·●○■□▪▫]/g, '');

        // Декодуємо &nbsp;
        text = text.replace(/\u00A0/g, ' ');

        // Очищаємо множинні пробіли
        text = text.replace(/ {2,}/g, ' ');

        if (text !== original) {
            node.textContent = text;
            changed = true;
        }
    }

    if (changed) {
        dom.editor.normalize();
    }
}
