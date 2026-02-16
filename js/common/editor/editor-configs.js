// js/common/editor/editor-configs.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              EDITOR CONFIGURATIONS                                       ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Центральний файл конфігурації всіх редакторів в системі.                ║
 * ║  Кожен запис описує один екземпляр редактора:                            ║
 * ║  - що це за редактор і де він використовується                           ║
 * ║  - які функції увімкнені                                                 ║
 * ║                                                                          ║
 * ║  ПАРАМЕТРИ:                                                              ║
 * ║  ├── toolbar    — Верхня панель (false = ні панелі, ні cleanup тоглів)   ║
 * ║  ├── code       — Перемикач Текст/Код                                    ║
 * ║  ├── editing    — Кнопки форматування (bold, italic, h1-h3, list, case) ║
 * ║  ├── validation — Перевірка заборонених слів + підсвічування             ║
 * ║  ├── stats      — Панелька символів/слів/час читання (внизу зліва)      ║
 * ║  ├── findReplace — Пошук і заміна                                        ║
 * ║  └── cleanup    — Тогли очистки { links, styles, images }               ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export const EDITOR_CONFIGS = {

    // ─────────────────────────────────────────────────────────────────────
    // Головний редактор на сторінці Highlight Generator
    // Використовується: index.html → #ghl-editor-container
    // Призначення: вставка тексту товару, перевірка заборонених слів,
    //              форматування, копіювання чистого HTML
    // ─────────────────────────────────────────────────────────────────────
    'ghl': {
        toolbar: true,
        code: true,
        editing: true,
        validation: true,
        stats: true,
        findReplace: true,
        cleanup: { links: false, styles: false, images: false },
        placeholder: 'Вставте сюди текст для перевірки...',
        minHeight: 200,
    },

    // ─────────────────────────────────────────────────────────────────────
    // Редактор глосарію ключового слова
    // Використовується: keywords-crud.js → #keyword-glossary-editor-container
    // Призначення: опис терміну для глосарію, підтримка посилань
    // ─────────────────────────────────────────────────────────────────────
    'keyword-glossary': {
        toolbar: true,
        code: true,
        editing: true,
        validation: false,
        stats: false,
        findReplace: false,
        cleanup: { links: true, styles: false, images: false },
        placeholder: 'Введіть опис терміну для глосарію...',
        minHeight: 300,
    },

    // ─────────────────────────────────────────────────────────────────────
    // Редактор опису бренду
    // Використовується: brands-crud.js → #brand-text-editor-container
    // Призначення: опис бренду для сторінки бренду, підтримка посилань
    // ─────────────────────────────────────────────────────────────────────
    'brand-description': {
        toolbar: true,
        code: true,
        editing: true,
        validation: false,
        stats: false,
        findReplace: false,
        cleanup: { links: true, styles: false, images: false },
        placeholder: 'Введіть опис бренду...',
        minHeight: 300,
    },

    // ─────────────────────────────────────────────────────────────────────
    // Редактор опису задачі
    // Використовується: tasks-crud.js → #task-description-editor
    // Призначення: детальний опис задачі, без зайвих функцій
    // ─────────────────────────────────────────────────────────────────────
    'task-description': {
        toolbar: true,
        code: false,
        editing: true,
        validation: false,
        stats: false,
        findReplace: false,
        cleanup: { links: false, styles: false, images: false },
        placeholder: 'Детальний опис задачі...',
        minHeight: 150,
    },
};

/**
 * Отримати опції для createHighlightEditor з конфігу
 * @param {string} name - Ключ з EDITOR_CONFIGS
 * @param {Object} overrides - Додаткові опції (initialValue, onChange тощо)
 * @returns {Object} Опції для createHighlightEditor
 */
export function getEditorOptions(name, overrides = {}) {
    const config = EDITOR_CONFIGS[name];
    if (!config) {
        console.warn(`[Editor Config] "${name}" не знайдено, використовуються дефолти`);
        return overrides;
    }

    return {
        toolbar: config.toolbar,
        code: config.code,
        editing: config.editing,
        validation: config.validation,
        showStats: config.stats,
        showFindReplace: config.findReplace,
        allowLinks: config.cleanup?.links ?? false,
        allowImages: config.cleanup?.images ?? false,
        allowStyles: config.cleanup?.styles ?? false,
        placeholder: config.placeholder,
        minHeight: config.minHeight,
        ...overrides,
    };
}
