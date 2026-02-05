// js/gemini/gem-dom.js

/**
 * GEMINI DOM
 * DOM елементи та їх створення
 */

let domCache = null;

/**
 * HTML шаблон FAB з інпутами
 * Використовує існуючі CSS класи: page-size-selector, page-size-trigger, page-size-option
 */
const FAB_TEMPLATE = `
<div class="page-size-selector" id="gem-fab-container" style="position: absolute; bottom: 16px; right: 16px; z-index: 10;">
    <!-- Toggle режиму -->
    <button class="btn-icon" id="gem-mode-toggle" title="Перемкнути режим" style="position: absolute; right: 56px; bottom: 4px;">
        <span class="material-symbols-outlined">swap_horiz</span>
    </button>

    <!-- FAB кнопка -->
    <button class="page-size-trigger" id="gem-fab-trigger" aria-label="Gemini AI">
        <span class="material-symbols-outlined" id="gem-fab-icon">edit_note</span>
    </button>

    <!-- Меню з інпутами -->
    <div class="page-size-menu">
        <div class="page-size-option" style="bottom: 60px; padding: 0; background: transparent; box-shadow: none;">
            <input type="text" id="gem-input-context" placeholder="Доп. контекст..."
                style="width: 220px; padding: 10px 14px; font-size: 14px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.12);">
        </div>
        <div class="page-size-option" id="gem-option-url" style="bottom: 108px; padding: 0; background: transparent; box-shadow: none;">
            <input type="text" id="gem-input-url" placeholder="HTTP://..."
                style="width: 220px; padding: 10px 14px; font-size: 14px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.12);">
        </div>
        <div class="page-size-option" id="gem-option-name" style="bottom: 156px; padding: 0; background: transparent; box-shadow: none;">
            <input type="text" id="gem-input-name" placeholder="Назва товару"
                style="width: 220px; padding: 10px 14px; font-size: 14px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.12);">
        </div>
    </div>
</div>
`;

/**
 * Створити FAB елемент в контейнері
 * @param {HTMLElement} container - Контейнер для FAB
 * @returns {boolean} Успішність
 */
export function createFabElement(container) {
    if (!container) {
        console.error('[Gemini DOM] Контейнер не знайдено');
        return false;
    }

    // Перевірити чи вже існує
    if (container.querySelector('#gem-fab-container')) {
        return true;
    }

    // Додати position: relative до контейнера якщо потрібно
    const computedStyle = window.getComputedStyle(container);
    if (computedStyle.position === 'static') {
        container.style.position = 'relative';
    }

    container.insertAdjacentHTML('beforeend', FAB_TEMPLATE);

    // Скинути кеш DOM
    domCache = null;

    return true;
}

/**
 * Видалити FAB елемент
 */
export function removeFabElement() {
    const fab = document.getElementById('gem-fab-container');
    if (fab) {
        fab.remove();
        domCache = null;
    }
}

/**
 * Отримати DOM елементи Gemini
 * @returns {Object} DOM елементи
 */
export function getGeminiDOM() {
    if (domCache) {
        return domCache;
    }

    domCache = {
        // FAB елементи
        fabContainer: document.getElementById('gem-fab-container'),
        fabTrigger: document.getElementById('gem-fab-trigger'),
        fabIcon: document.getElementById('gem-fab-icon'),
        modeToggle: document.getElementById('gem-mode-toggle'),

        // Інпути
        inputName: document.getElementById('gem-input-name'),
        inputUrl: document.getElementById('gem-input-url'),
        inputContext: document.getElementById('gem-input-context'),

        // Опції (для показу/приховування)
        optionName: document.getElementById('gem-option-name'),
        optionUrl: document.getElementById('gem-option-url'),

        // Зовнішні елементи (редактор, SEO)
        editor: document.getElementById('ghl-editor'),
        codeEditor: document.getElementById('ghl-code-editor'),
        seoTitle: document.getElementById('seo-title'),
        seoKeywords: document.getElementById('seo-keywords'),
        seoDescription: document.getElementById('seo-description')
    };

    return domCache;
}

/**
 * Скинути кеш DOM
 */
export function resetGeminiDOM() {
    domCache = null;
}
