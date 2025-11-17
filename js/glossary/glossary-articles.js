// js/glossary/glossary-articles.js

import { getGlossaryDOM } from './glossary-events.js';
import { getGlossaryData } from './glossary-data.js';

/**
 * Створює HTML статті
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

    return `
        <div class="glossary-article" id="${item.id}">
            <div class="glos-block">
                <!-- Sidebar (25%) - Sticky -->
                <div class="glos-sidebar">
                    <div class="sidebar-sticky">
                        <h2 class="sidebar-title">${item.name}</h2>
                        <p class="sidebar-id">${item.id}</p>
                    </div>
                </div>

                <!-- Vertical line separator -->
                <div class="line-v"></div>

                <!-- Content (75%) -->
                <div class="glos-content">
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
            </div>
        </div>
    `;
}

/**
 * Renders all glossary articles into the main content area.
 */
export function renderGlossaryArticles() {
    const dom = getGlossaryDOM();
    const data = getGlossaryData();

    if (!dom.contentContainer) return;

    if (data.length === 0) {
        dom.contentContainer.innerHTML = '<p>Немає статей для відображення.</p>';
        return;
    }

    // Generate HTML for all articles
    const articlesHtml = data.map(item => createArticleHtml(item));

    dom.contentContainer.innerHTML = articlesHtml.join('');
}

/**
 * Initializes the article display logic.
 * Adds smooth scroll navigation and highlighting.
 */
export function initGlossaryArticles() {
    renderGlossaryArticles();

    // Add event listener to handle clicks on tree links and scroll to article
    const treeDom = getGlossaryDOM().treeContainer;
    const contentDom = getGlossaryDOM().contentContainer;

    if (treeDom && contentDom) {
        treeDom.addEventListener('click', (event) => {
            const link = event.target.closest('.tree-item-link');
            if (link && link.hash) {
                event.preventDefault(); // Prevent default jump
                const targetId = link.hash.substring(1); // Get ID from href="#some-id"
                const targetArticle = document.getElementById(targetId);

                if (targetArticle) {
                    targetArticle.scrollIntoView({ behavior: 'smooth', block: 'start' });

                    // Optional: Add highlighting to the article
                    // Remove highlight from others
                    contentDom.querySelectorAll('.glossary-article.is-highlighted')
                        .forEach(el => el.classList.remove('is-highlighted'));
                    // Add highlight to the target
                    targetArticle.classList.add('is-highlighted');
                    // Remove highlight after a delay
                    setTimeout(() => {
                        targetArticle.classList.remove('is-highlighted');
                    }, 1500); // Highlight for 1.5 seconds
                }
            }
        });
    }
}
