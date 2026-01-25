// js/generators/generator-highlight/ghl-editor.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║           HIGHLIGHT GENERATOR - RICH TEXT EDITOR                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Повноцінний WYSIWYG редактор на базі contentEditable з підтримкою
 * форматування тексту та підсвічування заборонених слів.
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - initRichEditor() - Ініціалізація редактора
 * - getEditorContent() - Отримати HTML контент
 * - getPlainText() - Отримати чистий текст
 * - applyHighlights(regex, className) - Застосувати підсвічування
 * - clearHighlights() - Очистити підсвічування
 */

import { getHighlightDOM } from './ghl-dom.js';

// ============================================================================
// СТАН
// ============================================================================

let editorElement = null;
let toolbarElement = null;
let isInitialized = false;

// ============================================================================
// КОНФІГУРАЦІЯ ТУЛБАРУ
// ============================================================================

const TOOLBAR_CONFIG = [
    { 
        type: 'group',
        items: [
            { command: 'bold', icon: 'format_bold', title: 'Жирний (Ctrl+B)' },
            { command: 'italic', icon: 'format_italic', title: 'Курсив (Ctrl+I)' },
            { command: 'underline', icon: 'format_underline', title: 'Підкреслений (Ctrl+U)' },
        ]
    },
    { type: 'separator' },
    {
        type: 'group',
        items: [
            { command: 'formatBlock', value: 'h2', icon: 'format_h2', title: 'Заголовок H2' },
            { command: 'formatBlock', value: 'h3', icon: 'format_h3', title: 'Заголовок H3' },
            { command: 'formatBlock', value: 'p', icon: 'format_paragraph', title: 'Параграф' },
        ]
    },
    { type: 'separator' },
    {
        type: 'group',
        items: [
            { command: 'insertUnorderedList', icon: 'format_list_bulleted', title: 'Маркований список' },
            { command: 'insertOrderedList', icon: 'format_list_numbered', title: 'Нумерований список' },
        ]
    },
    { type: 'separator' },
    {
        type: 'group',
        items: [
            { command: 'justifyLeft', icon: 'format_align_left', title: 'Вирівняти ліворуч' },
            { command: 'justifyCenter', icon: 'format_align_center', title: 'Вирівняти по центру' },
            { command: 'justifyRight', icon: 'format_align_right', title: 'Вирівняти праворуч' },
        ]
    },
    { type: 'separator' },
    {
        type: 'group',
        items: [
            { command: 'removeFormat', icon: 'format_clear', title: 'Очистити форматування' },
        ]
    },
];

// ============================================================================
// ІНІЦІАЛІЗАЦІЯ
// ============================================================================

/**
 * Ініціалізація rich text редактора
 */
export function initRichEditor() {
    const dom = getHighlightDOM();
    if (!dom.editorContainer || isInitialized) return;

    // Створюємо структуру редактора
    createEditorStructure(dom);
    
    // Налаштовуємо обробники подій
    setupEventHandlers();
    
    isInitialized = true;
    console.log('✅ Rich Text Editor ініціалізовано');
}

/**
 * Створює HTML структуру редактора
 */
function createEditorStructure(dom) {
    // Очищаємо контейнер
    dom.editorContainer.innerHTML = '';
    dom.editorContainer.classList.add('rich-editor-container');

    // Створюємо тулбар
    toolbarElement = document.createElement('div');
    toolbarElement.className = 'rich-editor-toolbar';
    toolbarElement.innerHTML = buildToolbarHTML();
    
    // Створюємо contentEditable область
    editorElement = document.createElement('div');
    editorElement.className = 'rich-editor-content input-main';
    editorElement.contentEditable = 'true';
    editorElement.setAttribute('data-placeholder', 'Вставте сюди текст для перевірки...');
    editorElement.spellcheck = false;

    // Додаємо в контейнер
    dom.editorContainer.appendChild(toolbarElement);
    dom.editorContainer.appendChild(editorElement);
}

/**
 * Генерує HTML для тулбару
 */
function buildToolbarHTML() {
    let html = '';
    
    for (const item of TOOLBAR_CONFIG) {
        if (item.type === 'separator') {
            html += '<div class="toolbar-separator"></div>';
        } else if (item.type === 'group') {
            html += '<div class="toolbar-group">';
            for (const btn of item.items) {
                const dataValue = btn.value ? `data-value="${btn.value}"` : '';
                html += `
                    <button type="button" 
                            class="btn-icon" 
                            data-command="${btn.command}" 
                            ${dataValue}
                            title="${btn.title}"
                            aria-label="${btn.title}">
                        <span class="material-symbols-outlined">${btn.icon}</span>
                    </button>
                `;
            }
            html += '</div>';
        }
    }
    
    return html;
}

// ============================================================================
// ОБРОБНИКИ ПОДІЙ
// ============================================================================

/**
 * Налаштовує всі обробники подій
 */
function setupEventHandlers() {
    // Клік по кнопках тулбару
    toolbarElement.addEventListener('click', handleToolbarClick);
    
    // Запобігаємо втраті фокусу при кліку на тулбар
    toolbarElement.addEventListener('mousedown', (e) => {
        e.preventDefault();
    });
    
    // Оновлення стану кнопок при зміні виділення
    editorElement.addEventListener('keyup', updateToolbarState);
    editorElement.addEventListener('mouseup', updateToolbarState);
    
    // Гарячі клавіші
    editorElement.addEventListener('keydown', handleHotkeys);
    
    // Обробка вставки - очищаємо форматування
    editorElement.addEventListener('paste', handlePaste);
    
    // Placeholder логіка
    editorElement.addEventListener('focus', handleFocus);
    editorElement.addEventListener('blur', handleBlur);
    editorElement.addEventListener('input', handleInput);
}

