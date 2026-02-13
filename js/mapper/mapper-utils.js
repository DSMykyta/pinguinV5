// js/mapper/mapper-utils.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - SHARED UTILITIES                             ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  🔒 ЯДРО — Спільні утиліти для всіх плагінів                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { escapeHtml } from '../utils/text-utils.js';
import { initCustomSelects, reinitializeCustomSelect } from '../common/ui-select.js';
import { showModal, closeModal } from '../common/ui-modal.js';

/**
 * Ініціалізувати scroll-snap навігацію для fullscreen модалок
 * @param {string} navId - ID навігаційного елемента
 */
export function initSectionNavigation(navId) {
    const nav = document.getElementById(navId);
    if (!nav) return;

    // Шукаємо content в межах того ж модалу
    const modalContainer = nav.closest('.modal-fullscreen-container');
    const content = modalContainer?.querySelector('.modal-fullscreen-content');
    if (!content) return;

    const navItems = nav.querySelectorAll('.sidebar-nav-item');

    // Клік по меню - прокрутка до секції
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('href')?.slice(1);
            if (!targetId) return;
            // Шукаємо секцію в межах поточного модалу
            const section = content.querySelector(`#${targetId}`);
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
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onClose();
        });
    });
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            e.stopPropagation();
            onClose();
        }
    });
}

/**
 * Побудувати HTML для модалки перегляду MP сутності
 * Показує всі поля з JSON динамічно
 */
export function buildMpViewModal({ title, mpName, externalId, jsonData, mappedToName }) {
    const skipFields = ['our_char_id', 'our_option_id', 'our_cat_id', 'our_category_id'];

    const fieldsHtml = Object.entries(jsonData)
        .filter(([key, value]) => {
            if (skipFields.includes(key)) return false;
            if (value === null || value === undefined || value === '') return false;
            return true;
        })
        .map(([key, value]) => `
            <div class="form-group">
                <label>${escapeHtml(key)}</label>
                <input type="text" class="input-main" value="${escapeHtml(String(value))}" readonly>
            </div>
        `).join('');

    return `
        <div class="modal-overlay is-open">
            <div class="modal-container modal-medium">
                <div class="modal-header">
                    <h2 class="modal-title">${escapeHtml(title)}</h2>
                    <div class="modal-header-actions">
                        <span class="chip chip-active">${escapeHtml(mpName)}</span>
                        <button class="segment modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="mp-item-card">
                        <div class="mp-item-header">
                            <span class="mp-item-id">#${escapeHtml(externalId || '')}</span>
                            ${mappedToName
                                ? `<span class="chip chip-success">${escapeHtml(mappedToName)}</span>`
                                : `<span class="chip">Не замаплено</span>`
                            }
                        </div>
                        <div class="mp-item-fields">
                            <div class="form-grid form-grid-2">
                                ${fieldsHtml}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary modal-close-btn">Закрити</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Показати модалку маппінгу до MP сутності
 * Використовує стандартну систему модалів (showModal/closeModal)
 * Шаблон: templates/modals/mapper-map-to-mp.html
 *
 * @param {Object} opts
 * @param {Array} opts.marketplaces - Список маркетплейсів
 * @param {Function} opts.getMpEntities - Функція(marketplaceId) → масив MP сутностей
 * @param {Function} opts.getEntityLabel - Функція(mpEntity) → текст для відображення
 * @param {Function} opts.onMap - Callback(mpEntityId) при підтвердженні маппінгу
 */
export async function showMapToMpModal({ marketplaces, getMpEntities, getEntityLabel, onMap }) {
    const MODAL_ID = 'mapper-map-to-mp';

    await showModal(MODAL_ID);

    const modalEl = document.getElementById(`modal-${MODAL_ID}`);
    if (!modalEl) return;

    // Заповнюємо маркетплейси
    const mpSelect = modalEl.querySelector('#map-modal-marketplace');
    const entitySelect = modalEl.querySelector('#map-modal-entity');
    const confirmBtn = modalEl.querySelector('#map-modal-confirm');

    mpSelect.innerHTML = '<option value="">— Оберіть маркетплейс —</option>';
    marketplaces.forEach(mp => {
        const opt = document.createElement('option');
        opt.value = mp.id;
        opt.textContent = mp.name || mp.id;
        mpSelect.appendChild(opt);
    });

    entitySelect.innerHTML = '<option value="">— Спочатку оберіть маркетплейс —</option>';
    entitySelect.disabled = true;
    confirmBtn.disabled = true;

    initCustomSelects(modalEl);

    // Обробники
    mpSelect.onchange = () => {
        const mpId = mpSelect.value;

        if (!mpId) {
            entitySelect.innerHTML = '<option value="">— Спочатку оберіть маркетплейс —</option>';
            entitySelect.disabled = true;
            confirmBtn.disabled = true;
            reinitializeCustomSelect(entitySelect);
            return;
        }

        const entities = getMpEntities(mpId);
        entitySelect.disabled = false;
        entitySelect.innerHTML = '<option value="">— Оберіть значення —</option>';
        entities.forEach(entity => {
            const opt = document.createElement('option');
            opt.value = entity.id;
            opt.textContent = getEntityLabel(entity);
            entitySelect.appendChild(opt);
        });

        reinitializeCustomSelect(entitySelect);
        confirmBtn.disabled = true;
    };

    entitySelect.onchange = () => {
        confirmBtn.disabled = !entitySelect.value;
    };

    confirmBtn.onclick = async () => {
        const mpEntityId = entitySelect.value;
        if (!mpEntityId) return;

        confirmBtn.disabled = true;
        confirmBtn.textContent = '...';

        try {
            await onMap(mpEntityId);
            closeModal(MODAL_ID);
        } catch (err) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Замапити';
        }
    };

    // data-modal-close кнопки
    modalEl.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = () => closeModal(MODAL_ID);
    });
}
