// js/components/editor/editor-plugin-paste.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🔌 ПЛАГІН — Copy & Paste                                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Ctrl+C копіює чистий HTML, Ctrl+Shift+C — plain text.                   ║
 * ║  Вставка sanitize-ує HTML перед вставкою в редактор.                     ║
 * ║  Можна видалити — браузер використає стандартну поведінку.               ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { sanitizeHtml, sanitizeEditor, escapeHtml } from './editor-utils.js';
import { showToast } from '../feedback/toast.js';

/**
 * Очистка HTML для brOnly режиму — залишає тільки <br> і <strong>
 */
function sanitizeBrPaste(html) {
    // Нормалізуємо: <br /> + \n → один <br>, голий \n → <br>
    html = html.replace(/\r\n/g, '\n');
    html = html.replace(/<br\s*\/?>\s*\n/gi, '<br>');
    html = html.replace(/<br\s*\/?>/gi, '<br>');
    html = html.replace(/\n/g, '<br>');

    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Конвертуємо B → STRONG
    temp.querySelectorAll('b').forEach(b => {
        const strong = document.createElement('strong');
        while (b.firstChild) strong.appendChild(b.firstChild);
        b.parentNode.replaceChild(strong, b);
    });

    // Заголовки → <strong>вміст</strong><br>
    temp.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
        const frag = document.createDocumentFragment();
        const strong = document.createElement('strong');
        while (el.firstChild) strong.appendChild(el.firstChild);
        frag.appendChild(strong);
        frag.appendChild(document.createElement('br'));
        el.parentNode.insertBefore(frag, el);
        el.remove();
    });

    // Блокові елементи → вміст + <br>
    const blockSel = 'p, div, li, td, th, tr, table, thead, tbody, tfoot, blockquote, pre, section, article';
    let blocks = Array.from(temp.querySelectorAll(blockSel));
    while (blocks.length) {
        // Обробляємо leaf-first (елементи без вкладених блокових)
        const leaf = blocks.find(el => !el.querySelector(blockSel));
        if (!leaf) break;
        const frag = document.createDocumentFragment();
        while (leaf.firstChild) frag.appendChild(leaf.firstChild);
        frag.appendChild(document.createElement('br'));
        leaf.parentNode.insertBefore(frag, leaf);
        leaf.remove();
        blocks = Array.from(temp.querySelectorAll(blockSel));
    }

    // ul/ol — розгортаємо
    temp.querySelectorAll('ul, ol').forEach(el => {
        const frag = document.createDocumentFragment();
        while (el.firstChild) frag.appendChild(el.firstChild);
        el.parentNode.insertBefore(frag, el);
        el.remove();
    });

    // Всі інші теги (em, i, span, a, u, s, font тощо) — розгортаємо, залишаємо текст
    let others = Array.from(temp.querySelectorAll('*'));
    others = others.filter(el => {
        const tag = el.tagName.toLowerCase();
        return tag !== 'br' && tag !== 'strong';
    });
    others.forEach(el => {
        const parent = el.parentNode;
        if (!parent) return;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        el.remove();
    });

    // Видаляємо атрибути зі strong
    temp.querySelectorAll('strong').forEach(el => {
        while (el.attributes.length > 0) el.removeAttribute(el.attributes[0].name);
    });

    return temp.innerHTML;
}

export function init(state) {
    const { dom } = state;
    if (!dom.editor) return;

    // Copy handler — очистка по конфігу тоглів
    dom.editor.addEventListener('copy', (e) => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const fragment = range.cloneContents();

        // Видаляємо підсвічування з копії
        const temp = document.createElement('div');
        temp.appendChild(fragment);
        temp.querySelectorAll('.highlight-error, .highlight-warning').forEach(el => {
            const text = document.createTextNode(el.textContent);
            el.parentNode.replaceChild(text, el);
        });

        // Санітизуємо HTML при копіюванні (по конфігу)
        const htmlCode = sanitizeHtml(temp.innerHTML, {
            allowLinks: state.allowLinks,
            allowImages: state.allowImages,
            allowStyles: state.allowStyles,
        });

        e.preventDefault();
        e.clipboardData.setData('text/plain', htmlCode);

        showToast('Скопійовано HTML код');
    });

    // Ctrl+Shift+C — копіювати тільки текст без HTML розмітки
    state.registerHook('onKeydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
            const selection = window.getSelection();
            const plainText = selection.toString();
            if (plainText) {
                e.preventDefault();
                navigator.clipboard.writeText(plainText).then(() => {
                    showToast('Скопійовано текст (без HTML)');
                });
            }
        }
    }, { plugin: 'paste' });

    // Paste handler
    dom.editor.addEventListener('paste', (e) => {
        e.preventDefault();

        // Сигнал для undo
        state.runHook('onWillChange');

        const clipboardData = e.clipboardData || window.clipboardData;
        let text = clipboardData.getData('text/plain');

        // brOnly режим — окремий pipeline, щоб не втрачати <br>
        if (state.config.brOnly) {
            const looksLikeHtml = /<(strong|b|br|p|div|h[1-6]|ul|ol|li|em|i|span|table|thead|tbody|tr|th|td)[^>]*>/i.test(text);

            if (looksLikeHtml) {
                const cleaned = sanitizeBrPaste(text);
                if (cleaned) document.execCommand('insertHTML', false, cleaned);
            } else {
                // Plain text → рядки через <br>
                text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
                const html = text.split('\n')
                    .map(line => escapeHtml(line))
                    .join('<br>');
                if (html) document.execCommand('insertHTML', false, html);
            }

            // Тільки onValidate (br charm зробить фінальну очистку)
            setTimeout(() => state.runHook('onValidate'), 50);
            return;
        }

        // Детекція HTML в plain text
        const looksLikeHtml = /<(p|strong|em|h[1-6]|ul|ol|li|br|div|span|b|i|table|thead|tbody|tr|th|td)[^>]*>/i.test(text);

        if (looksLikeHtml) {
            const sanitized = sanitizeHtml(text, {
                allowLinks: state.allowLinks,
                allowImages: state.allowImages,
                allowStyles: state.allowStyles,
            });
            document.execCommand('insertHTML', false, sanitized);
        } else {
            text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
            const lines = text.split('\n');
            const html = lines
                .map(line => line.trim() ? `<p>${escapeHtml(line)}</p>` : '')
                .filter(Boolean)
                .join('');

            if (html) {
                document.execCommand('insertHTML', false, html);
            }
        }

        // Санітизуємо весь контент після вставки
        setTimeout(() => {
            sanitizeEditor(state);
            state.runHook('onValidate');
        }, 50);
    }, { plugin: 'paste' });
}