/**
 * Обробка кліку по тулбару
 */
function handleToolbarClick(e) {
    const button = e.target.closest('button[data-command]');
    if (!button) return;
    
    const command = button.dataset.command;
    const value = button.dataset.value || null;
    
    executeCommand(command, value);
    editorElement.focus();
    updateToolbarState();
}

/**
 * Виконання команди форматування
 */
function executeCommand(command, value = null) {
    if (command === 'formatBlock' && value) {
        document.execCommand(command, false, `<${value}>`);
    } else {
        document.execCommand(command, false, value);
    }
}

/**
 * Оновлення активного стану кнопок тулбару
 */
function updateToolbarState() {
    const buttons = toolbarElement.querySelectorAll('button[data-command]');
    
    buttons.forEach(button => {
        const command = button.dataset.command;
        let isActive = false;
        
        try {
            if (command === 'formatBlock') {
                const value = button.dataset.value;
                const block = document.queryCommandValue('formatBlock');
                isActive = block.toLowerCase() === value.toLowerCase();
            } else {
                isActive = document.queryCommandState(command);
            }
        } catch (e) {
            // Ігноруємо помилки queryCommandState
        }
        
        button.classList.toggle('active', isActive);
    });
}

/**
 * Гарячі клавіші
 */
function handleHotkeys(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    
    const hotkeys = {
        'b': 'bold',
        'i': 'italic',
        'u': 'underline',
    };
    
    const command = hotkeys[e.key.toLowerCase()];
    if (command) {
        e.preventDefault();
        executeCommand(command);
        updateToolbarState();
    }
}

/**
 * Обробка вставки - очищаємо зайве форматування
 */
function handlePaste(e) {
    e.preventDefault();
    
    // Отримуємо текст без форматування
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    
    // Вставляємо як звичайний текст
    document.execCommand('insertText', false, text);
}

/**
 * Обробка фокусу
 */
function handleFocus() {
    editorElement.classList.add('focused');
}

/**
 * Обробка втрати фокусу
 */
function handleBlur() {
    editorElement.classList.remove('focused');
}

/**
 * Обробка вводу - для placeholder
 */
function handleInput() {
    // Placeholder керується через CSS :empty
}

// ============================================================================
// ПУБЛІЧНІ МЕТОДИ
// ============================================================================

/**
 * Отримати HTML контент редактора
 * @returns {string}
 */
export function getEditorContent() {
    if (!editorElement) return '';
    return editorElement.innerHTML;
}

/**
 * Отримати чистий текст без HTML
 * @returns {string}
 */
export function getPlainText() {
    if (!editorElement) return '';
    return editorElement.textContent || '';
}

/**
 * Встановити контент редактора
 * @param {string} html - HTML контент
 */
export function setEditorContent(html) {
    if (!editorElement) return;
    editorElement.innerHTML = html;
}

/**
 * Застосувати підсвічування до тексту
 * @param {RegExp} regex - Регулярний вираз для пошуку
 * @param {string} className - CSS клас для підсвічування
 */
export function applyHighlights(regex, className = 'highlight-banned-word') {
    if (!editorElement || !regex) return;
    
    // Зберігаємо позицію курсору
    const selection = window.getSelection();
    const savedRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
    
    // Отримуємо контент та видаляємо старі mark
    let content = editorElement.innerHTML;
    content = content.replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1');
    
    // Застосовуємо нові підсвічування
    // Працюємо з текстовими вузлами, щоб не зламати HTML теги
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    highlightTextNodes(tempDiv, regex, className);
    
    editorElement.innerHTML = tempDiv.innerHTML;
    
    // Відновлюємо курсор (приблизно)
    editorElement.focus();
}

/**
 * Рекурсивно підсвічує текст у текстових вузлах
 */
function highlightTextNodes(node, regex, className) {
    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (!text.trim()) return;
        
        regex.lastIndex = 0;
        const matches = [...text.matchAll(regex)];
        
        if (matches.length === 0) return;
        
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        
        for (const match of matches) {
            // Текст до матчу
            if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
            }
            
            // Підсвічений текст
            const mark = document.createElement('mark');
            mark.className = className;
            mark.textContent = match[0];
            fragment.appendChild(mark);
            
            lastIndex = match.index + match[0].length;
        }
        
        // Залишок тексту
        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
        
        node.parentNode.replaceChild(fragment, node);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'MARK') {
        // Рекурсивно обробляємо дочірні елементи
        // Копіюємо childNodes, бо вони змінюються при обробці
        const children = Array.from(node.childNodes);
        for (const child of children) {
            highlightTextNodes(child, regex, className);
        }
    }
}

/**
 * Очистити всі підсвічування
 */
export function clearHighlights() {
    if (!editorElement) return;
    
    let content = editorElement.innerHTML;
    content = content.replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1');
    editorElement.innerHTML = content;
}

/**
 * Отримати посилання на елемент редактора (для зовнішніх обробників)
 * @returns {HTMLElement|null}
 */
export function getEditorElement() {
    return editorElement;
}

/**
 * Перевірити чи редактор ініціалізований
 * @returns {boolean}
 */
export function isEditorInitialized() {
    return isInitialized;
}
