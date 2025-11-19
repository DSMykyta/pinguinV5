// js/glossary/glossary-articles.js

import { getGlossaryDOM } from './glossary-events.js';
import { getGlossaryData } from './glossary-data.js';
import { renderAvatarState } from '../utils/avatar-states.js';

/**
 * Створює HTML для empty state з аватаром користувача
 */
function createEmptyStateHtml(itemId) {
    // Використовуємо глобальну систему аватарів
    const avatarHtml = renderAvatarState('empty', {
        size: 'medium',
        containerClass: 'empty-state-container',
        avatarClass: 'empty-state-avatar',
        messageClass: 'empty-state-text',
        showMessage: true
    });

    // Додаємо кнопку після аватара
    return avatarHtml.replace(
        '</div>',
        `<button class="btn-primary btn-add-glossary-text" data-item-id="${itemId}">
            <span class="material-symbols-outlined">add</span>
            <span>Додати</span>
        </button>
        </div>`
    );
}

/**
 * Створює HTML статті.
 * Використовує простішу структуру без data-panel-template
 */
function createArticleHtml(item) {
    const trigersArray = item.trigers
        ? item.trigers.split(',').map(t => t.trim()).filter(Boolean)
        : [];

    const keywordsUaArray = item.keywords_ua
        ? item.keywords_ua.split(',').map(k => k.trim()).filter(Boolean)
        : [];

    const triggersHtml = trigersArray.length > 0
        ? trigersArray.map(tr => `<span class="word-chip primary">${tr}</span>`).join(' ')
        : '<span class="text-muted">Немає тригерів</span>';

    const keywordsUaHtml = keywordsUaArray.length > 0
        ? keywordsUaArray.map(kw => `<span class="word-chip">${kw}</span>`).join(' ')
        : '<span class="text-muted">Немає ключових слів</span>';

    // Badge for param_type
    const paramTypeHtml = item.param_type
        ? `<span class="badge badge-param-type">${item.param_type}</span>`
        : '';

    return `
        <section id="${item.id}" data-panel-template="aside-glossary">
            <div class="section-header">
                <div class="section-name-block">
                    <div class="section-name">
                        <h2>${item.name}</h2>
                    </div>
                    <h3>${item.id}</h3>
                </div>
                ${paramTypeHtml}
            </div>

            <div class="section-content">
                <div class="article-text">
                    ${(() => {
                        console.log(`[ГЛОСАРІЙ] item.id=${item.id}, item.text="${item.text}", довжина=${item.text?.length || 0}`);
                        return item.text ? item.text : createEmptyStateHtml(item.id);
                    })()}
                </div>

                <div class="glossary-article-footer">
                    <div class="footer-column">
                        <strong>Тригери:</strong>
                        <div class="cell-words-list">
                            ${triggersHtml}
                        </div>
                    </div>
                    <div class="footer-column">
                        <strong>Keywords UA:</strong>
                        <div class="cell-words-list">
                            ${keywordsUaHtml}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

export function renderGlossaryArticles() {
    const dom = getGlossaryDOM();
    const data = getGlossaryData();

    if (!dom.contentContainer) return;

    if (data.length === 0) {
        dom.contentContainer.innerHTML = renderAvatarState('empty', {
            message: 'Немає статей для відображення',
            size: 'medium',
            containerClass: 'empty-state-container',
            avatarClass: 'empty-state-avatar',
            messageClass: 'avatar-state-message',
            showMessage: true
        });
        return;
    }

    const articlesHtml = data.map(item => createArticleHtml(item));
    dom.contentContainer.innerHTML = articlesHtml.join('');
}

export function initGlossaryArticles() {
    renderGlossaryArticles();

    // Навігація з лівої панелі (tree) до секції
    const treeDom = getGlossaryDOM().treeContainer;

    if (treeDom) {
        treeDom.addEventListener('click', (event) => {
            const link = event.target.closest('.tree-item-link');
            if (link && link.hash) {
                event.preventDefault();
                const targetId = link.hash.substring(1);
                const targetArticle = document.getElementById(targetId);

                if (targetArticle) {
                    // Використовуємо native scrollIntoView with offset
                    // Оскільки у нас фіксований хедер, потрібно трохи зміщення
                    targetArticle.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    }
}