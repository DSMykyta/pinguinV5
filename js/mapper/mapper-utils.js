// js/mapper/mapper-utils.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - SHARED UTILITIES                             ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Спільні утиліти для всіх плагінів                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { escapeHtml } from '../utils/text-utils.js';

/**
 * Ініціалізувати scroll-snap навігацію для fullscreen модалок
 * @param {string} navId - ID навігаційного елемента
 */
export function initSectionNavigation(navId) {
    const nav = document.getElementById(navId);
    const content = document.querySelector('.modal-fullscreen-content');
    if (!nav || !content) return;

    const navItems = nav.querySelectorAll('.sidebar-nav-item');

    // Клік по меню - прокрутка до секції
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('href')?.slice(1);
            if (!targetId) return;
            const section = document.getElementById(targetId);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // При скролі - оновлювати active в меню
    const sections = content.querySelectorAll('section[id]');
    if (sections.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                navItems.forEach(item => {
                    const href = item.getAttribute('href');
                    item.classList.toggle('active', href === `#${sectionId}`);
                });
            }
        });
    }, { threshold: 0.5, root: content });

    sections.forEach(section => {
        observer.observe(section);
    });
}

/**
 * Побудувати дерево категорій
 * @param {Array} categories - Масив категорій
 * @param {string} parentId - ID батьківської категорії
 */
export function buildCategoryTree(categories, parentId = '') {
    return categories
        .filter(c => (c.parent_id || '') === parentId)
        .map(cat => ({
            ...cat,
            children: buildCategoryTree(categories, cat.id)
        }));
}

/**
 * Рендерити опції дерева категорій для select
 * @param {Array} tree - Дерево категорій
 * @param {number} level - Рівень вкладеності
 */
export function renderTreeOptions(tree, level = 0) {
    let html = '';
    tree.forEach(cat => {
        const indent = '—'.repeat(level);
        const prefix = level > 0 ? `${indent} ` : '';
        html += `<option value="${escapeHtml(cat.id)}">${prefix}${escapeHtml(cat.name_ua || cat.id)}</option>`;
        if (cat.children && cat.children.length > 0) {
            html += renderTreeOptions(cat.children, level + 1);
        }
    });
    return html;
}

/**
 * Створити простий модальний оверлей
 * @param {string} html - HTML контент модалки
 * @returns {HTMLElement} - Елемент модального оверлею
 */
export function createModalOverlay(html) {
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = html;
    const modalOverlay = tempContainer.firstElementChild;
    document.body.appendChild(modalOverlay);
    return modalOverlay;
}

/**
 * Закрити модальний оверлей
 * @param {HTMLElement} modalOverlay - Елемент оверлею
 */
export function closeModalOverlay(modalOverlay) {
    if (modalOverlay && modalOverlay.parentNode) {
        modalOverlay.remove();
    }
}

/**
 * Налаштувати обробники закриття модалки
 * @param {HTMLElement} modalOverlay - Елемент оверлею
 * @param {Function} onClose - Callback при закритті
 */
export function setupModalCloseHandlers(modalOverlay, onClose) {
    modalOverlay.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', onClose);
    });
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) onClose();
    });
}
