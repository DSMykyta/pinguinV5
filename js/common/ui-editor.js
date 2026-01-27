// js/common/ui-editor.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    UI EDITOR - UNIVERSAL TEXT/CODE EDITOR                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Універсальний редактор з двома режимами:
 * - Text (WYSIWYG) — візуальне редагування HTML
 * - Code — редагування HTML коду напряму
 *
 * БЕЗ ВАЛІДАЦІЇ — спрощена версія без перевірки заборонених слів.
 *
 * ВИКОРИСТАННЯ:
 * ```javascript
 * import { createEditor } from '../common/ui-editor.js';
 *
 * const editor = createEditor(containerElement, {
 *     initialValue: '<p>Hello</p>',
 *     mode: 'text',  // 'text' | 'code'
 *     onChange: (html) => console.log('Changed:', html)
 * });
 *
 * // API:
 * editor.getValue()           // Отримати HTML
 * editor.setValue('<p>...</p>') // Встановити HTML
 * editor.getMode()            // 'text' | 'code'
 * editor.setMode('code')      // Переключити режим
 * editor.destroy()            // Видалити редактор
 * ```
 */

/**
 * Створити редактор
 * @param {HTMLElement} container - Контейнер для редактора
 * @param {Object} options - Опції
 * @param {string} options.initialValue - Початкове значення HTML
 * @param {string} options.mode - Початковий режим ('text' | 'code')
 * @param {Function} options.onChange - Callback при зміні
 * @param {string} options.placeholder - Placeholder текст
 * @param {number} options.minHeight - Мінімальна висота в пікселях
 * @returns {Object} API редактора
 */
