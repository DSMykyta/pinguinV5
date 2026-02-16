// js/common/editor/editor-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              UNIVERSAL HIGHLIGHT EDITOR                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  🔒 ЯДРО (не видаляти):                                                  ║
 * ║  ├── editor-main.js       — Фабрика, завантаження плагінів               ║
 * ║  ├── editor-template.js   — HTML шаблон                                  ║
 * ║  ├── editor-state.js      — State екземпляра                             ║
 * ║  └── editor-mode.js       — Перемикання Text/Code                        ║
 * ║                                                                          ║
 * ║  🔌 ПЛАГІНИ (можна видалити):                                            ║
 * ║  ├── editor-formatting.js — Bold, Italic, H1-H3, List                    ║
 * ║  ├── editor-case.js       — Зміна регістру                               ║
 * ║  ├── editor-undo.js       — Undo/Redo                                    ║
 * ║  ├── editor-validation.js — Заборонені слова                             ║
 * ║  ├── editor-find.js       — Find & Replace                               ║
 * ║  ├── editor-stats.js      — Статистика                                   ║
 * ║  ├── editor-paste.js      — Обробка вставки                              ║
 * ║  ├── editor-cleanup.js   — Тогли очистки (links/images/styles)           ║
 * ║  ├── editor-enter.js     — Обробка Enter/Shift+Enter                    ║
 * ║  ├── editor-chip-navigation.js — Навігація по чіпах валідації            ║
 * ║  └── editor-tooltip.js   — Підказки для заборонених слів                ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createEditorTemplate } from './editor-template.js';
import { createEditorState } from './editor-state.js';
import { initEditorMode } from './editor-mode.js';
import { sanitizeHtml } from './editor-utils.js';

let instanceCounter = 0;

// Плагіни — можна видалити будь-який
const PLUGINS = [
    './editor-formatting.js',
    './editor-case.js',
    './editor-undo.js',
    './editor-enter.js',
    './editor-validation.js',
    './editor-find.js',
    './editor-stats.js',
    './editor-paste.js',
    './editor-cleanup.js',
    './editor-chip-navigation.js',
    './editor-tooltip.js',
];

/**
 * Створити екземпляр редактора
 */
export function createHighlightEditor(container, options = {}) {
    if (!container || !(container instanceof HTMLElement)) {
        console.error('[Editor] Container is required');
        return null;
    }

    const id = options.idPrefix || `editor-${++instanceCounter}`;

    const config = {
        toolbar: true,
        code: true,
        editing: true,
        validation: false,
        showStats: false,
        showFindReplace: false,
        placeholder: 'Введіть текст...',
        initialValue: '',
        minHeight: 200,
        onChange: null,
        allowLinks: false,
        allowImages: false,
        allowStyles: false,
        ...options
    };

    // Створити HTML
    const html = createEditorTemplate(id, config);
    container.innerHTML = html;

    // Створити state
    const state = createEditorState(id, container, config);

    // Ініціалізувати режими (core)
    initEditorMode(state);

    // Завантажити плагіни
    loadPlugins(state);

    // Початкове значення
    if (config.initialValue) {
        state.dom.editor.innerHTML = config.initialValue;
        state.lastSavedContent = config.initialValue;
    }

    // Публічне API
    return {
        getValue: () => sanitizeHtml(state.getCleanHtml(), {
            allowLinks: state.allowLinks,
            allowImages: state.allowImages,
            allowStyles: state.allowStyles,
        }),
        setValue: (html) => {
            state.dom.editor.innerHTML = html || '';
            state.lastSavedContent = html || '';
            state.runHook('onValidate');
        },
        getPlainText: () => state.getPlainText(),
        getMode: () => state.currentMode,
        setMode: (mode) => state.setMode(mode),
        focus: () => state.focus(),
        clear: () => {
            state.dom.editor.innerHTML = '';
            if (state.dom.codeEditor) state.dom.codeEditor.value = '';
            state.lastSavedContent = '';
            state.runHook('onValidate');
        },
        destroy: () => container.innerHTML = '',
        getState: () => state,
    };
}

async function loadPlugins(state) {
    const results = await Promise.allSettled(
        PLUGINS.map(path => import(path))
    );

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.init) {
            result.value.init(state);
        } else if (result.status === 'rejected') {
            console.warn(`[Editor] ⚠️ ${PLUGINS[index]} — не завантажено`);
        }
    });
}

export default createHighlightEditor;
