// js/common/editor/editor-utils.js

/**
 * 🔧 УТИЛІТИ — Допоміжні функції для плагінів
 *
 * Не є плагіном, але використовується іншими плагінами.
 * Якщо видалити — плагіни paste, undo можуть не працювати.
 */

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
        const isHighlight = el.classList?.contains('highlight-error');
        while (el.attributes && el.attributes.length > 0) {
            el.removeAttribute(el.attributes[0].name);
        }
        if (isHighlight) {
            el.className = 'highlight-error';
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
export function sanitizeEditor(state) {
    const editor = state.dom.editor;
    if (!editor || state.currentMode !== 'text') return;

    // Зберігаємо позицію курсора
    const caretPos = saveCaretPosition(editor);

    let changed = false;

    // Огортаємо "голі" текстові ноди в <p>
    Array.from(editor.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            const p = document.createElement('p');
            p.textContent = node.textContent;
            node.parentNode.replaceChild(p, node);
            changed = true;
        }
    });

    // Видаляємо небезпечні та непотрібні теги повністю
    editor.querySelectorAll('script, style, iframe, object, embed, img, meta, link').forEach(el => {
        el.remove();
        changed = true;
    });

    // Конвертуємо посилання <a> - залишаємо тільки текст
    editor.querySelectorAll('a').forEach(a => {
        const text = document.createTextNode(a.textContent);
        a.parentNode.replaceChild(text, a);
        changed = true;
    });

    // Конвертуємо PRE в P
    editor.querySelectorAll('pre').forEach(pre => {
        const p = document.createElement('p');
        p.innerHTML = pre.innerHTML;
        pre.parentNode.replaceChild(p, pre);
        changed = true;
    });

    // Конвертуємо DIV в P
    editor.querySelectorAll('div').forEach(div => {
        const p = document.createElement('p');
        p.innerHTML = div.innerHTML;
        div.parentNode.replaceChild(p, div);
        changed = true;
    });

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

    // Видаляємо ВСІ SPAN (включаючи highlights - будуть відновлені)
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

    // Видаляємо всі атрибути з дозволених тегів
    editor.querySelectorAll('p, strong, em, h1, h2, h3, ul, li').forEach(el => {
        while (el.attributes.length > 0) {
            el.removeAttribute(el.attributes[0].name);
        }
    });

    if (changed) {
        editor.normalize();
        restoreCaretPosition(editor, caretPos);
    }
}
