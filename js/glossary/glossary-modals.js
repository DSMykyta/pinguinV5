// js/glossary/glossary-modals.js

/**
 * Ініціалізує обробники для модалів глосарію
 * ПРИМІТКА: Обробники кнопок edit/add тепер в glossary-articles.js через ui-actions
 */
export function initGlossaryModals() {
    // Обробник для кнопки "Додати ключове слово" в панелі
    const addKeywordBtn = document.getElementById('btn-add-keyword-aside');
    if (addKeywordBtn) {
        addKeywordBtn.addEventListener('click', async () => {
            console.log('🆕 Клік на "Додати ключове слово" в глосарії');
            const { showAddKeywordModal } = await import('../keywords/keywords-crud.js');
            await showAddKeywordModal();
        });
    }
}
