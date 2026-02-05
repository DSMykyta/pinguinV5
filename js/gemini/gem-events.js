// js/gemini/gem-events.js

/**
 * GEMINI EVENTS
 * Event listeners та обробники подій
 */

import { getGeminiDOM } from './gem-dom.js';
import { callGemini, parseHtmlFromResponse, parseSeoFromResponse } from './gem-api.js';
import { getActivePlugin, getAllPlugins } from './gem-plugins.js';
import { showLoader, hideLoader } from '../common/ui-loading.js';
import { showToast } from '../common/ui-toast.js';

let currentPluginId = 'write';
let isOpen = false;

/**
 * Ініціалізація event listeners
 */
export function initEventListeners() {
    const dom = getGeminiDOM();
    if (!dom.fabContainer) return;

    // FAB toggle (відкрити/закрити інпути або виконати)
    dom.fabTrigger?.addEventListener('click', handleFabClick);

    // Toggle режиму (write/clean)
    dom.modeToggle?.addEventListener('click', handleModeToggle);

    // Закриття при кліку ззовні
    document.addEventListener('click', handleOutsideClick);

    // Enter в інпутах - виконати
    dom.inputName?.addEventListener('keydown', handleInputKeydown);
    dom.inputUrl?.addEventListener('keydown', handleInputKeydown);
    dom.inputContext?.addEventListener('keydown', handleInputKeydown);

    // Оновити UI відповідно до поточного плагіна
    updateUIForPlugin();
}

/**
 * Обробка кліку на FAB
 */
async function handleFabClick(e) {
    e.stopPropagation();
    const dom = getGeminiDOM();

    if (!isOpen) {
        // Відкрити меню
        dom.fabContainer.classList.add('is-open');
        isOpen = true;
        // Фокус на перший інпут
        setTimeout(() => {
            if (currentPluginId === 'write') {
                dom.inputName?.focus();
            } else {
                dom.inputContext?.focus();
            }
        }, 200);
    } else {
        // Виконати запит
        await executeRequest();
    }
}

/**
 * Обробка toggle режиму
 */
function handleModeToggle(e) {
    e.stopPropagation();

    const plugins = getAllPlugins();
    if (plugins.length < 2) return;

    // Перемикаємо між плагінами
    const currentIndex = plugins.findIndex(p => p.id === currentPluginId);
    const nextIndex = (currentIndex + 1) % plugins.length;
    currentPluginId = plugins[nextIndex].id;

    updateUIForPlugin();
    showToast(`Режим: ${plugins[nextIndex].name}`, 'info', 2000);
}

/**
 * Оновити UI для поточного плагіна
 */
function updateUIForPlugin() {
    const dom = getGeminiDOM();
    const plugin = getActivePlugin(currentPluginId);

    if (!plugin || !dom.fabIcon) return;

    // Оновити іконку FAB
    dom.fabIcon.textContent = plugin.icon;

    // Показати/приховати інпути
    const showName = plugin.inputs?.includes('name');
    const showUrl = plugin.inputs?.includes('url');

    if (dom.optionName) {
        dom.optionName.style.display = showName ? '' : 'none';
    }
    if (dom.optionUrl) {
        dom.optionUrl.style.display = showUrl ? '' : 'none';
    }
}

/**
 * Обробка кліку ззовні (закрити меню)
 */
function handleOutsideClick(e) {
    const dom = getGeminiDOM();
    if (!dom.fabContainer) return;

    if (!dom.fabContainer.contains(e.target) && isOpen) {
        dom.fabContainer.classList.remove('is-open');
        isOpen = false;
    }
}

/**
 * Обробка Enter в інпутах
 */
function handleInputKeydown(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        executeRequest();
    }
}

/**
 * Виконати запит до Gemini
 */
