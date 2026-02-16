// js/common/editor/editor-formatting.js

/**
 * 🔌 ПЛАГІН — Bold, Italic, H1-H3, List
 *
 * Можна видалити — редактор працюватиме без форматування.
 */

import { sanitizeStructure } from './editor-utils.js';
import { debounce } from '../../utils/common-utils.js';

export function init(state) {
    // Debounced структурна очистка (тільки div→p, wrap text, fix nesting)
    const debouncedSanitize = debounce(() => sanitizeStructure(state), 500);
    const { dom } = state;

    // Клік на кнопки тулбара
    dom.toolbar?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn || state.currentMode !== 'text') return;

        const action = btn.dataset.action;

        switch (action) {
            case 'bold':
                wrapSelection(state, 'strong');
                break;
            case 'italic':
                wrapSelection(state, 'em');
                break;
            case 'h1':
                toggleHeading(state, 'h1');
                break;
            case 'h2':
                toggleHeading(state, 'h2');
                break;
            case 'h3':
                toggleHeading(state, 'h3');
                break;
            case 'list':
                execCommand('insertUnorderedList');
                // Структурна очистка після зміни списку
                setTimeout(() => sanitizeStructure(state), 10);
                break;
        }
    });

    // Prevent focus loss
    dom.toolbar?.addEventListener('mousedown', (e) => {
        if (e.target.closest('.btn-icon')) e.preventDefault();
    });

    // Keyboard shortcuts
    state.registerHook('onKeydown', (e) => {
        if (state.currentMode !== 'text') return;

        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            wrapSelection(state, 'strong');
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'i') {
            e.preventDefault();
            wrapSelection(state, 'em');
        }

        // Обробка Backspace в списках - запобігаємо "засмоктуванню" наступного контенту
        if (e.key === 'Backspace') {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            // Перевіряємо чи курсор на початку елемента після списку
            if (range.collapsed && range.startOffset === 0) {
                let node = selection.anchorNode;
                if (node.nodeType === Node.TEXT_NODE) {
                    node = node.parentNode;
                }

                // Якщо ми на початку P або іншого блоку після UL/OL
                const blockParent = node?.closest('p, h1, h2, h3');
                if (blockParent) {
                    const prevSibling = blockParent.previousElementSibling;
                    if (prevSibling?.tagName === 'UL' || prevSibling?.tagName === 'OL') {
                        // Запобігаємо злиттю з останнім li
                        e.preventDefault();
                        // Можна додати об'єднання з попереднім блоком, якщо потрібно
                        return;
                    }
                }

                // Якщо ми на початку LI
                const li = node?.closest('li');
                if (li) {
                    const ul = li.closest('ul, ol');
                    if (ul && li === ul.firstElementChild && range.startOffset === 0) {
                        // Перший li - перетворюємо на p
                        e.preventDefault();
                        state.runHook('onBeforeChange');

                        const p = document.createElement('p');
                        p.innerHTML = li.innerHTML || '<br>';
                        ul.parentNode.insertBefore(p, ul);
                        li.remove();

                        // Якщо список порожній - видаляємо
                        if (!ul.children.length) {
                            ul.remove();
                        }

                        // Встановлюємо курсор на початок p
                        const newRange = document.createRange();
                        newRange.setStart(p, 0);
                        newRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(newRange);

                        setTimeout(() => sanitizeStructure(state), 10);
                        return;
                    }
                }
            }
        }
    });

    // Update toolbar state
    state.registerHook('onInput', () => updateToolbarState(state));

    // Debounced sanitization після змін для виправлення структури
    state.registerHook('onInput', debouncedSanitize);
}

