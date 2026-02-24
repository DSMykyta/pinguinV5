// js/common/charms/charm-refresh.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    REFRESH CHARM                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Декларативне авто-створення refresh кнопки на основі HTML атрибутів.    ║
 * ║  Працює на будь-якому елементі: section, .pseudo-table-container, div.   ║
 * ║                                                                          ║
 * ║  USAGE:                                                                  ║
 * ║  <section refresh>                    — кнопка + charm:refresh           ║
 * ║  <section refresh confirm>            — підтвердження перед refresh      ║
 * ║  <section refresh confirm="Текст..."> — кастомне повідомлення           ║
 * ║  <section refresh aside>              — також refresh aside panel       ║
 * ║  <div class="pseudo-table-container" refresh>  — для таблиць            ║
 * ║                                                                          ║
 * ║  EVENT:                                                                  ║
 * ║  charm:refresh — на елементі, detail.waitUntil(promise)                 ║
 * ║                                                                          ║
 * ║  UTILITY:                                                                ║
 * ║  withSpinner(btn, asyncFn) — spinner + disabled на час виконання         ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { showResetConfirm } from '../ui-modal-confirm.js';

// ═══════════════════════════════════════════════════════════════════════════
// CHARM DISCOVERY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Знайти всі [refresh] елементи в scope та ініціалізувати charm
 * @param {HTMLElement|Document} scope
 */
export function initRefreshCharm(scope = document) {
    scope.querySelectorAll('[refresh]').forEach(el => {
        if (el._refreshCharmInit) return;
        el._refreshCharmInit = true;
        setupRefresh(el);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════

function setupRefresh(el) {
    const group = findToolbarGroup(el);
    if (!group) return;

    const btn = document.createElement('button');
    btn.className = 'btn-icon';
    btn.setAttribute('aria-label', 'Оновити');
    btn.innerHTML = '<span class="material-symbols-outlined">refresh</span>';
    group.insertBefore(btn, group.firstChild);

    const needsConfirm = el.hasAttribute('confirm');
    const confirmMessage = el.getAttribute('confirm') || undefined;
    const hasAside = el.hasAttribute('aside');

    btn.addEventListener('click', () => handleRefreshClick(btn, el, needsConfirm, confirmMessage, hasAside));
}

async function handleRefreshClick(btn, el, needsConfirm, confirmMessage, hasAside) {
    if (needsConfirm) {
        const confirmed = await showResetConfirm({
            message: confirmMessage
        });
        if (!confirmed) return;
    }

    await withSpinner(btn, async () => {
        const promises = [];

        el.dispatchEvent(new CustomEvent('charm:refresh', {
            bubbles: true,
            detail: { waitUntil: (p) => promises.push(p) }
        }));

        if (hasAside) {
            const templateName = el.dataset?.panelTemplate;
            const aside = templateName && document.getElementById(templateName);
            if (aside) {
                aside.dispatchEvent(new CustomEvent('charm:refresh', {
                    bubbles: true,
                    detail: { waitUntil: (p) => promises.push(p) }
                }));
            }
        }

        await Promise.all(promises);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOLBAR GROUP — уніфікований пошук
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Знайти .group в .section-header для елемента.
 * Case A: <section> — header є direct child (шукаємо ВНИЗ)
 * Case B: container — header є вище по DOM (шукаємо ВГОРУ)
 */
export function findToolbarGroup(el) {
    // Case A: section — шукати ВНИЗ
    const headerDown = el.querySelector(':scope > .section-header');
    if (headerDown) return ensureGroup(headerDown);

    // Case B: container — шукати ВГОРУ
    const parent = el.closest('.tab-content') || el.parentElement;
    const headerUp = parent?.querySelector('.section-header');
    if (headerUp) return ensureGroup(headerUp);

    return null;
}

function ensureGroup(header) {
    let group = header.querySelector(':scope > .group');
    if (!group) {
        group = document.createElement('div');
        group.className = 'group';
        header.appendChild(group);
    }
    return group;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY: SPINNER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @param {HTMLElement} btn — кнопка з .material-symbols-outlined іконкою
 * @param {Function} asyncFn — async callback
 * @returns {Promise<*>} результат asyncFn
 */
export async function withSpinner(btn, asyncFn) {
    if (btn.disabled) return;
    const icon = btn.querySelector('.material-symbols-outlined');
    btn.disabled = true;
    icon?.classList.add('spinning');
    try {
        return await asyncFn();
    } finally {
        icon?.classList.remove('spinning');
        btn.disabled = false;
    }
}
