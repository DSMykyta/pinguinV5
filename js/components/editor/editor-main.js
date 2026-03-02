// js/components/editor/editor-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              UNIVERSAL HIGHLIGHT EDITOR                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Конфігурація через HTML-чарми на контейнері:                            ║
 * ║                                                                          ║
 * ║  ЧАРМИ (атрибути):                                                       ║
 * ║  ├── editor          — Базовий маркер (без чармів = readonly блок)       ║
 * ║  ├── tools           — Панель інструментів + find/replace + editing      ║
 * ║  ├── code            — Перемикач Текст/Код                               ║
 * ║  ├── check           — Перевірка заборонених слів + підсвічування        ║
 * ║  ├── stats           — Статистика (символи/слова/час читання)            ║
 * ║  ├── cleanup-links   — Тогл очистки посилань                             ║
 * ║  ├── cleanup-styles  — Тогл очистки стилів                               ║
 * ║  └── cleanup-images  — Тогл очистки зображень                            ║
 * ║                                                                          ║
 * ║  DATA-АТРИБУТИ:                                                          ║
 * ║  ├── data-editor-id  — Кастомний ID префікс (за замовч. auto)            ║
 * ║  ├── data-placeholder — Placeholder тексту                               ║
 * ║  └── data-min-height  — Мінімальна висота в px                           ║
 * ║                                                                          ║
 * ║  ПРИКЛАД:                                                                ║
 * ║  <div editor tools code check stats                                      ║
 * ║       data-editor-id="ghl"                                               ║
 * ║       data-placeholder="Вставте текст...">                               ║
 * ║  </div>                                                                  ║
 * ║                                                                          ║
 * ║  🔒 ЯДРО (не видаляти):                                                  ║
 * ║  ├── editor-main.js       — Фабрика, завантаження плагінів               ║
 * ║  ├── editor-template.js   — HTML шаблон                                  ║
 * ║  ├── editor-state.js      — State екземпляра                             ║
 * ║  └── editor-mode.js       — Перемикання Text/Code                        ║
 * ║                                                                          ║
 * ║  🔌 ПЛАГІНИ — завжди активні:                                            ║
 * ║  ├── editor-plugin-formatting.js    — Bold, Italic, H1-H3, List          ║
 * ║  ├── editor-plugin-case.js          — Зміна регістру                     ║
 * ║  ├── editor-plugin-undo.js          — Undo/Redo                          ║
 * ║  ├── editor-plugin-paste.js         — Обробка вставки                    ║
 * ║  └── editor-plugin-enter.js         — Обробка Enter/Shift+Enter          ║
 * ║                                                                          ║
 * ║  ✨ ШАРМИ — активуються тільки при наявності атрибута:                   ║
 * ║  ├── editor-charm-find.js           — Find & Replace        [tools]      ║
 * ║  ├── editor-charm-check.js          — Заборонені слова       [check]      ║
 * ║  ├── editor-charm-chip-navigation.js — Навігація по чіпах   [check]      ║
 * ║  ├── editor-charm-tooltip.js        — Підказки              [check]      ║
 * ║  ├── editor-charm-stats.js          — Статистика            [stats]      ║
 * ║  └── editor-charm-cleanup.js        — Тогли очистки         [cleanup]    ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createEditorTemplate } from './editor-template.js';
import { createEditorState } from './editor-state.js';
import { initEditorMode } from './editor-mode.js';
import { sanitizeHtml } from './editor-utils.js';
import { initDropdowns } from '../forms/dropdown.js';

let instanceCounter = 0;

const PLUGINS = [
    // Завжди активні
    './editor-plugin-formatting.js',
    './editor-plugin-case.js',
    './editor-plugin-undo.js',
    './editor-plugin-enter.js',
    './editor-plugin-paste.js',
    // Шарми (активуються за конфігом)
    './editor-charm-find.js',
    './editor-charm-check.js',
    './editor-charm-chip-navigation.js',
    './editor-charm-tooltip.js',
    './editor-charm-stats.js',
    './editor-charm-cleanup.js',
    './editor-charm-br.js',
];

/**
 * Прочитати чарми з HTML-атрибутів контейнера
 */
function readCharms(container) {
    const hasTools = container.hasAttribute('tools');
    const hasCode = container.hasAttribute('code');
    const hasCheck = container.hasAttribute('check');
    const hasStats = container.hasAttribute('stats');
    const hasCleanupLinks = container.hasAttribute('cleanup-links');
    const hasCleanupStyles = container.hasAttribute('cleanup-styles');
    const hasCleanupImages = container.hasAttribute('cleanup-images');

    return {
        toolbar: hasTools,
        code: hasCode,
        editing: hasTools,
        validation: hasCheck,
        showStats: hasStats,
        showFindReplace: hasTools,
        showCleanupLinks: hasCleanupLinks,
        showCleanupStyles: hasCleanupStyles,
        showCleanupImages: hasCleanupImages,
        allowLinks: container.getAttribute('cleanup-links') === 'allow',
        allowImages: container.getAttribute('cleanup-images') === 'allow',
        allowStyles: container.getAttribute('cleanup-styles') === 'allow',
        brOnly: container.hasAttribute('br'),
        placeholder: container.dataset.placeholder || 'Введіть текст...',
        minHeight: parseInt(container.dataset.minHeight) || 200,
        tag: container.dataset.tag || null,
    };
}

/**
 * Створити екземпляр редактора
 */
export function createHighlightEditor(container, options = {}) {
    if (!container || !(container instanceof HTMLElement)) {
        console.error('[Editor] Container is required');
        return null;
    }

    // Читаємо чарми з контейнера
    const charms = readCharms(container);

    const id = options.idPrefix
        || container.dataset.editorId
        || `editor-${++instanceCounter}`;

    const config = {
        ...charms,
        initialValue: '',
        onChange: null,
        ...options,
    };

    // Створити HTML
    const html = createEditorTemplate(id, config);
    container.innerHTML = html;

    // Ініціалізувати dropdown-и (Find/Replace тощо)
    initDropdowns();

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

    // charm:refresh на батьківській секції → очистити редактор
    container.closest('section[refresh]')
        ?.addEventListener('charm:refresh', () => publicApi.clear());

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


