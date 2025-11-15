// js/common/ui-modal.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                  ГЛОБАЛЬНИЙ ОБРОБНИК МОДАЛЬНИХ ВІКОН                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * * ПРИЗНАЧЕННЯ:
 * Керує відкриттям, закриттям та динамічним наповненням модальних вікон.
 * Система працює глобально через один слухач подій на документі.
 * * * ЯК ЦЕ ПРАЦЮЄ:
 * 1. Кнопка-тригер повинна мати атрибут `data-modal-trigger="modal-id"`.
 * 2. Скрипт завантажує HTML-контент з `/templates/modals/modal-id.html`.
 * 3. З шаблону витягуються три частини: заголовок, кнопки для шапки та тіло.
 * 4. Скрипт будує оболонку модального вікна та вставляє в неї отриманий контент.
 * 5. Після побудови автоматично ініціалізується логіка вкладок (табів).
 */

// js/common/ui-modal.js

import { initTabs } from './ui-tabs.js';

let modalWrapper = null;
const modalTemplateCache = new Map();

function createModalStructure() {
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
 * Завантажує та відображає модальне вікно.
 * @param {string} modalId - Ідентифікатор модального вікна
 * @param {HTMLElement} triggerElement - Елемент що викликав modal
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

        // ДОДАНО: Диспатчимо custom event після відкриття модалу
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

export function closeModal() {
    if (!modalWrapper) return;
    document.body.classList.remove('is-modal-open');
    modalWrapper.classList.remove('is-open');
}

/**
 * Показати просте підтвердження з кнопками Так/Ні
 *
 * @param {Object} options - Опції підтвердження
 * @param {string} options.title - Заголовок вікна (за замовчуванням 'Підтвердження')
 * @param {string} options.message - Текст повідомлення
 * @param {string} options.confirmText - Текст кнопки підтвердження (за замовчуванням 'Так')
 * @param {string} options.cancelText - Текст кнопки скасування (за замовчуванням 'Ні')
 * @param {string} options.confirmClass - Клас для кнопки підтвердження (за замовчуванням 'btn-danger')
 *
 * @returns {Promise<boolean>} Promise що резолвиться в true якщо підтверджено, false якщо скасовано
 *
 * @example
 * const confirmed = await showConfirmModal({
 *   title: 'Видалити елемент?',
 *   message: 'Ця дія незворотна. Ви впевнені?',
 *   confirmText: 'Видалити',
 *   cancelText: 'Скасувати',
 *   confirmClass: 'btn-danger'
 * });
 *
 * if (confirmed) {
 *   // Виконати дію
 * }
 */
export function showConfirmModal(options = {}) {
    const {
        title = 'Підтвердження',
        message = 'Ви впевнені?',
        confirmText = 'Так',
        cancelText = 'Ні',
        confirmClass = 'btn-danger'
    } = options;

    return new Promise((resolve) => {
        // Створити структуру модалу якщо її немає
        if (!modalWrapper) createModalStructure();

        // Заповнити контент
        const titleTarget = modalWrapper.querySelector('.modal-title');
        const headerActionsTarget = modalWrapper.querySelector('#modal-header-actions');
        const bodyTarget = modalWrapper.querySelector('.modal-body');

        titleTarget.textContent = title;

        // Створити тіло модалу з повідомленням
        bodyTarget.innerHTML = `
            <div style="padding: 24px; text-align: center;">
                <p style="font-size: 16px; margin: 0 0 24px 0;">${message}</p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button class="btn btn-text" data-confirm-action="cancel">${cancelText}</button>
                    <button class="btn ${confirmClass}" data-confirm-action="confirm">${confirmText}</button>
                </div>
            </div>
        `;

        // Додати кнопку закриття в header
        headerActionsTarget.innerHTML = '';
        const group = document.createElement('div');
        group.className = 'connected-button-group-square';

        const closeButton = document.createElement('button');
        closeButton.className = 'segment modal-close-btn';
        closeButton.setAttribute('aria-label', 'Закрити');
        closeButton.innerHTML = `<div class="state-layer"><span class="material-symbols-outlined">close</span></div>`;
        group.appendChild(closeButton);

        headerActionsTarget.appendChild(group);

        // Показати модал
        document.body.classList.add('is-modal-open');
        modalWrapper.classList.add('is-open');

        // Обробник кліків на кнопки
        const handleClick = (e) => {
            const action = e.target.closest('[data-confirm-action]')?.dataset.confirmAction;

            if (action === 'confirm') {
                closeModal();
                cleanup();
                resolve(true);
            } else if (action === 'cancel') {
                closeModal();
                cleanup();
                resolve(false);
            }
        };

        // Обробник закриття (ESC або клік поза модалом)
        const handleClose = () => {
            cleanup();
            resolve(false);
        };

        // Cleanup функція
        const cleanup = () => {
            bodyTarget.removeEventListener('click', handleClick);
            modalWrapper.removeEventListener('click', handleModalWrapperClick);
            document.removeEventListener('modal-closed', handleClose);
        };

        // Обробник кліку на overlay
        const handleModalWrapperClick = (e) => {
            if (e.target === modalWrapper) {
                closeModal();
                handleClose();
            }
        };

        // Додати слухачі
        bodyTarget.addEventListener('click', handleClick);
        modalWrapper.addEventListener('click', handleModalWrapperClick);

        // Слухаємо подію закриття модалу (ESC або кнопка X)
        const modalCloseHandler = () => {
            if (!modalWrapper.classList.contains('is-open')) {
                handleClose();
                document.removeEventListener('modal-closed', modalCloseHandler);
            }
        };
        document.addEventListener('modal-closed', modalCloseHandler);
    });
}

export function initModals() {
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-modal-trigger]');
        if (trigger) {
            e.preventDefault();
            const modalId = trigger.dataset.modalTrigger;
            showModal(modalId, trigger); // Передаємо trigger
        }

        const closeTrigger = e.target.closest('[data-modal-close], .modal-close-btn');
        if (closeTrigger && closeTrigger.closest('.modal-container')) {
             e.preventDefault();
             closeModal();

             // Диспатчимо подію закриття
             document.dispatchEvent(new CustomEvent('modal-closed'));
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('is-modal-open')) {
            closeModal();

            // Диспатчимо подію закриття
            document.dispatchEvent(new CustomEvent('modal-closed'));
        }
    });
}
