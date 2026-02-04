// js/common/editor/editor-utils.js

/**
 * 🔧 УТИЛІТИ — Допоміжні функції для плагінів
 *
 * Не є плагіном, але використовується іншими плагінами.
 * Якщо видалити — плагіни paste, undo можуть не працювати.
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

    // Конвертуємо PRE в P (тільки якщо не всередині іншого блочного елемента)
    temp.querySelectorAll('pre').forEach(pre => {
        // Перевіряємо, чи PRE не вкладений в P
        if (!pre.closest('p')) {
            const p = document.createElement('p');
            p.innerHTML = pre.innerHTML;
            pre.parentNode.replaceChild(p, pre);
        } else {
            // Якщо вкладений - просто витягуємо вміст
            const fragment = document.createDocumentFragment();
            while (pre.firstChild) {
                fragment.appendChild(pre.firstChild);
            }
            pre.parentNode.replaceChild(fragment, pre);
        }
    });

    // Конвертуємо DIV в P (з урахуванням вкладеності)
    // Обробляємо від внутрішніх до зовнішніх, щоб уникнути вкладених P
    let divs = Array.from(temp.querySelectorAll('div'));
    while (divs.length > 0) {
        // Знаходимо DIV без вкладених DIV
        const leafDiv = divs.find(div => !div.querySelector('div'));
        if (!leafDiv) break;

        if (!leafDiv.closest('p')) {
            const p = document.createElement('p');
            p.innerHTML = leafDiv.innerHTML;
            leafDiv.parentNode.replaceChild(p, leafDiv);
        } else {
            // Якщо вкладений в P - просто витягуємо вміст
            const fragment = document.createDocumentFragment();
            while (leafDiv.firstChild) {
                fragment.appendChild(leafDiv.firstChild);
            }
            leafDiv.parentNode.replaceChild(fragment, leafDiv);
        }

        // Оновлюємо список
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

    // Замінюємо тільки &nbsp; на звичайний пробіл
    // НЕ декодуємо &lt; &gt; &amp; - це вже зроблено браузером при парсингу
    // Подвійне декодування може призвести до невалідного HTML
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

    // Конвертуємо PRE в P (з урахуванням вкладеності)
    editor.querySelectorAll('pre').forEach(pre => {
        if (!pre.closest('p')) {
            const p = document.createElement('p');
            p.innerHTML = pre.innerHTML;
            pre.parentNode.replaceChild(p, pre);
        } else {
            // Якщо вкладений в P - просто витягуємо вміст
            const fragment = document.createDocumentFragment();
            while (pre.firstChild) {
                fragment.appendChild(pre.firstChild);
            }
            pre.parentNode.replaceChild(fragment, pre);
        }
        changed = true;
    });

    // Конвертуємо DIV в P (з урахуванням вкладеності)
    // Обробляємо від внутрішніх до зовнішніх, щоб уникнути вкладених P
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

    // Виправляємо вкладені P теги (невалідний HTML: <p><p>text</p></p>)
    // Вкладені P автоматично "виштовхуються" браузером, але можуть залишитись артефакти
    editor.querySelectorAll('p p, p h1, p h2, p h3, h1 p, h2 p, h3 p').forEach(nested => {
        // Переміщуємо вкладений блоковий елемент з батька
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
}
