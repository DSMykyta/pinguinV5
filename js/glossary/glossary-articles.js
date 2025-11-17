// js/glossary/glossary-articles.js

import { getGlossaryDOM } from './glossary-events.js';
import { getGlossaryData } from './glossary-data.js';
import { loadTemplate, renderTemplate } from '../utils/template-loader.js';

let articleTemplate = null;

/**
 * Завантажує шаблон статті з partials
 */
async function loadArticleTemplate() {
    if (!articleTemplate) {
        articleTemplate = await loadTemplate('glossary-article');
    }
    return articleTemplate;
}

/**
 * Підготовка даних для шаблону
 */
function prepareTemplateData(item) {
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

    return {
        id: item.id,
        name: item.name,
        text: item.text || '<p><i>(Опис відсутній)</i></p>',
        hasTriggers: trigersArray.length > 0,
        triggersHtml: triggersHtml,
        hasKeywordsUa: keywordsUaArray.length > 0,
        keywordsUaHtml: keywordsUaHtml,
        hasKeywords: trigersArray.length > 0 || keywordsUaArray.length > 0
    };
}

/**
 * Створює HTML статті з шаблону
 */
async function createArticleHtml(item) {
    const template = await loadArticleTemplate();
    const data = prepareTemplateData(item);
    return renderTemplate(template, data);
}

/**
 * Renders all glossary articles into the main content area.
 */
export async function renderGlossaryArticles() {
    const dom = getGlossaryDOM();
    const data = getGlossaryData();

    if (!dom.contentContainer) return;

    if (data.length === 0) {
        dom.contentContainer.innerHTML = '<p>Немає статей для відображення.</p>';
        return;
    }

    // Generate HTML for all articles
    const articlesHtmlPromises = data.map(item => createArticleHtml(item));
    const articlesHtml = await Promise.all(articlesHtmlPromises);

    dom.contentContainer.innerHTML = articlesHtml.join('');
}

/**
 * Initializes the article display logic.
 * Adds smooth scroll navigation and highlighting.
 */
export async function initGlossaryArticles() {
    await renderGlossaryArticles();

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
