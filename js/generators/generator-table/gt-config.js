/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                  TABLE GENERATOR - КОНФІГУРАЦІЯ (CONFIG)                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * * ПРИЗНАЧЕННЯ:
 * Централізоване зберігання всіх констант, CSS-класів, селекторів та налаштувань.
 * Це дозволяє легко змінювати ключові параметри генератора в одному місці,
 * не шукаючи їх по всьому коду.
 */

// CSS-класи, що застосовуються до рядків
export const ROW_CLASSES = {
    EXCLUSIVE: ['td', 'th-strong', 'th', 'new-table', 'h2'],
    TD: 'td',
    TH: 'th',
    TH_STRONG: 'th-strong',
    H2: 'h2',
    NEW_TABLE: 'new-table',
    BOLD: 'bold',
    ITALIC: 'italic',
    COLSPAN2: 'colspan2',
    SINGLE: 'single',
    ADDED: 'added'
};

// CSS-селектори для швидкого доступу до елементів
export const SELECTORS = {
    ROWS_CONTAINER: '#rows-container',
    INPUTS_BLOC: '.content-bloc',
    INPUT_LEFT: '.input-box.large input, .input-box.large textarea',
    INPUT_RIGHT: '.input-box.small input, .input-box.small textarea',
    INPUT_TAG: '.input-tag',
    RELOAD_BTN: '#reload-section-tablet',
};

// Конфігурація для бібліотеки Sortable.js
export const SORTABLE_CONFIG = {
    handle: '.btn-icon.drag',
    animation: 150
};

// Регулярні вирази для пошуку нутрієнтів
export const NUTRITION_PATTERNS = {
    SERVING: /Пищевая ценность|Харчова цінність/gi,
    NUTRIENTS: ['Жиры', 'Жири', 'Углеводы', 'Вуглеводи', 'Белок', 'Білок']
};