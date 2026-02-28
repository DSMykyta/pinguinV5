// js/generators/generator-table/gt-config.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                TABLE GENERATOR — КОНФІГУРАЦІЯ (CONFIG)                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Константи, CSS-класи, селектори та налаштування генератора   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// CSS-класи, що застосовуються до рядків
export const ROW_CLASSES = {
    EXCLUSIVE: ['td', 'th-strong', 'th', 'new-table', 'h3'],
    TD: 'td',
    TH: 'th',
    TH_STRONG: 'th-strong',
    H3: 'h3',
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
    INPUT_TAG: '.tag',
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