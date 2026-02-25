// js/common/editor/editor-utils.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🔧 УТИЛІТИ — Допоміжні функції для плагінів                             ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Не є плагіном — використовується іншими плагінами.                      ║
 * ║  Якщо видалити — плагіни paste, undo можуть не працювати.                ║
 * ║                                                                          ║
 * ║  РІВНІ ОЧИСТКИ:                                                          ║
 * ║  ├── sanitizeStructure(state)  — мінімум, тільки структура               ║
 * ║  ├── sanitizeHtml(html, opts)  — повна очистка рядка                     ║
 * ║  └── sanitizeEditor(state)     — повна очистка DOM (після paste)         ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// Re-export escapeHtml from central text-utils
export { escapeHtml } from '../../utils/text-utils.js';

/**
 * Зберегти позицію курсора
 */
export function saveCaretPosition(element) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.startContainer, range.startOffset);

    return {
        start: preCaretRange.toString().length,
        end: preCaretRange.toString().length + range.toString().length
    };
}

/**
 * Відновити позицію курсора
 */
export function restoreCaretPosition(element, position) {
    if (!position) return;

    const selection = window.getSelection();
    const range = document.createRange();

    let charIndex = 0;
    const nodeStack = [element];
    let node, foundStart = false, foundEnd = false;

    while (!foundEnd && (node = nodeStack.pop())) {
        if (node.nodeType === Node.TEXT_NODE) {
            const nextCharIndex = charIndex + node.length;

            if (!foundStart && position.start >= charIndex && position.start <= nextCharIndex) {
                range.setStart(node, position.start - charIndex);
                foundStart = true;
            }

            if (foundStart && position.end >= charIndex && position.end <= nextCharIndex) {
                range.setEnd(node, position.end - charIndex);
                foundEnd = true;
            }

            charIndex = nextCharIndex;
        } else {
            let i = node.childNodes.length;
            while (i--) {
                nodeStack.push(node.childNodes[i]);
            }
        }
    }

    if (foundStart) {
        selection.removeAllRanges();
        selection.addRange(range);
    }
}


/**
 * Очищення HTML рядка (для copy/save/paste)
 * @param {string} html
 * @param {Object} options - { allowLinks, allowImages, allowStyles }
 */
