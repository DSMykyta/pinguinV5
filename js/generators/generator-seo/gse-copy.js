// js/generators/generator-seo/gse-copy.js

/**
 * ПЛАГІН: Копіювання SEO полів
 * Можна видалити — SEO працюватиме без копіювання.
 */

import { registerSeoPlugin } from './gse-plugins.js';
import { getSeoDOM } from './gse-dom.js';
import { showToast } from '../../common/ui-toast.js';

/**
 * Копіює текст в буфер обміну та показує візуальний фідбек.
 * @param {HTMLInputElement} inputElement - Поле input з текстом
 * @param {string} fieldName - Назва поля для повідомлення
 */
async function copyFieldToClipboard(inputElement, fieldName) {
    if (!inputElement.value) return;

    try {
        // Копіюємо в буфер обміну
        await navigator.clipboard.writeText(inputElement.value);

        // Виділяємо текст в полі
        inputElement.select();
        inputElement.setSelectionRange(0, 99999); // Для мобільних

        // Знаходимо батьківський .content-line.panel
        const resultLine = inputElement.closest('.content-line.panel');
        if (resultLine) {
            // Додаємо активний клас
            resultLine.classList.add('copied');

            // Прибираємо клас через 300ms
            setTimeout(() => {
                resultLine.classList.remove('copied');
            }, 300);
        }

        // Показуємо toast
        showToast(`${fieldName} скопійовано`, 'success', 2000);

    } catch (err) {
        showToast('Помилка копіювання', 'error');
    }
}

/**
 * Ініціалізує слухачів для копіювання полів SEO результатів.
 */
function initCopyListeners() {
    const dom = getSeoDOM();

    // Масив полів з їх назвами
    const fields = [
        { input: dom.seoTitleInput, name: 'Title' },
        { input: dom.seoKeywordsInput, name: 'Keywords' },
        { input: dom.seoDescriptionInput, name: 'Description' }
    ];

    fields.forEach(({ input, name }) => {
        if (!input) return;

        // Слухач на клік по input
        input.addEventListener('click', () => {
            copyFieldToClipboard(input, name);
        });

        // Також слухач на клік по всьому .content-line.panel
        const resultLine = input.closest('.content-line.panel');
        if (resultLine) {
            resultLine.addEventListener('click', (e) => {
                // Якщо клік не по input - копіюємо все одно
                if (e.target !== input) {
                    copyFieldToClipboard(input, name);
                }
            });
        }
    });
}

// Самореєстрація плагіна
registerSeoPlugin('onInit', initCopyListeners);
