// js/common/editor/editor-template.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🔒 ЯДРО — HTML шаблон редактора                                         ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Рендерить секції умовно на основі чармів (атрибутів контейнера).        ║
 * ║                                                                          ║
 * ║  Без чармів = readonly блок (contenteditable="false")                    ║
 * ║  tools   → toolbar + editing + find/replace                              ║
 * ║  code    → Text/Code перемикач                                           ║
 * ║  check   → validation chips                                              ║
 * ║  stats   → footer зі статистикою                                         ║
 * ║  cleanup-links/styles/images → окремі тогли                              ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Створити HTML шаблон редактора
 * @param {string} id - Унікальний ID екземпляра
 * @param {Object} config - Конфігурація
 * @returns {string} HTML
 */
export function createEditorTemplate(id, config) {
    const {
        placeholder,
        minHeight,
        toolbar,
        code,
        editing,
        validation,
        showStats,
        showFindReplace,
        showCleanupLinks,
        showCleanupStyles,
        showCleanupImages,
    } = config;

    const showToolbar = toolbar === true;
    const showEditing = editing === true;
    const showCode = code === true;
    const showCleanup = showCleanupLinks || showCleanupStyles || showCleanupImages;
    const isEditable = showEditing;

    return `
        <div class="editor-component rich-editor-container" data-editor-id="${id}" style="--editor-min-height: ${minHeight}px;">
            ${showToolbar ? renderToolbar(id, { showEditing, showCode, validation, showFindReplace }) : (validation ? `
        <div class="toolbar-wrapper">
            <div class="validation-results-wrapper">
                <div id="${id}-validation-results" class="chip-list"></div>
            </div>
        </div>` : '')}

            <!-- Область редактора -->
            <div class="rich-editor-body">

                <!-- Режим тексту: WYSIWYG редактор -->
                <div
                    id="${id}-editor"
                    class="rich-editor-content"
                    contenteditable="${isEditable}"
                    data-placeholder="${placeholder}"
                ></div>

                ${showCode ? `
                <!-- Режим коду -->
                <textarea
                    id="${id}-code-editor"
                    class="input-main rich-editor-code u-hidden"
                    placeholder="HTML код..."
                ></textarea>
                ` : ''}

            </div>

            ${(showStats || showCleanup) ? `
            <!-- Футер: статистика + кнопки очищення -->
            <div class="rich-editor-footer">
                ${showStats ? `
                <div class="text-stats-container" id="${id}-stats">
                    <span class="stat-item">Символів: <strong id="${id}-char-count">0</strong></span>
                    <span class="stat-item">Слів: <strong id="${id}-word-count">0</strong></span>
                    <span class="stat-item">Час читання: <strong id="${id}-reading-time">0</strong> хв</span>
                </div>
                ` : '<div></div>'}
                ${showCleanup ? `
                <div id="${id}-cleanup-toggles" style="display: flex; gap: 4px;">
                    ${showCleanupLinks ? `<button type="button" class="btn-icon" id="${id}-toggle-links" title="Очищати посилання" data-cleanup-toggle="allowLinks">
                        <span class="material-symbols-outlined">link_off</span>
                    </button>` : ''}
                    ${showCleanupStyles ? `<button type="button" class="btn-icon" id="${id}-toggle-styles" title="Очищати стилі" data-cleanup-toggle="allowStyles">
                        <span class="material-symbols-outlined">format_color_reset</span>
                    </button>` : ''}
                    ${showCleanupImages ? `<button type="button" class="btn-icon" id="${id}-toggle-images" title="Очищати зображення" data-cleanup-toggle="allowImages">
                        <span class="material-symbols-outlined">hide_image</span>
                    </button>` : ''}
                </div>
                ` : ''}
            </div>
            ` : ''}
        </div>
    `;
}

/**
 * Рендерити тулбар
 */
