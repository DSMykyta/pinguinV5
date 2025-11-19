// js/glossary/glossary-search.js

import { getUserData } from '../auth/custom-auth.js';

// Рандомні повідомлення для стану "нічого не знайдено"
const NO_RESULTS_MESSAGES = [
    "Ти взагалі про що?",
    "Вперше про таке чую",
    "Я не певен що таке існує",
    "Я такого тобі не покажу",
    "Я нічого не зрозумів"
];

/**
 * Ініціалізує пошук по секціях глосарію
 */
export function initGlossarySearch() {
    const searchInput = document.getElementById('glossary-search-input');
    if (!searchInput) {
        console.warn('[Glossary Search] Поле пошуку не знайдено');
        return;
    }

    console.log('🔍 [Glossary Search] Ініціалізація пошуку');

    // Слухаємо зміни в полі пошуку
    searchInput.addEventListener('input', handleSearch);

    // Початкова перевірка (якщо поле вже заповнене)
    if (searchInput.value.trim()) {
        handleSearch({ target: searchInput });
    }
}

/**
 * Обробник пошуку
 */
function handleSearch(event) {
    const query = event.target.value.trim().toLowerCase();
    const contentMain = document.getElementById('content-main');

    if (!contentMain) return;

    const sections = contentMain.querySelectorAll('section[data-panel-template="aside-glossary"]');

    if (query === '') {
        // Показуємо всі секції
        sections.forEach(section => {
            section.style.display = '';
        });
        removeNoResultsState();
        return;
    }

    // Фільтруємо секції
    let visibleCount = 0;

    sections.forEach(section => {
        const titleElement = section.querySelector('.section-name h2');
        if (!titleElement) return;

        const title = titleElement.textContent.toLowerCase();

        if (title.includes(query)) {
            section.style.display = '';
            visibleCount++;
        } else {
            section.style.display = 'none';
        }
    });

    // Показуємо "нічого не знайдено" якщо немає результатів
    if (visibleCount === 0) {
        showNoResultsState(contentMain, query);
    } else {
        removeNoResultsState();
    }

    console.log(`🔍 [Search] Запит: "${query}", Знайдено: ${visibleCount}`);
}

/**
 * Показує стан "нічого не знайдено"
 */
function showNoResultsState(container, query) {
    // Перевіряємо чи вже є no-results state
    if (document.getElementById('glossary-no-results')) return;

    const userData = getUserData();
    const avatarAnimal = userData?.avatar || 'penguin';
    const avatarPath = `resources/avatars/1056/${avatarAnimal}-confused.png`;

    // Вибираємо рандомне повідомлення
    const randomMessage = NO_RESULTS_MESSAGES[Math.floor(Math.random() * NO_RESULTS_MESSAGES.length)];

    const noResultsHtml = `
        <div id="glossary-no-results" class="no-results-state">
            <img src="${avatarPath}"
                 alt="Confused ${avatarAnimal}"
                 class="no-results-avatar"
                 onerror="this.src='resources/avatars/1056/penguin-confused.png'">
            <h3 class="no-results-title">${randomMessage}</h3>
            <p class="no-results-text">Не знайдено жодного терміну за запитом "<strong>${escapeHtml(query)}</strong>"</p>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', noResultsHtml);
}

/**
 * Видаляє стан "нічого не знайдено"
 */
function removeNoResultsState() {
    const noResultsElement = document.getElementById('glossary-no-results');
    if (noResultsElement) {
        noResultsElement.remove();
    }
}

/**
 * Екранує HTML для безпеки
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
