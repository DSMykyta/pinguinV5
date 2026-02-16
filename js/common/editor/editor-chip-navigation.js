// js/common/editor/editor-chip-navigation.js

/**
 * PLUGIN — Навігація по кліку на чіпи валідації
 *
 * Клік на червоний чіп (заборонене слово) → перехід до слова в редакторі.
 * Циклічна навігація: 1→2→3→1...
 * Flash-ефект для візуального підсвічування.
 *
 * Можна видалити — валідація працюватиме без навігації.
 */

export function init(state) {
    if (!state.dom.validationResults || !state.dom.editor) return;

    // Зберігаємо поточний індекс для кожного слова
    const navigationState = new Map();

    // Делегування подій — один обробник на контейнер
    state.dom.validationResults.addEventListener('click', (e) => {
        const errorChip = e.target.closest('.chip-error[data-banned-word]');
        if (errorChip) {
            const word = errorChip.dataset.bannedWord;
            if (word) navigateToBannedWord(word);
        }
    });

    function navigateToBannedWord(word) {
        // Знаходимо всі входження слова
        const highlights = Array.from(
            state.dom.editor.querySelectorAll('.highlight-error')
        ).filter(el => el.textContent.toLowerCase() === word.toLowerCase());

        if (highlights.length === 0) return;

        // Циклічна навігація
        const stateKey = `word:${word.toLowerCase()}`;
        let currentIndex = navigationState.get(stateKey) ?? -1;
        currentIndex = (currentIndex + 1) % highlights.length;
        navigationState.set(stateKey, currentIndex);

        const target = highlights[currentIndex];

        // Прокручуємо до елемента
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Flash-ефект
        applyFlash(target);

        // Ставимо курсор в кінець слова
        placeCursorAtEnd(target);
    }

    function applyFlash(element) {
        element.classList.remove('flash');
        void element.offsetWidth; // Force reflow
        element.classList.add('flash');
        setTimeout(() => element.classList.remove('flash'), 600);
    }

    function placeCursorAtEnd(element) {
        const selection = window.getSelection();
        const range = document.createRange();

        let lastTextNode = element;
        while (lastTextNode.lastChild) {
            lastTextNode = lastTextNode.lastChild;
        }

        if (lastTextNode.nodeType === Node.TEXT_NODE) {
            range.setStart(lastTextNode, lastTextNode.length);
        } else {
            range.selectNodeContents(element);
            range.collapse(false);
        }

        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        state.dom.editor?.focus();
    }

    // Скидаємо навігацію при оновленні валідації
    state.registerHook('onValidate', () => navigationState.clear());
}
