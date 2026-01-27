// js/generators/generator-link/gln-aside.js

/**
 * ПЛАГІН: Кнопки в footer aside Links
 * Можна видалити — Links працюватиме без кнопки "Додати бренд".
 */

import { registerLinksPlugin } from './gln-plugins.js';

/**
 * Ініціалізація обробників кнопок у footer aside
 */
function initAsideButtons() {
    const addButton = document.getElementById('btn-add-brand-links');
    if (addButton) {
        addButton.addEventListener('click', async () => {
            console.log('🆕 Відкриття модалу додавання бренду');

            // Завантажити дані перед відкриттям модалу
            const { loadBrands } = await import('../../brands/brands-data.js');
            await loadBrands();

            const { showAddBrandModal } = await import('../../brands/brands-crud.js');
            await showAddBrandModal();
        });
    }
}

// Самореєстрація плагіна
registerLinksPlugin('onInit', initAsideButtons);
