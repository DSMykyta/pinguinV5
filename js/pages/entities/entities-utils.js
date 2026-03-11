// js/pages/entities/entities-utils.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    ENTITIES - SHARED UTILITIES                           ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  ЯДРО — Спiльнi утилiти для всiх плагiнiв                               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { escapeHtml } from '../../utils/utils-text.js';
import { initCustomSelects, reinitializeCustomSelect } from '../../components/forms/select.js';
import { showModal, closeModal } from '../../components/modal/modal-main.js';
import { initSectionNav } from '../../layout/layout-plugin-nav-sections.js';

/**
 * Iнiцiалiзувати scroll-snap навiгацiю для fullscreen модалок
 * @param {string} navId - ID навiгацiйного елемента
 */
export function initSectionNavigation(navId) {
    const nav = document.getElementById(navId);
    if (!nav) return;
    const modalContainer = nav.closest('.modal-container');
    const content = modalContainer?.querySelector('.modal-body > main');
    initSectionNav(nav, content);
}

/**
 * Побудувати дерево категорiй
 * @param {Array} categories - Масив категорiй
 * @param {string} parentId - ID батькiвської категорiї
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
 * Рендерити опцiї дерева категорiй для select
 * @param {Array} tree - Дерево категорiй
 * @param {number} level - Рiвень вкладеностi
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
 * @param {Function} onClose - Callback при закриттi
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
 * Побудувати HTML для модалки перегляду MP сутностi
 * Показує всi поля з JSON динамiчно
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
            <div class="block-line">
                <label class="block-line-label">${escapeHtml(key)}</label>
                <span class="block-line-text">${escapeHtml(String(value))}</span>
            </div>
        `).join('');

    return `
        <div class="modal-overlay open">
            <div class="modal-container">
                <div class="modal-header">
                    <h2 class="modal-title">${escapeHtml(title)}</h2>
                    <div class="group">
                        <span class="chip c-main">${escapeHtml(mpName)}</span>
                        <button class="btn-icon modal-close-btn" aria-label="Закрити">
                            <div class="state-layer">
                                <span class="material-symbols-outlined">close</span>
                            </div>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="block">
                        <div class="block-header">
                            <h3>#${escapeHtml(externalId || '')}</h3>
                            ${mappedToName
                                ? `<span class="chip c-green">${escapeHtml(mappedToName)}</span>`
                                : `<span class="chip">Не замаплено</span>`
                            }
                        </div>
                        <div class="block-list">
                            ${fieldsHtml}
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
 * Показати модалку маппiнгу до MP сутностi
 * Використовує стандартну систему модалiв (showModal/closeModal)
 * Шаблон: templates/modals/mapper-map-to-mp.html
 *
 * @param {Object} opts
 * @param {Array} opts.marketplaces - Список маркетплейсiв
 * @param {Function} opts.getMpEntities - Функцiя(marketplaceId) -> масив MP сутностей
 * @param {Function} opts.getEntityLabel - Функцiя(mpEntity) -> текст для вiдображення
 * @param {Function} opts.onMap - Callback(mpEntityId) при пiдтвердженнi маппiнгу
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

    mpSelect.innerHTML = '<option value="">— Оберiть маркетплейс —</option>';
    marketplaces.forEach(mp => {
        const opt = document.createElement('option');
        opt.value = mp.id;
        opt.textContent = mp.name || mp.id;
        mpSelect.appendChild(opt);
    });

    entitySelect.innerHTML = '<option value="">— Спочатку оберiть маркетплейс —</option>';
    entitySelect.disabled = true;
    confirmBtn.disabled = true;

    initCustomSelects(modalEl);

    // Обробники
    mpSelect.onchange = () => {
        const mpId = mpSelect.value;

        if (!mpId) {
            entitySelect.innerHTML = '<option value="">— Спочатку оберiть маркетплейс —</option>';
            entitySelect.disabled = true;
            confirmBtn.disabled = true;
            reinitializeCustomSelect(entitySelect);
            return;
        }

        const entities = getMpEntities(mpId);
        entitySelect.disabled = false;
        entitySelect.innerHTML = '<option value="">— Оберiть значення —</option>';
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

// ═══════════════════════════════════════════════════════════════════════════
// КАСКАДНI ПОПЕРЕДЖЕННЯ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Побудувати HTML-блок деталей каскадних наслiдкiв видалення
 * @param {Array<{icon: string, text: string}>} items - Масив рядкiв наслiдкiв
 * @returns {string} HTML або '' якщо масив порожнiй
 */
export function buildCascadeDetails(items) {
    if (!items || items.length === 0) return '';
    return items.map(item =>
        `<div class="cascade-item"><span class="material-symbols-outlined">${item.icon}</span><span>${item.text}</span></div>`
    ).join('');
}
