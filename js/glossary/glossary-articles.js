// js/glossary/glossary-articles.js

import { getGlossaryDOM } from './glossary-events.js';
import { getGlossaryData } from './glossary-data.js';

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
        : '';

    const keywordsUaHtml = keywordsUaArray.length > 0
        ? keywordsUaArray.map(kw => `<span class="word-chip">${kw}</span>`).join(' ')
        : '';

    const hasKeywords = trigersArray.length > 0 || keywordsUaArray.length > 0;

    // Важливо: використовуємо ID для навігації (href="#id")
    return `
        <article id="${item.id}" class="glossary-article">
            <div class="article-header">
                <div class="article-title-row">
                    <h2>${item.name}</h2>
                    <span class="article-id">ID: ${item.id}</span>
                </div>
            </div>

            <div class="article-content">
                <div class="article-text">
                    ${item.text || '<p><i>(Опис відсутній)</i></p>'}
                </div>
            </div>

            ${hasKeywords ? `
            <div class="keywords-content">
                ${trigersArray.length > 0 ? `
                <div class="keywords-section">
                    <strong>Тригери:</strong>
                    <div class="cell-words-list">
                        ${triggersHtml}
                    </div>
                </div>
                ` : ''}

                ${keywordsUaArray.length > 0 ? `
                <div class="keywords-section">
                    <strong>Ключові слова:</strong>
                    <div class="cell-words-list">
                        ${keywordsUaHtml}
                    </div>
                </div>
                ` : ''}
            </div>
            ` : ''}
        </article>
    `;
}

export function renderGlossaryArticles() {
    const dom = getGlossaryDOM();
    const data = getGlossaryData();

    if (!dom.contentContainer) return;

    if (data.length === 0) {
        dom.contentContainer.innerHTML = `
            <div class="loading-state">
                <span class="material-symbols-outlined">info</span>
                <p>Немає статей для відображення.</p>
            </div>
        `;
        return;
    }

    const articlesHtml = data.map(item => createArticleHtml(item));
    dom.contentContainer.innerHTML = articlesHtml.join('');

    // Оновлюємо лічильник
    const statsElement = document.getElementById('tab-stats-glossary');
    if (statsElement) {
        statsElement.textContent = `Показано ${data.length} з ${data.length}`;
    }
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