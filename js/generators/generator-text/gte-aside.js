// js/generators/generator-text/gte-aside.js

/**
 * Ініціалізація обробників кнопок у footer aside
 */
export function initAsideButtons() {
    const addButton = document.getElementById('btn-add-banned-word');
    if (addButton) {
        addButton.addEventListener('click', async () => {
            console.log('🆕 Відкриття модалу додавання забороненого слова');

            // Завантажити дані перед відкриттям модалу
            const { loadBannedWords } = await import('../../banned-words/banned-words-data.js');
            await loadBannedWords();

            const { openBannedWordModal } = await import('../../banned-words/banned-words-manage.js');
            await openBannedWordModal();
        });
    }
}
