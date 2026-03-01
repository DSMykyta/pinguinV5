// js/pages/brands/brands-crud-links.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS CRUD — ПОСИЛАННЯ                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Секція посилань у модалі бренду.
 */

import { escapeHtml } from '../../utils/text-utils.js';
import { showToast } from '../../components/feedback/toast.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати обробники посилань
 */
export function initLinksHandlers() {
    const addBtn = document.getElementById('btn-add-link');
    if (addBtn) {
        addBtn.onclick = () => addLinkRow({ name: '', url: '' });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ADD / REMOVE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Додати рядок посилання
 * @param {Object} link - { name, url }
 */
function addLinkRow(link = { name: '', url: '' }) {
    const container = document.getElementById('brand-links-container');
    const emptyState = document.getElementById('brand-links-empty');
    if (!container) return;

    if (emptyState) emptyState.classList.add('u-hidden');

    const row = document.createElement('div');
    row.className = 'content-bloc';
    row.innerHTML = `
        <div class="content-line">
            <div class="input-box">
                <input type="text" value="${escapeHtml(link.name)}" placeholder="ua, de...">
            </div>
            <div class="separator-v"></div>
            <div class="input-box large">
                <input type="url" value="${escapeHtml(link.url)}" placeholder="https://...">
            </div>
        </div>
        <button type="button" class="btn-icon ci-action" data-tooltip="Відкрити">
            <span class="material-symbols-outlined">open_in_new</span>
        </button>
        <button type="button" class="btn-icon ci-remove" data-tooltip="Видалити">
            <span class="material-symbols-outlined">close</span>
        </button>
    `;

    row.querySelector('.ci-action').onclick = () => {
        const url = row.querySelector('input[type="url"]').value.trim();
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            showToast('Введіть URL', 'warning');
        }
    };

    row.querySelector('.ci-remove').onclick = () => {
        const container = document.getElementById('brand-links-container');
        const linkName = row.querySelector('input[type="text"]').value.trim() || 'посилання';
        const nextSibling = row.nextSibling;

        row.remove();
        updateLinksEmptyState();

        showToast(`Посилання ${linkName} видалено`, 'info', {
            duration: 5000,
            action: {
                label: 'Відмінити',
                onClick: () => {
                    if (container) {
                        container.insertBefore(row, nextSibling);
                        updateLinksEmptyState();
                    }
                },
            },
        });
    };

    container.appendChild(row);
}

// ═══════════════════════════════════════════════════════════════════════════
// GET / SET
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати всі посилання
 * @returns {Array<{name: string, url: string}>}
 */
export function getLinks() {
    const container = document.getElementById('brand-links-container');
    if (!container) return [];

    const rows = container.querySelectorAll('.content-bloc');
    return Array.from(rows)
        .map(row => ({
            name: row.querySelector('input[type="text"]')?.value.trim() || '',
            url: row.querySelector('input[type="url"]')?.value.trim() || ''
        }))
        .filter(link => link.url);
}

/**
 * Встановити посилання
 * @param {Array<{name: string, url: string}>} links
 */
export function setLinks(links) {
    const container = document.getElementById('brand-links-container');
    if (!container) return;

    container.innerHTML = '';

    if (Array.isArray(links)) {
        links.forEach(link => addLinkRow(link));
    }

    updateLinksEmptyState();
}

/**
 * Оновити стан empty state для посилань
 */
export function updateLinksEmptyState() {
    const container = document.getElementById('brand-links-container');
    const emptyState = document.getElementById('brand-links-empty');
    if (!container || !emptyState) return;

    const hasLinks = container.querySelectorAll('.content-bloc').length > 0;
    if (!hasLinks && !emptyState.innerHTML.trim()) {
        emptyState.innerHTML = renderAvatarState('empty', {
            message: 'Посилання відсутні',
            size: 'medium',
            containerClass: 'empty-state',
            avatarClass: 'empty-state-avatar',
            messageClass: 'avatar-state-message',
            showMessage: true
        });
    }
    emptyState.classList.toggle('u-hidden', hasLinks);
}
