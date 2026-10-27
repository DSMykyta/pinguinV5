// js/components/editor/editor-state.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🔒 ЯДРО — State екземпляра редактора                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Зберігає DOM-посилання, хуки та методи екземпляра редактора.            ║
 * ║  Хуки: onInput, onSelectionChange, onValidate, onModeChange,             ║
 * ║        onKeydown, onWillChange                                            ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createHookRegistry } from '../../utils/utils-hooks.js';

/**
 * Створити state для редактора
 */
export function createEditorState(id, container, config) {
    // Хуки для плагінів
    const { registerHook, runHook, runHookAsync } = createHookRegistry({
        name: 'Editor',
        events: ['onInput', 'onSelectionChange', 'onValidate', 'onModeChange', 'onKeydown', 'onWillChange'],
    });

    const state = {
        id,
        config,
        currentMode: 'text',
        lastSavedContent: '',
        isSanitizing: false, // Флаг для блокування undo під час sanitization

        // Тогли очистки (що дозволено лишати)
        allowLinks: config.allowLinks ?? false,
        allowImages: config.allowImages ?? false,
        allowStyles: config.allowStyles ?? false,

        // DOM
        dom: {
            container,
            editor: container.querySelector(`#${id}-editor`),
            codeEditor: container.querySelector(`#${id}-code-editor`),
            toolbar: container.querySelector(`#${id}-toolbar`),
            modeText: container.querySelector(`#${id}-mode-text`),
            modeCode: container.querySelector(`#${id}-mode-code`),
            validationResults: container.querySelector(`#${id}-validation-results`),
            findInput: container.querySelector(`#${id}-find-input`),
            replaceInput: container.querySelector(`#${id}-replace-input`),
            replaceAllBtn: container.querySelector(`#${id}-replace-all-btn`),
            charCount: container.querySelector(`#${id}-char-count`),
            wordCount: container.querySelector(`#${id}-word-count`),
            readingTime: container.querySelector(`#${id}-reading-time`),
        },

        registerHook,
        runHook,
        runHookAsync,

        // Отримати чистий HTML (без підсвічувань)
        getCleanHtml() {
            if (!state.dom.editor) return '';
            if (state.currentMode === 'code') {
                return state.dom.codeEditor?.value || '';
            }

            const clone = state.dom.editor.cloneNode(true);
            clone.querySelectorAll('.highlight-error, .highlight-warning').forEach(el => {
                const parent = el.parentNode;
                while (el.firstChild) {
                    parent.insertBefore(el.firstChild, el);
                }
                parent.removeChild(el);
            });
            return clone.innerHTML;
        },

        // Отримати plain text
        getPlainText() {
            const html = state.getCleanHtml();
            const temp = document.createElement('div');
            temp.innerHTML = html;
            return temp.textContent || '';
        },

        // Фокус
        focus() {
            if (state.currentMode === 'text') {
                state.dom.editor?.focus();
            } else {
                state.dom.codeEditor?.focus();
            }
        },

        // Переключити режим (буде перезаписано в editor-mode.js)
        setMode(mode) {
            console.warn('[Editor] setMode not initialized');
        },
    };

    return state;
}