export function sanitizeHtml(html, options = {}) {
    const { allowLinks = false, allowImages = false, allowStyles = false } = options;

    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Видаляємо небезпечні теги
    const dangerousSelector = allowImages
        ? 'script, style, iframe, object, embed, meta, link'
        : 'script, style, iframe, object, embed, img, meta, link';
    temp.querySelectorAll(dangerousSelector).forEach(el => {
        el.remove();
    });

    // Посилання
    if (!allowLinks) {
        temp.querySelectorAll('a').forEach(a => {
            const text = document.createTextNode(a.textContent);
            a.parentNode.replaceChild(text, a);
        });
    }

    // Конвертуємо PRE в P (тільки якщо не всередині іншого блочного елемента)
    temp.querySelectorAll('pre').forEach(pre => {
        if (!pre.closest('p')) {
            const p = document.createElement('p');
            p.innerHTML = pre.innerHTML;
            pre.parentNode.replaceChild(p, pre);
        } else {
            const fragment = document.createDocumentFragment();
            while (pre.firstChild) {
                fragment.appendChild(pre.firstChild);
            }
            pre.parentNode.replaceChild(fragment, pre);
        }
    });

    // Конвертуємо DIV в P (з урахуванням вкладеності)
    let divs = Array.from(temp.querySelectorAll('div'));
    while (divs.length > 0) {
        const leafDiv = divs.find(div => !div.querySelector('div'));
        if (!leafDiv) break;

        if (!leafDiv.closest('p')) {
            const p = document.createElement('p');
            p.innerHTML = leafDiv.innerHTML;
            leafDiv.parentNode.replaceChild(p, leafDiv);
        } else {
            const fragment = document.createDocumentFragment();
            while (leafDiv.firstChild) {
                fragment.appendChild(leafDiv.firstChild);
            }
            leafDiv.parentNode.replaceChild(fragment, leafDiv);
        }

        divs = Array.from(temp.querySelectorAll('div'));
    }

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

    // Виносимо UL/OL з P (невалідна структура <p><ul>)
    temp.querySelectorAll('p > ul, p > ol').forEach(list => {
        const p = list.parentNode;
        p.parentNode.insertBefore(list, p.nextSibling);
        if (!p.textContent.trim()) {
            p.remove();
        }
    });

    // Видаляємо атрибути (з урахуванням дозволених)
    temp.querySelectorAll('*').forEach(el => {
        const isHighlight = el.classList?.contains('highlight-error');
        const keep = {};

        if (allowLinks && el.tagName === 'A' && el.hasAttribute('href')) {
            keep.href = el.getAttribute('href');
        }
        if (allowImages && el.tagName === 'IMG') {
            if (el.hasAttribute('src')) keep.src = el.getAttribute('src');
            if (el.hasAttribute('alt')) keep.alt = el.getAttribute('alt');
        }
        if (allowStyles && el.hasAttribute('style')) {
            keep.style = el.getAttribute('style');
        }

        while (el.attributes && el.attributes.length > 0) {
            el.removeAttribute(el.attributes[0].name);
        }
        Object.entries(keep).forEach(([k, v]) => el.setAttribute(k, v));

        if (isHighlight) {
            el.className = 'highlight-error';
        }
    });

    // Видаляємо порожні параграфи (включаючи ті що містять тільки <br>)
    temp.querySelectorAll('p').forEach(p => {
        const hasOnlyBr = !p.textContent.trim() && p.querySelector('br');
        const isEmpty = !p.textContent.trim() && !p.children.length;
        if (isEmpty || hasOnlyBr) {
            p.remove();
        }
    });

    // Отримуємо HTML і очищаємо
    let result = temp.innerHTML;

    // Замінюємо тільки &nbsp; на звичайний пробіл
    result = result.replace(/&nbsp;/g, ' ');

    // Видаляємо маркери списків
    result = result.replace(/[•·●○■□▪▫]/g, '');

    // Видаляємо contentReference (від ChatGPT)
    result = result.replace(/:contentReference\[oaicite:\d+\]\{index=\d+\}/g, '');

    // Очищаємо множинні пробіли
    result = result.replace(/ {2,}/g, ' ');

    return result;
}


/**
 * Структурна очистка DOM (для input — мінімальна)
 * НЕ видаляє контент, НЕ видаляє порожні теги, тільки фіксить структуру
 */