export function createEditor(container, options = {}) {
    const {
        initialValue = '',
        mode = 'text',
        onChange = null,
        placeholder = 'Введіть текст...',
        minHeight = 200
    } = options;

    let currentMode = mode;
    let currentValue = initialValue;

    // ═══════════════════════════════════════════════════════════════════════
    // СТВОРЕННЯ DOM
    // ═══════════════════════════════════════════════════════════════════════

    // Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'ui-editor';

    // Toolbar з переключателем режимів
    const toolbar = document.createElement('div');
    toolbar.className = 'ui-editor-toolbar';
    toolbar.innerHTML = `
        <div class="ui-editor-mode-switcher">
            <button type="button" class="ui-editor-mode-btn ${currentMode === 'text' ? 'active' : ''}" data-mode="text">
                <span class="material-symbols-outlined">text_fields</span>
                <span>Text</span>
            </button>
            <button type="button" class="ui-editor-mode-btn ${currentMode === 'code' ? 'active' : ''}" data-mode="code">
                <span class="material-symbols-outlined">code</span>
                <span>Code</span>
            </button>
        </div>
    `;

    // Text editor (contenteditable)
    const textEditor = document.createElement('div');
    textEditor.className = 'ui-editor-text';
    textEditor.contentEditable = 'true';
    textEditor.innerHTML = currentValue;
    textEditor.style.minHeight = `${minHeight}px`;
    textEditor.dataset.placeholder = placeholder;

    // Code editor (textarea)
    const codeEditor = document.createElement('textarea');
    codeEditor.className = 'ui-editor-code';
    codeEditor.value = currentValue;
    codeEditor.placeholder = placeholder;
    codeEditor.style.minHeight = `${minHeight}px`;

    // Append elements
    wrapper.appendChild(toolbar);
    wrapper.appendChild(textEditor);
    wrapper.appendChild(codeEditor);
    container.appendChild(wrapper);

    // Set initial visibility
    updateVisibility();

    // ═══════════════════════════════════════════════════════════════════════
    // EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════════════════

    // Mode switcher
    toolbar.querySelectorAll('.ui-editor-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const newMode = btn.dataset.mode;
            if (newMode !== currentMode) {
                setMode(newMode);
            }
        });
    });

    // Text editor input
    textEditor.addEventListener('input', () => {
        currentValue = textEditor.innerHTML;
        if (onChange) onChange(currentValue);
    });

    // Code editor input
    codeEditor.addEventListener('input', () => {
        currentValue = codeEditor.value;
        if (onChange) onChange(currentValue);
    });

    // Paste handling for text editor (clean paste)
    textEditor.addEventListener('paste', (e) => {
        e.preventDefault();

        // Отримати plain text
        const text = e.clipboardData.getData('text/plain');

        // Вставити як текст
        document.execCommand('insertText', false, text);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    function updateVisibility() {
        if (currentMode === 'text') {
            textEditor.classList.add('active');
            codeEditor.classList.remove('active');
        } else {
            textEditor.classList.remove('active');
            codeEditor.classList.add('active');
        }

        // Update toolbar buttons
        toolbar.querySelectorAll('.ui-editor-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === currentMode);
        });
    }

    function syncEditors(fromMode) {
        if (fromMode === 'text') {
            // Text → Code
            codeEditor.value = textEditor.innerHTML;
        } else {
            // Code → Text
            textEditor.innerHTML = codeEditor.value;
        }
    }

    function setMode(newMode) {
        // Sync content before switching
        syncEditors(currentMode);

        currentMode = newMode;
        updateVisibility();

        // Focus the active editor
        if (currentMode === 'text') {
            textEditor.focus();
        } else {
            codeEditor.focus();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════

    return {
        /**
         * Отримати поточне значення HTML
         * @returns {string} HTML content
         */
        getValue() {
            if (currentMode === 'text') {
                return textEditor.innerHTML;
            } else {
                return codeEditor.value;
            }
        },

        /**
         * Встановити значення HTML
         * @param {string} html - HTML content
         */
        setValue(html) {
            currentValue = html || '';
            textEditor.innerHTML = currentValue;
            codeEditor.value = currentValue;
        },

        /**
         * Отримати поточний режим
         * @returns {string} 'text' | 'code'
         */
        getMode() {
            return currentMode;
        },

        /**
         * Переключити режим
         * @param {string} newMode - 'text' | 'code'
         */
        setMode(newMode) {
            if (newMode === 'text' || newMode === 'code') {
                setMode(newMode);
            }
        },

        /**
         * Фокус на редактор
         */
        focus() {
            if (currentMode === 'text') {
                textEditor.focus();
            } else {
                codeEditor.focus();
            }
        },

        /**
         * Очистити редактор
         */
        clear() {
            currentValue = '';
            textEditor.innerHTML = '';
            codeEditor.value = '';
        },

        /**
         * Видалити редактор
         */
        destroy() {
            wrapper.remove();
        },

        /**
         * Доступ до DOM елементів (для розширення)
         */
        elements: {
            wrapper,
            toolbar,
            textEditor,
            codeEditor
        }
    };
}

/**
 * CSS стилі для редактора (вбудовуються автоматично)
 */
const editorStyles = `
.ui-editor {
    border: 1px solid var(--color-border, #e0e0e0);
    border-radius: 8px;
    overflow: hidden;
    background: var(--color-surface, #fff);
}

.ui-editor-toolbar {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: var(--color-surface-variant, #f5f5f5);
    border-bottom: 1px solid var(--color-border, #e0e0e0);
}

.ui-editor-mode-switcher {
    display: flex;
    gap: 4px;
}

.ui-editor-mode-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    color: var(--color-text-secondary, #666);
    transition: all 0.2s ease;
}

.ui-editor-mode-btn:hover {
    background: var(--color-hover, rgba(0, 0, 0, 0.05));
}

.ui-editor-mode-btn.active {
    background: var(--color-main, #6366f1);
    color: white;
}

.ui-editor-mode-btn .material-symbols-outlined {
    font-size: 18px;
}

.ui-editor-text,
.ui-editor-code {
    display: none;
    width: 100%;
    padding: 16px;
    font-size: 14px;
    line-height: 1.6;
    border: none;
    outline: none;
    resize: vertical;
    font-family: inherit;
}

.ui-editor-text.active,
.ui-editor-code.active {
    display: block;
}

.ui-editor-text {
    overflow-y: auto;
}

.ui-editor-text:empty::before {
    content: attr(data-placeholder);
    color: var(--color-text-tertiary, #999);
    pointer-events: none;
}

.ui-editor-code {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
    background: var(--color-surface-code, #1e1e1e);
    color: var(--color-text-code, #d4d4d4);
}

/* Dark mode support */
[data-theme="dark"] .ui-editor-code {
    background: #1e1e1e;
    color: #d4d4d4;
}
`;

// Inject styles once
let stylesInjected = false;
if (!stylesInjected && typeof document !== 'undefined') {
    const styleEl = document.createElement('style');
    styleEl.textContent = editorStyles;
    document.head.appendChild(styleEl);
    stylesInjected = true;
}
