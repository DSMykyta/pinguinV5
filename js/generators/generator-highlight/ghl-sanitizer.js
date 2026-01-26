// js/generators/generator-highlight/ghl-sanitizer.js

/**
 * SANITIZER - Очищення HTML від небезпечних/непотрібних елементів
 */

import { getHighlightDOM } from './ghl-dom.js';
import { getCurrentMode } from './ghl-mode.js';
import { saveCaretPosition, restoreCaretPosition } from './ghl-caret.js';

// Флаг для пропуску відновлення курсора (після Enter)
let skipCaretRestore = false;

/**
 * Встановити флаг пропуску відновлення курсора
 */
export function setSkipCaretRestore(value) {
    skipCaretRestore = value;
    // Автоматично скидаємо через 200ms
    if (value) {
        setTimeout(() => {
            skipCaretRestore = false;
        }, 200);
    }
}

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

    // Зберігаємо позицію курсора
    const caretPos = saveCaretPosition(dom.editor);

    let changed = false;

    // Огортаємо "голі" текстові ноди в <p>
    Array.from(dom.editor.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            const p = document.createElement('p');
            p.textContent = node.textContent;
            node.parentNode.replaceChild(p, node);
            changed = true;
        }
    });

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

    // Видаляємо ВСІ SPAN (включаючи highlight-banned-word - він буде відновлений validateAndHighlight)
    dom.editor.querySelectorAll('span').forEach(span => {
        const fragment = document.createDocumentFragment();
        while (span.firstChild) {
            fragment.appendChild(span.firstChild);
        }
        span.parentNode.replaceChild(fragment, span);
        changed = true;
    });

    // Видаляємо FONT (залишаємо вміст)
    dom.editor.querySelectorAll('font').forEach(font => {
        const fragment = document.createDocumentFragment();
        while (font.firstChild) {
            fragment.appendChild(font.firstChild);
        }
        font.parentNode.replaceChild(fragment, font);
        changed = true;
    });

    // Видаляємо всі атрибути (style, class, etc.) з дозволених тегів
    dom.editor.querySelectorAll('p, strong, em, h1, h2, h3, ul, li').forEach(el => {
        while (el.attributes.length > 0) {
            el.removeAttribute(el.attributes[0].name);
        }
    });

    // НЕ видаляємо порожні параграфи тут - це ламає позицію курсора після Enter
    // Порожні параграфи видаляються тільки при копіюванні (sanitizeHtml)

    if (changed) {
        dom.editor.normalize();
        // Відновлюємо позицію курсора тільки якщо були зміни і не встановлено флаг пропуску
        if (!skipCaretRestore) {
            restoreCaretPosition(dom.editor, caretPos);
        }
    }
}
