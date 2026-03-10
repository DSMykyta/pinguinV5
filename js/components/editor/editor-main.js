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
 * ║  ├── editor-charm-check.js          — Заборонені слова       [check]     ║
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
let _focusSplitInit = false;

const PLUGINS = [
    // Завжди активні
    () => import('./editor-plugin-formatting.js'),
    () => import('./editor-plugin-case.js'),
    () => import('./editor-plugin-undo.js'),
    () => import('./editor-plugin-enter.js'),
    () => import('./editor-plugin-paste.js'),
    // Шарми (активуються за конфігом)
    () => import('./editor-charm-find.js'),
    () => import('./editor-charm-check.js'),
    () => import('./editor-charm-chip-navigation.js'),
    () => import('./editor-charm-tooltip.js'),
    () => import('./editor-charm-stats.js'),
    () => import('./editor-charm-cleanup.js'),
    () => import('./editor-charm-br.js'),
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

    // Focus-split (один раз на document)
    initFocusSplit();

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

function initFocusSplit() {
    if (_focusSplitInit) return;
    _focusSplitInit = true;

    document.addEventListener('focusin', (e) => {
        const split = e.target.closest('.editor-focus-split');
        if (!split) return;

        const groups = [...split.children];
        const group = e.target.closest('.group');
        if (!group) return;

        const index = groups.indexOf(group);
        split.classList.remove('focus-first', 'focus-last');
        if (index === 0) split.classList.add('focus-first');
        else if (index === groups.length - 1) split.classList.add('focus-last');
    });

    document.addEventListener('focusout', (e) => {
        const split = e.target.closest('.editor-focus-split');
        if (!split) return;

        requestAnimationFrame(() => {
            if (!split.contains(document.activeElement)) {
                split.classList.remove('focus-first', 'focus-last');
            }
        });
    });
}

async function loadPlugins(state) {
    const results = await Promise.allSettled(
        PLUGINS.map(fn => fn())
    );

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.init) {
            result.value.init(state);
        } else if (result.status === 'rejected') {
            console.warn(`[Editor] Plugin ${index} — не завантажено`);
        }
    });
}


