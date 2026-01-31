// js/glossary/glossary-modals.js

/**
 * Ініціалізує обробники для модалів глосарію
 */
export function initGlossaryModals() {
    // Слухаємо кліки на кнопки "Додати" в empty state - відкриваємо модал редагування ключового слова
    document.addEventListener('click', async (event) => {
        const addButton = event.target.closest('.btn-add-glossary-text');
        if (addButton) {
            const itemId = addButton.dataset.itemId;
            console.log(`📝 Відкриття модалу редагування для глосарію: ${itemId}`);

            // Завантажити дані перед відкриттям модалу
            const { loadKeywords } = await import('../keywords/keywords-data.js');
            await loadKeywords();

            // Відкриваємо модал редагування ключового слова
            const { showEditKeywordModal } = await import('../keywords/keywords-crud.js');
            await showEditKeywordModal(itemId);
        }
    });

    // Обробник для кнопки "Додати ключове слово" в панелі
    const addKeywordBtn = document.getElementById('btn-add-keyword-aside');
    if (addKeywordBtn) {
        addKeywordBtn.addEventListener('click', async () => {
            console.log('🆕 Клік на "Додати ключове слово" в глосарії');
            const { showAddKeywordModal } = await import('../keywords/keywords-crud.js');
            await showAddKeywordModal();
        });
    }

    // Обробник для кнопок редагування елементів глосарію
    document.addEventListener('click', async (event) => {
        const editButton = event.target.closest('.btn-edit-glossary-item');
        if (editButton) {
            const itemId = editButton.dataset.itemId;
            console.log(`✏️ Редагування елемента глосарію: ${itemId}`);

            // Завантажити дані перед відкриттям модалу
            const { loadKeywords } = await import('../keywords/keywords-data.js');
            await loadKeywords();

            const { showEditKeywordModal } = await import('../keywords/keywords-crud.js');
            await showEditKeywordModal(itemId);
        }
    });
}
