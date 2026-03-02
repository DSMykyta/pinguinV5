// js/components/editor/editor-charm-br.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ✨ ШАРМ [br] — Тільки br + strong                                     ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Обмежує редактор: дозволені ТІЛЬКИ <br> та <strong>.                   ║
 * ║  Ховає всі кнопки тулбара крім Bold і Find/Replace.                     ║
 * ║  Конвертує при вставці/введенні:                                         ║
 * ║    <p>         → <br>                                                   ║
 * ║    <h1>-<h6>   → <strong>текст</strong><br>                             ║
 * ║    Все інше    → текст + <br>                                           ║
 * ║  Блокує Ctrl+I, Enter = <br>.                                           ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const ALLOWED_TAGS = new Set(['br', 'strong']);

const HIDDEN_ACTIONS = ['italic', 'h1', 'h2', 'h3', 'list', 'lowercase', 'uppercase', 'titlecase'];

export function init(state) {
    if (!state.config.brOnly) return;

    const { dom } = state;

    // Ховаємо зайві кнопки тулбара — залишаємо тільки bold + find/replace
    if (dom.toolbar) {
        HIDDEN_ACTIONS.forEach(action => {
            const btn = dom.toolbar.querySelector(`[data-action="${action}"]`);
            if (btn) btn.classList.add('u-hidden');
        });
    }

    // Очистка DOM — залишає тільки <br> і <strong>
    function sanitizeBrOnly() {
        const editor = dom.editor;
        if (!editor) return;

        const walker = document.createTreeWalker(
            editor,
            NodeFilter.SHOW_ELEMENT,
            null
        );

        const toProcess = [];
        let node;
        while ((node = walker.nextNode())) {
            const tag = node.tagName.toLowerCase();
            if (!ALLOWED_TAGS.has(tag)) {
                toProcess.push(node);
            }
        }

        if (!toProcess.length) return;

        toProcess.forEach(el => {
            const tag = el.tagName.toLowerCase();

            // Заголовки → <strong>вміст</strong><br>
            if (/^h[1-6]$/.test(tag)) {
                const frag = document.createDocumentFragment();
                const strong = document.createElement('strong');
                while (el.firstChild) {
                    strong.appendChild(el.firstChild);
                }
                frag.appendChild(strong);
                frag.appendChild(document.createElement('br'));
                el.parentNode.insertBefore(frag, el);
                el.remove();
            }
            // <p>, <div> та інші блокові → вміст + <br>
            else if (/^(p|div|li|td|th|tr|table|thead|tbody|tfoot|caption|blockquote|pre|section|article|header|footer|aside|nav|figure|figcaption|details|summary)$/.test(tag)) {
                const frag = document.createDocumentFragment();
                while (el.firstChild) {
                    frag.appendChild(el.firstChild);
                }
                frag.appendChild(document.createElement('br'));
                el.parentNode.insertBefore(frag, el);
                el.remove();
            }
            // ul/ol — розгортаємо (li вже оброблені вище)
            else if (/^(ul|ol)$/.test(tag)) {
                const frag = document.createDocumentFragment();
                while (el.firstChild) {
                    frag.appendChild(el.firstChild);
                }
                el.parentNode.insertBefore(frag, el);
                el.remove();
            }
            // <b> → <strong>
            else if (tag === 'b') {
                const strong = document.createElement('strong');
                while (el.firstChild) {
                    strong.appendChild(el.firstChild);
                }
                el.parentNode.replaceChild(strong, el);
            }
            // Все інше (em, i, span, a, u, s тощо) — розгортаємо, залишаємо текст
            else {
                const parent = el.parentNode;
                while (el.firstChild) {
                    parent.insertBefore(el.firstChild, el);
                }
                el.remove();
            }
        });

        // Прибираємо 3+ <br> підряд → залишаємо максимум 2
        editor.querySelectorAll('br').forEach(br => {
            let count = 1;
            let next = br.nextSibling;
            while (next && next.nodeName === 'BR') {
                count++;
                next = next.nextSibling;
            }
            if (count > 2) {
                let toRemove = br.nextSibling;
                while (toRemove && toRemove.nodeName === 'BR' && count > 2) {
                    const rm = toRemove;
                    toRemove = toRemove.nextSibling;
                    rm.remove();
                    count--;
                }
            }
        });
    }

    // Очистка при введенні
    state.registerHook('onInput', sanitizeBrOnly, { plugin: 'br' });

    // Очистка після вставки
    state.registerHook('onValidate', sanitizeBrOnly, { plugin: 'br' });

    // Блокуємо Ctrl+I та перехоплюємо Enter → <br>
    state.registerHook('onKeydown', (e) => {
        if (state.currentMode !== 'text') return;

        // Блокуємо Ctrl+I (italic)
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'i') {
            e.preventDefault();
            return;
        }

        // Enter → <br> (замість нового параграфа)
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopImmediatePropagation();

            const selection = window.getSelection();
            if (!selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            range.deleteContents();

            const br = document.createElement('br');
            range.insertNode(br);

            const newRange = document.createRange();
            newRange.setStartAfter(br);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }
    }, { plugin: 'br', priority: -1 });
}
