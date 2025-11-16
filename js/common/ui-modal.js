// js/common/ui-modal.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                  БАЗОВЕ УПРАВЛІННЯ МОДАЛЬНИМИ ВІКНАМИ                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Базові функції для керування модальними вікнами: відкриття, закриття,
 * завантаження шаблонів.
 *
 * ЯК ЦЕ ПРАЦЮЄ:
 * 1. Кнопка-тригер повинна мати атрибут `data-modal-trigger="modal-id"`.
 * 2. Скрипт завантажує HTML-контент з `/templates/modals/modal-id.html`.
 * 3. З шаблону витягуються три частини: заголовок, кнопки для шапки та тіло.
 * 4. Скрипт будує оболонку модального вікна та вставляє в неї отриманий контент.
 * 5. Після побудови автоматично ініціалізується логіка вкладок (табів).
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - showModal(modalId, triggerElement) - Відкрити модальне вікно
 * - closeModal() - Закрити модальне вікно
 * - getModalWrapper() - Отримати DOM елемент wrapper модалу
 * - createModalStructure() - Створити базову структуру модалу
 *
 * ЗАЛЕЖНОСТІ:
 * - ui-tabs.js (для ініціалізації вкладок)
 */

import { initTabs } from './ui-tabs.js';

// Спільні змінні для всіх модулів модальних вікон
let modalWrapper = null;
const modalTemplateCache = new Map();

/**
 * Створює базову структуру модального вікна
 * Викликається автоматично при першому показі модалу
 */
export function createModalStructure() {
    if (document.getElementById('global-modal-wrapper')) return;

    modalWrapper = document.createElement('div');
    modalWrapper.id = 'global-modal-wrapper';
    modalWrapper.className = 'modal-overlay';
    modalWrapper.innerHTML = `
        <div class="modal-container" role="dialog" aria-modal="true">
            <div class="modal-header">
                <h2 class="modal-title"></h2>
                <div id="modal-header-actions"></div>
            </div>
            <div class="modal-body"></div>
        </div>
    `;
    document.body.appendChild(modalWrapper);

    modalWrapper.addEventListener('click', (e) => {
        if (e.target === modalWrapper) {
            closeModal();
        }
    });
}

/**
 * Повертає DOM елемент wrapper модалу
 * Використовується іншими модулями для доступу до модалу
 * @returns {HTMLElement|null} Wrapper element або null
 */
export function getModalWrapper() {
    return modalWrapper;
}

/**
 * Завантажує та відображає модальне вікно
 *
 * @param {string} modalId - Ідентифікатор модального вікна (назва файлу без розширення)
 * @param {HTMLElement} triggerElement - Елемент що викликав modal (для отримання налаштувань)
 *
 * @example
 * showModal('confirm-delete', triggerButton);
 */
export async function showModal(modalId, triggerElement = null) {
    if (!modalWrapper) createModalStructure();

    try {
        let templateHtml;
        if (modalTemplateCache.has(modalId)) {
            templateHtml = modalTemplateCache.get(modalId);
        } else {
            const response = await fetch(`/templates/modals/${modalId}.html`);
            if (!response.ok) throw new Error(`Не вдалося завантажити шаблон: ${modalId}`);
            templateHtml = await response.text();
            modalTemplateCache.set(modalId, templateHtml);
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(templateHtml, 'text/html');

        const titleSource = doc.querySelector('.modal-title-source')?.textContent || 'Заголовок';
        const headerActionsSource = doc.querySelector('.modal-header-actions-source');
        const bodySource = doc.querySelector('.modal-body-source');

        const titleTarget = modalWrapper.querySelector('.modal-title');
        const headerActionsTarget = modalWrapper.querySelector('#modal-header-actions');
        const bodyTarget = modalWrapper.querySelector('.modal-body');

        titleTarget.textContent = titleSource;
        bodyTarget.innerHTML = bodySource?.innerHTML || '<p>Помилка: вміст не знайдено.</p>';

        // Apply modal size based on data-modal-size attribute
        const modalContainer = modalWrapper.querySelector('.modal-container');
        const modalSize = triggerElement?.dataset.modalSize || 'medium';

        // Remove existing size classes
        modalContainer.classList.remove('modal-small', 'modal-medium', 'modal-large');

        // Add new size class
        modalContainer.classList.add(`modal-${modalSize}`);

        // Handle header actions with connected-button-group-square
        const headerActionsContent = headerActionsSource?.innerHTML?.trim() || '';

        // Add class to the target container itself
        headerActionsTarget.className = 'connected-button-group-square';

        if (headerActionsContent) {
            // Insert buttons directly into target
            headerActionsTarget.innerHTML = headerActionsContent;

            // Add close button only if it doesn't exist
            if (!headerActionsTarget.querySelector('.modal-close-btn')) {
                const closeButton = document.createElement('button');
                closeButton.className = 'segment modal-close-btn';
                closeButton.setAttribute('aria-label', 'Закрити');
                closeButton.innerHTML = `<div class="state-layer"><span class="material-symbols-outlined">close</span></div>`;
                headerActionsTarget.appendChild(closeButton);
            }
        } else {
            // No content, just add close button
            const closeButton = document.createElement('button');
            closeButton.className = 'segment modal-close-btn';
            closeButton.setAttribute('aria-label', 'Закрити');
            closeButton.innerHTML = `<div class="state-layer"><span class="material-symbols-outlined">close</span></div>`;
            headerActionsTarget.innerHTML = '';
            headerActionsTarget.appendChild(closeButton);
        }

        document.body.classList.add('is-modal-open');
        modalWrapper.classList.add('is-open');

        initTabs(bodyTarget);

        // Диспатчимо custom event після відкриття модалу
        const modalOpenEvent = new CustomEvent('modal-opened', {
            detail: {
                modalId: modalId,
                trigger: triggerElement,
                bodyTarget: bodyTarget
            }
        });
        document.dispatchEvent(modalOpenEvent);

    } catch (error) {
        console.error('Помилка при відображенні модального вікна:', error);
    }
}

/**
 * Закриває модальне вікно
 * Видаляє класи відкритого стану, але не видаляє DOM елемент
 *
 * @example
 * closeModal();
 */
export function closeModal() {
    if (!modalWrapper) return;
    document.body.classList.remove('is-modal-open');
    modalWrapper.classList.remove('is-open');
}
