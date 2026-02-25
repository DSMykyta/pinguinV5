// js/common/ui-modal.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                  УПРАВЛІННЯ МОДАЛЬНИМИ ВІКНАМИ V2                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Проста система модалів з повноцінними HTML шаблонами.
 * Кожен модал - це окремий елемент в DOM з повною структурою.
 *
 * ЯК ЦЕ ПРАЦЮЄ:
 * 1. Кнопка-тригер має атрибут `data-modal-trigger="modal-id"`
 * 2. Скрипт завантажує повний HTML з `/templates/modals/modal-id.html`
 * 3. HTML вставляється в DOM як окремий елемент
 * 4. Модал показується (додається клас open)
 * 5. Підтримка стеку модалів - можна відкрити модал поверх модалу
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - showModal(modalId, triggerElement) - Відкрити модальне вікно
 * - closeModal(modalId) - Закрити модальне вікно (або верхній якщо без ID)
 * - closeAllModals() - Закрити всі модалі
 * - getOpenModals() - Отримати список відкритих модалів
 *
 * ЗАЛЕЖНОСТІ:
 * - ui-tabs.js (для ініціалізації вкладок)
 */

import { initTabs } from '../layout/layout-nav-tabs.js';
import { initDropdowns } from './ui-dropdown.js';
import { showToast } from './ui-toast.js';

// Кеш завантажених шаблонів
const modalTemplateCache = new Map();

// Стек відкритих модалів
const openModalsStack = [];

/**
 * Завантажує та відображає модальне вікно
 *
 * @param {string} modalId - Ідентифікатор модального вікна (назва файлу без розширення)
 * @param {HTMLElement} triggerElement - Елемент що викликав modal (опціонально)
 *
 * @example
 * showModal('auth-login-modal');
 * showModal('confirm-delete', triggerButton);
 */
export async function showModal(modalId, triggerElement = null) {
    try {
        // Перевірка чи модал вже відкритий
        let existingModal = document.getElementById(`modal-${modalId}`);

        if (existingModal) {
            // Модал вже в DOM, просто показуємо
            existingModal.classList.add('open');
            document.body.classList.add('modal-open');

            // Додаємо до стеку якщо його там немає
            if (!openModalsStack.includes(modalId)) {
                openModalsStack.push(modalId);
            }

            dispatchModalEvent('modal-opened', modalId, triggerElement, existingModal);
            return;
        }

        // Завантаження шаблону (з кешу або fetch)
        let templateHtml;
        if (modalTemplateCache.has(modalId)) {
            templateHtml = modalTemplateCache.get(modalId);
        } else {
            const response = await fetch(`/templates/modals/${modalId}.html`);
            if (!response.ok) throw new Error(`Не вдалося завантажити шаблон: ${modalId}`);
            templateHtml = await response.text();
            modalTemplateCache.set(modalId, templateHtml);
        }

        // Вставка HTML в DOM
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = templateHtml.trim();
        const modalElement = tempDiv.firstElementChild; // firstElementChild пропускає коментарі

        // Додаємо унікальний ID
        modalElement.id = `modal-${modalId}`;
        modalElement.dataset.modalId = modalId;

        // Додаємо в body
        document.body.appendChild(modalElement);

        // Обробник кліку на overlay (закриття при кліку поза модалом)
        modalElement.addEventListener('click', (e) => {
            if (e.target === modalElement) {
                closeModal(modalId);
            }
        });

        // Показуємо модал
        document.body.classList.add('modal-open');

        // Невелика затримка для анімації (щоб CSS transition спрацював)
        requestAnimationFrame(() => {
            modalElement.classList.add('open');
        });

        // Додаємо в стек
        openModalsStack.push(modalId);

        // Ініціалізація табів (якщо є)
        const modalBody = modalElement.querySelector('.modal-body');
        if (modalBody) {
            initTabs(modalBody);
        }

        // Ініціалізація дропдаунів (якщо є)
        initDropdowns();

        // Диспатч події відкриття
        dispatchModalEvent('modal-opened', modalId, triggerElement, modalElement);

    } catch (error) {
        console.error('Помилка при відображенні модального вікна:', error);
        // Показуємо повідомлення користувачу
        showToast(`Помилка: не вдалося відкрити модальне вікно "${modalId}"`, 'error');
    }
}

/**
 * Закриває модальне вікно
 *
 * @param {string} modalId - ID модалу для закриття. Якщо не вказано - закриває верхній
 *
 * @example
 * closeModal(); // Закриває верхній модал
 * closeModal('auth-login-modal'); // Закриває конкретний модал
 */
export function closeModal(modalId = null) {
    // Якщо ID не вказано - беремо верхній зі стеку
    if (!modalId && openModalsStack.length > 0) {
        modalId = openModalsStack[openModalsStack.length - 1];
    }

    if (!modalId) return;

    const modalElement = document.getElementById(`modal-${modalId}`);
    if (!modalElement) return;

    // Ховаємо модал
    modalElement.classList.remove('open');

    // Видаляємо зі стеку
    const index = openModalsStack.indexOf(modalId);
    if (index > -1) {
        openModalsStack.splice(index, 1);
    }

    // Якщо це останній модал - прибираємо блокування body
    if (openModalsStack.length === 0) {
        document.body.classList.remove('modal-open');
    }

    // Диспатч події закриття
    dispatchModalEvent('modal-closed', modalId, null, modalElement);

    // Опціонально: видалити з DOM через затримку (для анімації)
    // Якщо не потрібно - закоментуйте цей блок
    setTimeout(() => {
        if (modalElement && !modalElement.classList.contains('open')) {
            modalElement.remove();
        }
    }, 300); // 300ms = час анімації
}

/**
 * Закриває всі відкриті модалі
 */
export function closeAllModals() {
    while (openModalsStack.length > 0) {
        closeModal();
    }
}

/**
 * Повертає список відкритих модалів
 * @returns {Array<string>} Масив ID відкритих модалів
 */
export function getOpenModals() {
    return [...openModalsStack];
}

/**
 * Диспатчить custom event для модалу
 * @private
 */
function dispatchModalEvent(eventName, modalId, triggerElement, modalElement) {
    const event = new CustomEvent(eventName, {
        detail: {
            modalId: modalId,
            trigger: triggerElement,
            modalElement: modalElement,
            bodyTarget: modalElement?.querySelector('.modal-body') // Для зворотної сумісності
        }
    });
    document.dispatchEvent(event);
}

/**
 * Очищає кеш шаблонів
 * Корисно під час розробки
 */
export function clearModalCache() {
    modalTemplateCache.clear();
}

// Експорт для backward compatibility
export function getModalWrapper() {
    console.warn('getModalWrapper() deprecated - модалі тепер окремі елементи');
    return null;
}

export function createModalStructure() {
    console.warn('createModalStructure() deprecated - структура в шаблонах');
}
