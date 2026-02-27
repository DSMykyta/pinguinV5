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

            // Завантажити дані перед відкриттям модалу
            const { loadBrands } = await import('../../pages/brands/brands-data.js');
            await loadBrands();

            const { showAddBrandModal } = await import('../../pages/brands/brands-crud.js');
            await showAddBrandModal();
        });
    }
}

export function init(context) {
    registerLinksPlugin('onInit', initAsideButtons);
}
