// js/utils/template-loader.js

/**
 * Завантажує HTML шаблон з templates/partials/
 * @param {string} templateName - назва файлу без розширення
 * @returns {Promise<string>} - HTML шаблон
 */
export async function loadTemplate(templateName) {
    const response = await fetch(`templates/partials/${templateName}.html`);
    if (!response.ok) {
        throw new Error(`Не вдалося завантажити шаблон: ${templateName}`);
    }
    return await response.text();
}

/**
 * Рендерить шаблон, підставляючи дані
 * Підтримує прості {{key}} плейсхолдери та умовні блоки {{#key}}...{{/key}}
 * @param {string} template - HTML шаблон
 * @param {object} data - дані для підстановки
 * @returns {string} - відрендерений HTML
 */
export function renderTemplate(template, data) {
    let result = template;

    // Обробка умовних блоків {{#key}}...{{/key}}
    result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
        return data[key] ? content : '';
    });

    // Обробка простих плейсхолдерів {{key}}
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] !== undefined ? data[key] : '';
    });

    return result;
}
