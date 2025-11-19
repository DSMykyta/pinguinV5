// js/glossary/glossary-search.js

import { renderAvatarState, getRandomMessage } from '../utils/avatar-states.js';

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

    // Використовуємо глобальну систему аватарів
    const randomMessage = getRandomMessage('noResults');
    const avatarHtml = renderAvatarState('noResults', {
        message: randomMessage,
        size: 'large',
        containerClass: 'no-results-state-avatar',
        avatarClass: 'no-results-avatar',
        messageClass: 'no-results-title',
        showMessage: true
    });

    const noResultsHtml = `
        <div id="glossary-no-results" class="no-results-state">
            ${avatarHtml}
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
