// js/glossary/glossary-articles.js

import { getGlossaryDOM } from './glossary-events.js';
import { getGlossaryData } from './glossary-data.js';

/**
 * Створює HTML статті, використовуючи СТАНДАРТНІ класи розмітки (як в index.html).
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

    // Використовуємо стандартний тег <section> та класи .section-header / .section-content
    return `
        <section id="${item.id}" data-panel-template="aside-glossary">
            <div class="section-header">
                <div class="section-name-block">
                    <div class="section-name">
                        <h2>${item.name}</h2>
                    </div>
                    <h3>${item.id}</h3>
                </div>
                <button id="reload-section-text" class="btn-icon btn-reload text-disabled" aria-label="Перезавантажити">
                    <span class="material-symbols-outlined">refresh</span>
                </button>
            </div>

            <div class="section-content">
                <div class="article-text">
                    ${item.text || '<p><i>(Опис відсутній)</i></p>'}
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
            </div>
        </section>
    `;
}

export function renderGlossaryArticles() {
    const dom = getGlossaryDOM();
    const data = getGlossaryData();

    if (!dom.contentContainer) return;

    if (data.length === 0) {
        dom.contentContainer.innerHTML = '<p style="padding: 24px;">Немає статей для відображення.</p>';
        return;
    }

    const articlesHtml = data.map(item => createArticleHtml(item));
    dom.contentContainer.innerHTML = articlesHtml.join('');
}

export function initGlossaryArticles() {
    renderGlossaryArticles();

    const treeDom = getGlossaryDOM().treeContainer;
    if (treeDom) {
        treeDom.addEventListener('click', (event) => {
            const link = event.target.closest('.tree-item-link');
            if (link && link.hash) {
                event.preventDefault();
                const targetId = link.hash.substring(1);
                const targetArticle = document.getElementById(targetId);

                if (targetArticle) {
                    targetArticle.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    }
}