export function sanitizeStructure(state) {
    const editor = state.dom.editor;
    if (!editor || state.currentMode !== 'text') return;

    // Не модифікуємо DOM якщо є активне виділення — інакше воно скинеться
    const sel = window.getSelection();
    if (sel.rangeCount && !sel.getRangeAt(0).collapsed) return;

    state.isSanitizing = true;
    const caretPos = saveCaretPosition(editor);
    let changed = false;

    const blockTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'HR', 'BR'];

    // Видаляємо браузерні span-артефакти (Chrome вставляє <span style="font-family: inherit;"> тощо)
    // Зберігаємо highlight-error/warning від валідації
    editor.querySelectorAll('span:not(.highlight-error):not(.highlight-warning)').forEach(span => {
        const fragment = document.createDocumentFragment();
        while (span.firstChild) {
            fragment.appendChild(span.firstChild);
        }
        span.parentNode.replaceChild(fragment, span);
        changed = true;
    });

    // Огортаємо "голі" текстові ноди та inline-елементи в <p>
    Array.from(editor.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            const p = document.createElement('p');
            p.textContent = node.textContent;
            node.parentNode.replaceChild(p, node);
            changed = true;
        } else if (node.nodeType === Node.ELEMENT_NODE && !blockTags.includes(node.tagName)) {
            const p = document.createElement('p');
            node.parentNode.insertBefore(p, node);
            p.appendChild(node);
            changed = true;
        }
    });

    // div → p (браузерний артефакт)
    let editorDivs = Array.from(editor.querySelectorAll('div'));
    while (editorDivs.length > 0) {
        const leafDiv = editorDivs.find(div => !div.querySelector('div'));
        if (!leafDiv) break;

        if (!leafDiv.closest('p')) {
            const p = document.createElement('p');
            p.innerHTML = leafDiv.innerHTML;
            leafDiv.parentNode.replaceChild(p, leafDiv);
        } else {
            const fragment = document.createDocumentFragment();
            while (leafDiv.firstChild) {
                fragment.appendChild(leafDiv.firstChild);
            }
            leafDiv.parentNode.replaceChild(fragment, leafDiv);
        }
        changed = true;
        editorDivs = Array.from(editor.querySelectorAll('div'));
    }

    // Фікс вкладеності блочних елементів
    editor.querySelectorAll('p p, p h1, p h2, p h3, h1 p, h2 p, h3 p').forEach(nested => {
        const parent = nested.parentNode;
        if (parent && parent !== editor) {
            parent.parentNode.insertBefore(nested, parent.nextSibling);
            changed = true;
        }
    });

    // Виносимо UL/OL з P
    editor.querySelectorAll('p > ul, p > ol').forEach(list => {
        const p = list.parentNode;
        p.parentNode.insertBefore(list, p.nextSibling);
        if (!p.textContent.trim()) p.remove();
        changed = true;
    });

    if (changed) {
        editor.normalize();
        restoreCaretPosition(editor, caretPos);
    }

    state.isSanitizing = false;
}


/**
 * Повна очистка DOM редактора (для paste)
 * Використовує state.allowLinks / allowImages / allowStyles
 */
