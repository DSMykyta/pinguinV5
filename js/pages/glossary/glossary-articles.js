// js/pages/glossary/glossary-articles.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      GLOSSARY ARTICLES                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Рендеринг статей глосарію та обробка дій                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getGlossaryDOM } from './glossary-events.js';
import { getGlossaryData } from './glossary-data.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';
import {
    registerActionHandlers,
    initActionHandlers,
    actionButton
} from '../../components/actions/actions-main.js';

// ═══════════════════════════════════════════════════════════════════════════
// РЕЄСТРАЦІЯ ОБРОБНИКІВ ДІЙ
// ═══════════════════════════════════════════════════════════════════════════

registerActionHandlers('glossary', {
    edit: async (rowId) => {
        const { loadKeywords } = await import('../keywords/keywords-data.js');
        await loadKeywords();
        const { showEditKeywordModal } = await import('../keywords/keywords-crud.js');
        await showEditKeywordModal(rowId);
    },
    add: async (rowId) => {
        const { loadKeywords } = await import('../keywords/keywords-data.js');
        await loadKeywords();
        const { showEditKeywordModal } = await import('../keywords/keywords-crud.js');
        await showEditKeywordModal(rowId);
    }
});

/**
 * Створює HTML для empty state з аватаром користувача
 */
function createEmptyStateHtml(itemId) {
    // Використовуємо глобальну систему аватарів
    const avatarHtml = renderAvatarState('empty', {
        size: 'medium',
        containerClass: 'empty-state',
        avatarClass: 'empty-state-avatar',
        messageClass: 'empty-state-text',
        showMessage: true
    });

    // Додаємо кнопку після аватара
    return avatarHtml.replace(
        '</div>',
        `${actionButton({ action: 'add', rowId: itemId, context: 'glossary', label: 'Додати', extraClass: 'btn-primary' })}
        </div>`
    );
}

/**
 * Створює HTML статті.
 * Використовує простішу структуру без data-aside-template
 */
function createArticleHtml(item) {
    const trigersArray = item.trigers
        ? item.trigers.split(',').map(t => t.trim()).filter(Boolean)
        : [];

    const keywordsUaArray = item.keywords_ua
        ? item.keywords_ua.split(',').map(k => k.trim()).filter(Boolean)
        : [];

    const triggersHtml = trigersArray.length > 0
        ? trigersArray.map(tr => `<span class="tag c-main">${tr}</span>`).join(' ')
        : '<span class="text-muted">Немає тригерів</span>';

    const keywordsUaHtml = keywordsUaArray.length > 0
        ? keywordsUaArray.map(kw => `<span class="tag">${kw}</span>`).join(' ')
        : '<span class="text-muted">Немає ключових слів</span>';

    // Badge for param_type
    const paramTypeHtml = item.param_type
        ? `<span class="badge">${item.param_type}</span>`
        : '';

    return `
        <section id="${item.id}" data-aside-template="aside-glossary">
            <div class="section-header">
                <div class="section-name-block">
                    <div class="section-name">
                        <h2 class="display-l section-upper">${item.name}</h2>
                        ${actionButton({ action: 'edit', rowId: item.id, context: 'glossary' })}
                    </div>
                    <h3>${item.id}</h3>
                </div>
                ${paramTypeHtml ? `<div class="section-header-actions">${paramTypeHtml}</div>` : ''}
            </div>

            <div class="section-content">
                <div editor data-editor-id="glossary-${item.id}">
                    ${item.text ? item.text : createEmptyStateHtml(item.id)}
                </div>

                <div class="glossary-article-footer">
                    <div class="footer-column">
                        <strong>Тригери:</strong>
                        <div class="group">
                            ${triggersHtml}
                        </div>
                    </div>
                    <div class="footer-column">
                        <strong>Keywords UA:</strong>
                        <div class="group">
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
            containerClass: 'empty-state',
            avatarClass: 'empty-state-avatar',
            messageClass: 'avatar-state-message',
            showMessage: true
        });
        return;
    }

    const articlesHtml = data.map(item => createArticleHtml(item));
    dom.contentContainer.innerHTML = articlesHtml.join('');

    // Ініціалізувати обробники дій
    initActionHandlers(dom.contentContainer, 'glossary');
}

/** ЛЕГО-плагін: порожній init (main викликає функції напряму) */
export function init() { }

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