function renderToolbar(id, { showEditing, showCode, validation, showFindReplace }) {
    return `
            <!-- Toolbar -->
            <div class="toolbar-wrapper">
                <div class="format-toolbar" id="${id}-toolbar">
                    ${showEditing ? renderFormattingButtons() : ''}
                    ${showFindReplace ? renderFindReplaceDropdown(id) : ''}
                    ${showEditing && showCode ? '<div class="toolbar-separator"></div>' : ''}
                    ${showCode ? renderModeSwitch(id) : ''}
                </div>
                ${validation ? `
                <div class="validation-results-wrapper">
                    <div id="${id}-validation-results" class="chip-list"></div>
                </div>
                ` : ''}
            </div>`;
}

/**
 * Кнопки форматування
 */
function renderFormattingButtons() {
    return `
                    <button type="button" class="btn-icon" data-action="bold" title="Жирний (Ctrl+B)" aria-label="Жирний">
                        <span class="material-symbols-outlined">format_bold</span>
                    </button>
                    <button type="button" class="btn-icon" data-action="italic" title="Курсив (Ctrl+I)" aria-label="Курсив">
                        <span class="material-symbols-outlined">format_italic</span>
                    </button>
                    <button type="button" class="btn-icon" data-action="h1" title="Заголовок H1" aria-label="Заголовок H1">
                        <span class="material-symbols-outlined">format_h1</span>
                    </button>
                    <button type="button" class="btn-icon" data-action="h2" title="Заголовок H2" aria-label="Заголовок H2">
                        <span class="material-symbols-outlined">format_h2</span>
                    </button>
                    <button type="button" class="btn-icon" data-action="h3" title="Заголовок H3" aria-label="Заголовок H3">
                        <span class="material-symbols-outlined">format_h3</span>
                    </button>
                    <button type="button" class="btn-icon" data-action="list" title="Список" aria-label="Список">
                        <span class="material-symbols-outlined">format_list_bulleted</span>
                    </button>
                    <button type="button" class="btn-icon" data-action="lowercase" title="всі маленькі" aria-label="Нижній регістр">
                        <span class="material-symbols-outlined">lowercase</span>
                    </button>
                    <button type="button" class="btn-icon" data-action="uppercase" title="ВСІ ВЕЛИКІ" aria-label="Верхній регістр">
                        <span class="material-symbols-outlined">uppercase</span>
                    </button>
                    <button type="button" class="btn-icon" data-action="titlecase" title="Кожне Слово З Великої" aria-label="Кожне слово з великої">
                        <span class="material-symbols-outlined">match_case</span>
                    </button>`;
}

/**
 * Find & Replace — dropdown з кнопки тулбара
 */
function renderFindReplaceDropdown(id) {
    return `
                    <div class="dropdown-wrapper">
                        <button type="button" class="btn-icon" data-dropdown-trigger title="Знайти та замінити" aria-label="Знайти та замінити">
                            <span class="material-symbols-outlined">find_replace</span>
                        </button>
                        <div class="dropdown-panel" style="min-width: 300px; padding: 12px;">
                            <div class="group column">
                                <input type="text" id="${id}-find-input" class="input-main" placeholder="Що знайти...">
                            </div>
                            <div class="group column">
                                <input type="text" id="${id}-replace-input" class="input-main" placeholder="На що замінити...">
                            </div>
                            <button type="button" class="btn-secondary" id="${id}-replace-all-btn" style="width: 100%;">Замінити все</button>
                        </div>
                    </div>`;
}

/**
 * Перемикач Текст/Код
 */
function renderModeSwitch(id) {
    return `
                    <div class="switch switch-fit">
                        <input type="radio" id="${id}-mode-text" name="${id}-mode" value="text" checked>
                        <label for="${id}-mode-text" class="switch-label" title="Текст"><span class="material-symbols-outlined">edit_note</span></label>
                        <input type="radio" id="${id}-mode-code" name="${id}-mode" value="code">
                        <label for="${id}-mode-code" class="switch-label" title="Код"><span class="material-symbols-outlined">code</span></label>
                    </div>`;
}