export function sanitizeEditor(state) {
    const editor = state.dom.editor;
    if (!editor || state.currentMode !== 'text') return;

    // Не модифікуємо DOM якщо є активне виділення
    const sel = window.getSelection();
    if (sel.rangeCount && !sel.getRangeAt(0).collapsed) return;

    state.isSanitizing = true;
    const caretPos = saveCaretPosition(editor);
    let changed = false;

    const blockTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'HR', 'BR'];

    // Огортаємо "голі" текстові ноди та inline-елементи в <p>
    Array.from(editor.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            const p = document.createElement('p');
            p.textContent = node.textContent;
            node.parentNode.replaceChild(p, node);
            changed = true;
        } else if (node.nodeType === Node.ELEMENT_NODE && !blockTags.includes(node.tagName)) {
            const p = document.createElement('p');
            node.parentNode.insertBefore(p, node);
            p.appendChild(node);
            changed = true;
        }
    });

    // Видаляємо небезпечні теги
    const dangerousSelector = state.allowImages
        ? 'script, style, iframe, object, embed, meta, link'
        : 'script, style, iframe, object, embed, img, meta, link';
    editor.querySelectorAll(dangerousSelector).forEach(el => {
        el.remove();
        changed = true;
    });

    // Посилання
    if (!state.allowLinks) {
        editor.querySelectorAll('a').forEach(a => {
            const text = document.createTextNode(a.textContent);
            a.parentNode.replaceChild(text, a);
            changed = true;
        });
    }

    // Конвертуємо PRE в P
    editor.querySelectorAll('pre').forEach(pre => {
        if (!pre.closest('p')) {
            const p = document.createElement('p');
            p.innerHTML = pre.innerHTML;
            pre.parentNode.replaceChild(p, pre);
        } else {
            const fragment = document.createDocumentFragment();
            while (pre.firstChild) {
                fragment.appendChild(pre.firstChild);
            }
            pre.parentNode.replaceChild(fragment, pre);
        }
        changed = true;
    });

    // Конвертуємо DIV в P
    let editorDivs = Array.from(editor.querySelectorAll('div'));
    while (editorDivs.length > 0) {
        const leafDiv = editorDivs.find(div => !div.querySelector('div'));
        if (!leafDiv) break;

        if (!leafDiv.closest('p')) {
            const p = document.createElement('p');
            p.innerHTML = leafDiv.innerHTML;
            leafDiv.parentNode.replaceChild(p, leafDiv);
        } else {
            const fragment = document.createDocumentFragment();
            while (leafDiv.firstChild) {
                fragment.appendChild(leafDiv.firstChild);
            }
            leafDiv.parentNode.replaceChild(fragment, leafDiv);
        }
        changed = true;
        editorDivs = Array.from(editor.querySelectorAll('div'));
    }

    // Конвертуємо B в STRONG
    editor.querySelectorAll('b').forEach(b => {
        const strong = document.createElement('strong');
        strong.innerHTML = b.innerHTML;
        b.parentNode.replaceChild(strong, b);
        changed = true;
    });

    // Конвертуємо I в EM
    editor.querySelectorAll('i').forEach(i => {
        const em = document.createElement('em');
        em.innerHTML = i.innerHTML;
        i.parentNode.replaceChild(em, i);
        changed = true;
    });

    // Видаляємо ВСІ SPAN (включаючи highlights — будуть відновлені)
    editor.querySelectorAll('span').forEach(span => {
        const fragment = document.createDocumentFragment();
        while (span.firstChild) {
            fragment.appendChild(span.firstChild);
        }
        span.parentNode.replaceChild(fragment, span);
        changed = true;
    });

    // Видаляємо FONT (залишаємо вміст)
    editor.querySelectorAll('font').forEach(font => {
        const fragment = document.createDocumentFragment();
        while (font.firstChild) {
            fragment.appendChild(font.firstChild);
        }
        font.parentNode.replaceChild(fragment, font);
        changed = true;
    });

    // Видаляємо атрибути (з урахуванням дозволених)
    const attrSelector = 'p, strong, em, h1, h2, h3, ul, li'
        + (state.allowLinks ? ', a' : '')
        + (state.allowImages ? ', img' : '');
    editor.querySelectorAll(attrSelector).forEach(el => {
        const keep = {};
        if (state.allowLinks && el.tagName === 'A' && el.hasAttribute('href')) {
            keep.href = el.getAttribute('href');
        }
        if (state.allowImages && el.tagName === 'IMG') {
            if (el.hasAttribute('src')) keep.src = el.getAttribute('src');
            if (el.hasAttribute('alt')) keep.alt = el.getAttribute('alt');
        }
        if (state.allowStyles && el.hasAttribute('style')) {
            keep.style = el.getAttribute('style');
        }
        while (el.attributes.length > 0) {
            el.removeAttribute(el.attributes[0].name);
        }
        Object.entries(keep).forEach(([k, v]) => el.setAttribute(k, v));
    });

    // Виносимо UL/OL з P
    editor.querySelectorAll('p > ul, p > ol').forEach(list => {
        const p = list.parentNode;
        p.parentNode.insertBefore(list, p.nextSibling);
        if (!p.textContent.trim()) {
            p.remove();
        }
        changed = true;
    });

    // Виправляємо вкладені блочні елементи
    editor.querySelectorAll('p p, p h1, p h2, p h3, h1 p, h2 p, h3 p').forEach(nested => {
        const parent = nested.parentNode;
        if (parent && parent !== editor) {
            parent.parentNode.insertBefore(nested, parent.nextSibling);
            changed = true;
        }
    });

    // Видаляємо порожні P теги
    editor.querySelectorAll('p').forEach(p => {
        if (!p.textContent.trim() && !p.querySelector('br, img')) {
            p.remove();
            changed = true;
        }
    });

    if (changed) {
        editor.normalize();
        restoreCaretPosition(editor, caretPos);
    }

    state.isSanitizing = false;
}
