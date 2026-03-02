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
