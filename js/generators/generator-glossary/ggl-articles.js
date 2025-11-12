// js/generators/generator-glossary/ggl-articles.js
import { getGlossaryDOM } from './ggl-dom.js';
import { getGlossaryData } from './ggl-data.js'; // Get the flat list of all items

/**
 * Generates the HTML for a single glossary article.
 * @param {object} item - The glossary item data.
 * @returns {string} - HTML string for the article.
 */
function createArticleHtml(item) {
    // You can add more fields here if needed (name_ru, name_en, keywords etc.)
    // const name_ru = item.name_ru || '';
    // const keywords_ru = item.keywords_ru ? item.keywords_ru.join(', ') : '';

    return `
        <div class="glossary-article" id="${item.id}">
            <div class="article-header">
                <h2>${item.name}</h2>
                </div>
            <div class="article-content">
                ${item.text || '<p><i>(Опис відсутній)</i></p>'}
            </div>
            </div>
    `;
}

/**
 * Renders all glossary articles into the main content area.
 */
export function renderGlossaryArticles() {
    const dom = getGlossaryDOM();
    const data = getGlossaryData(); // Get the flat array

    if (!dom.contentContainer) return;

    if (data.length === 0) {
        dom.contentContainer.innerHTML = '<p>Немає статей для відображення.</p>';
        return;
    }

    // Generate HTML for all articles
    let allArticlesHtml = data.map(item => createArticleHtml(item)).join('');

    dom.contentContainer.innerHTML = allArticlesHtml;
}

/**
 * Initializes the article display logic.
 * (Currently just renders, but could add click handlers later).
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