function wrapSelection(state, tagName) {
    state.dom.editor?.focus();
    state.runHook('onBeforeChange');

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);

    let node = selection.anchorNode;
    if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
    }
    const parentTag = node?.closest?.(tagName);

    if (parentTag && state.dom.editor.contains(parentTag)) {
        // Unwrap - зберігаємо вміст для відновлення виділення
        const parent = parentTag.parentNode;
        const firstChild = parentTag.firstChild;
        const lastChild = parentTag.lastChild;

        // Переміщуємо всі дочірні елементи
        while (parentTag.firstChild) {
            parent.insertBefore(parentTag.firstChild, parentTag);
        }
        parent.removeChild(parentTag);
        parent.normalize();

        // Відновлюємо виділення на розгорнутому тексті
        if (firstChild && lastChild) {
            selection.removeAllRanges();
            const newRange = document.createRange();
            // Знаходимо актуальні ноди після normalize()
            const textNode = firstChild.nodeType === Node.TEXT_NODE ? firstChild : firstChild.parentNode?.firstChild;
            if (textNode && parent.contains(textNode)) {
                try {
                    newRange.setStartBefore(textNode);
                    // Шукаємо останню текстову ноду
                    let endNode = lastChild;
                    while (endNode.lastChild) {
                        endNode = endNode.lastChild;
                    }
                    if (parent.contains(endNode)) {
                        newRange.setEndAfter(endNode);
                        selection.addRange(newRange);
                    }
                } catch (e) {
                    // Якщо не вдалось відновити виділення - не критично
                }
            }
        }
    } else if (!range.collapsed) {
        // Wrap
        const wrapper = document.createElement(tagName);
        wrapper.appendChild(range.extractContents());
        range.insertNode(wrapper);

        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(wrapper);
        selection.addRange(newRange);
    }

    updateToolbarState(state);
}

/**
 * Нормалізує значення formatBlock для крос-браузерної сумісності
 * Firefox повертає '<h3>', Chrome повертає 'h3'
 */
function normalizeFormatBlock(value) {
    if (!value) return '';
    // Видаляємо angle brackets: '<h3>' → 'h3', 'H3' → 'h3'
    return value.replace(/[<>]/g, '').toLowerCase();
}

function toggleHeading(state, tag) {
    state.dom.editor?.focus();
    state.runHook('onBeforeChange');

    const normalizedTag = tag.toLowerCase();

    try {
        const rawBlock = document.queryCommandValue('formatBlock');
        const currentBlock = normalizeFormatBlock(rawBlock);

        if (currentBlock === normalizedTag) {
            // Поточний блок вже є цим тегом - перемикаємо на P
            document.execCommand('formatBlock', false, '<p>');
        } else {
            // Інший блок або P - застосовуємо новий тег
            document.execCommand('formatBlock', false, `<${tag}>`);
        }
    } catch (e) {
        // При помилці логуємо, але не вставляємо автоматично
        console.warn('[Editor] formatBlock error:', e);
    }

    updateToolbarState(state);
}

function execCommand(command) {
    document.execCommand(command, false, null);
}

function updateToolbarState(state) {
    if (state.currentMode !== 'text') return;

    const { toolbar, editor } = state.dom;
    if (!toolbar || !editor) return;

    const isInTag = (tagName) => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return false;

        let node = selection.anchorNode;
        while (node && node !== editor) {
            if (node.nodeName?.toLowerCase() === tagName.toLowerCase()) return true;
            node = node.parentNode;
        }
        return false;
    };

    toolbar.querySelector('[data-action="bold"]')?.classList.toggle('active', isInTag('strong'));
    toolbar.querySelector('[data-action="italic"]')?.classList.toggle('active', isInTag('em'));

    try {
        const rawBlock = document.queryCommandValue('formatBlock');
        const block = normalizeFormatBlock(rawBlock);
        toolbar.querySelector('[data-action="h1"]')?.classList.toggle('active', block === 'h1');
        toolbar.querySelector('[data-action="h2"]')?.classList.toggle('active', block === 'h2');
        toolbar.querySelector('[data-action="h3"]')?.classList.toggle('active', block === 'h3');
    } catch (e) {}

    toolbar.querySelector('[data-action="list"]')?.classList.toggle('active', document.queryCommandState('insertUnorderedList'));
}