async function executeRequest() {
    const dom = getGeminiDOM();
    const plugin = getActivePlugin(currentPluginId);

    if (!plugin) {
        showToast('Плагін не знайдено', 'error');
        return;
    }

    // Збираємо дані
    const inputData = {
        name: dom.inputName?.value?.trim() || '',
        url: dom.inputUrl?.value?.trim() || '',
        context: dom.inputContext?.value?.trim() || '',
        editorContent: getEditorContent()
    };

    // Валідація
    if (plugin.id === 'write' && !inputData.name && !inputData.url) {
        showToast('Введіть назву товару або URL', 'warning');
        dom.inputName?.focus();
        return;
    }

    if (plugin.id === 'clean' && !inputData.editorContent) {
        showToast('Редактор порожній', 'warning');
        return;
    }

    // Закриваємо меню
    dom.fabContainer?.classList.remove('is-open');
    isOpen = false;

    // Показуємо loader
    const sectionContent = document.querySelector('#section-text .section-content');
    const loader = showLoader(sectionContent, {
        type: 'spinner',
        message: 'Gemini обробляє...',
        overlay: true
    });

    try {
        // Будуємо prompt через плагін
        const userPrompt = plugin.buildPrompt(inputData);

        // Виконуємо запит
        const result = await callGemini(userPrompt, plugin.systemPrompt);

        // Парсимо відповідь через плагін
        const parsed = plugin.parseResponse(result.text);

        // Вставляємо результат в редактор
        setEditorContent(parsed.html);

        // Заповнюємо SEO поля
        if (parsed.seo) {
            setSeoFields(parsed.seo);
        }

        showToast('Готово!', 'success');

        // Очищуємо інпути
        clearInputs();

    } catch (error) {
        console.error('[Gemini] Помилка:', error);
        showToast(`Помилка: ${error.message}`, 'error', 5000);
    } finally {
        if (loader) {
            loader.hide();
        }
    }
}

/**
 * Отримати контент з редактора
 */
function getEditorContent() {
    const dom = getGeminiDOM();
    const codeMode = document.getElementById('ghl-mode-code')?.checked;

    if (codeMode && dom.codeEditor) {
        return dom.codeEditor.value;
    }
    return dom.editor?.innerHTML || '';
}

/**
 * Встановити контент в редактор
 */
function setEditorContent(html) {
    const dom = getGeminiDOM();
    const codeMode = document.getElementById('ghl-mode-code')?.checked;

    if (codeMode && dom.codeEditor) {
        dom.codeEditor.value = html;
        dom.codeEditor.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (dom.editor) {
        dom.editor.innerHTML = html;
        dom.editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

/**
 * Заповнити SEO поля
 */
function setSeoFields(seo) {
    const dom = getGeminiDOM();

    if (dom.seoTitle && seo.title) {
        dom.seoTitle.value = seo.title;
        dom.seoTitle.dispatchEvent(new Event('input', { bubbles: true }));
    }

    if (dom.seoKeywords && seo.keywords) {
        dom.seoKeywords.value = seo.keywords;
        dom.seoKeywords.dispatchEvent(new Event('input', { bubbles: true }));
    }

    if (dom.seoDescription && seo.description) {
        // Додаємо стандартний текст з випадковим номером
        const phoneNumbers = ["(096)519-78-22", "(073)475-67-07", "(099)237-90-38"];
        const randomPhone = phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)];
        const fullDescription = `${seo.description} Для заказа звоните по номеру: ${randomPhone}`;

        dom.seoDescription.value = fullDescription;
        dom.seoDescription.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

/**
 * Очистити інпути
 */
function clearInputs() {
    const dom = getGeminiDOM();
    if (dom.inputName) dom.inputName.value = '';
    if (dom.inputUrl) dom.inputUrl.value = '';
    if (dom.inputContext) dom.inputContext.value = '';
}

/**
 * Отримати поточний ID плагіна
 */
export function getCurrentPluginId() {
    return currentPluginId;
}

/**
 * Встановити поточний плагін
 */
export function setCurrentPluginId(id) {
    currentPluginId = id;
    updateUIForPlugin();
}
