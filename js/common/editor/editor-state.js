// js/common/editor/editor-state.js

/**
 * 🔒 ЯДРО — State екземпляра редактора
 */

/**
 * Створити state для редактора
 */
export function createEditorState(id, container, config) {
    // Хуки для плагінів
    const hooks = {
        onInput: [],
        onValidate: [],
        onModeChange: [],
        onKeydown: [],
        onBeforeChange: [],
    };

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

        // Реєстрація хуків
        registerHook(hookName, callback) {
            if (hooks[hookName]) {
                hooks[hookName].push(callback);
            }
        },

        // Виконання хуків
        runHook(hookName, ...args) {
            if (!hooks[hookName]) return;
            hooks[hookName].forEach(cb => {
                try {
                    cb(...args);
                } catch (e) {
                    console.error(`[Editor Hook Error] ${hookName}:`, e);
                }
            });
        },

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
