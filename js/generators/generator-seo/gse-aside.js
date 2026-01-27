// js/generators/generator-seo/gse-aside.js

/**
 * ПЛАГІН: Кнопки в footer aside SEO
 * Можна видалити — SEO працюватиме без кнопки "Додати ключове слово".
 */

import { registerSeoPlugin } from './gse-plugins.js';

/**
 * Ініціалізація обробників кнопок у footer aside
 */
function initAsideButtons() {
    const addKeywordBtn = document.getElementById('btn-add-keyword-seo');
    if (addKeywordBtn) {
        addKeywordBtn.addEventListener('click', async () => {
            console.log('🆕 Відкриття модалу додавання ключового слова з SEO');

            // Завантажити дані перед відкриттям модалу
            const { loadKeywords } = await import('../../keywords/keywords-data.js');
            await loadKeywords();

            const { showAddKeywordModal } = await import('../../keywords/keywords-crud.js');
            await showAddKeywordModal();
        });
    }
}

// Самореєстрація плагіна
registerSeoPlugin('onInit', initAsideButtons);
