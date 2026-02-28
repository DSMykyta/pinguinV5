// js/pages/glossary/glossary-tree.js
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                        GLOSSARY TREE                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔌 ПЛАГІН — Побудова та рендеринг ієрархічного дерева глосарію         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getGlossaryDOM } from './glossary-events.js';
import { getGlossaryTree } from './glossary-data.js';

/**
 * Рекурсивна функція для побудови HTML-списку дерева.
 * @param {string} parentId - ID батьківського елемента (починаємо з 'root').
 * @param {number} level - Поточний рівень вкладеності (для відступів).
 * @returns {string} - HTML-код для гілки дерева.
 */
function buildTreeHtml(parentId, level = 0) {
    const tree = getGlossaryTree();
    const children = tree[parentId] || [];
    if (children.length === 0) return '';

    let html = `<ul class="tree-level-${level}">`;

    children.forEach(item => {
        const hasChildren = item.children && item.children.length > 0;
        const isInitiallyOpen = level < 1; // Розгортаємо перші рівні за замовчуванням

        html += `
            <li data-id="${item.id}" class="${hasChildren ? 'has-children' : ''} ${isInitiallyOpen ? 'open' : ''}">
                <div class="tree-item-content">
                    ${hasChildren ? '<button class="btn-icon ghost toggle-btn"><span class="material-symbols-outlined">arrow_drop_down</span></button>' : '<span class="leaf-placeholder"></span>'}
                    <a href="#${item.id}" class="tree-item-link">${item.name}</a>
                </div>
                ${hasChildren ? buildTreeHtml(item.id, level + 1) : ''}
            </li>
        `;
    });

    html += `</ul>`;
    return html;
}

/**
 * Генерує та вставляє HTML-дерево в асайд.
 */
export function renderGlossaryTree() {
    const dom = getGlossaryDOM();
    if (!dom.treeContainer) return;

    // Починаємо будувати дерево з кореневих елементів ('root')
    const treeHtml = buildTreeHtml('root');
    dom.treeContainer.innerHTML = treeHtml || '<p>Структура порожня.</p>';
}

/**
 * Ініціалізує слухачі подій для кнопок згортання/розгортання.
 */
/** ЛЕГО-плагін: порожній init (main викликає функції напряму) */
export function init() { }

export function initTreeToggles() {
    const dom = getGlossaryDOM();
    if (!dom.treeContainer) return;

    dom.treeContainer.addEventListener('click', (event) => {
        const toggleButton = event.target.closest('.toggle-btn');
        if (toggleButton) {
            const parentLi = toggleButton.closest('li');
            if (parentLi) {
                parentLi.classList.toggle('open');
            }
        }
    });
}
