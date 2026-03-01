// js/components/modal/modal-core.js

/*
╔══════════════════════════════════════════════════════════════════════════╗
║  🔒 ЯДРО — МОДАЛІ DOM                                                   ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  DOM-логіка модальної системи:                                           ║
║  ├── showModal(modalId, trigger) — завантажити шаблон, вставити в DOM    ║
║  ├── closeModal(modalId) — закрити модал (або верхній зі стеку)         ║
║  ├── closeAllModals() — закрити всі                                     ║
║  ├── getOpenModals() — список відкритих                                  ║
║  └── initModalCore() — глобальна делегація click/ESC                    ║
║                                                                          ║
║  🎯 initModalCore() викликається один раз з modal-main.js               ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
*/

import {
    pushModal, popModal, peekModal, hasOpenModals,
    getOpenModals as getStack,
    getCachedTemplate, setCachedTemplate, clearTemplateCache,
    runHook,
} from './modal-state.js';

import { initTabs } from '../../layout/layout-plugin-nav-tabs.js';
import { initDropdowns } from '../forms/dropdown.js';
import { showToast } from '../feedback/toast.js';

// ── Show / Close ──

/**
 * Завантажує та відображає модальне вікно
 * @param {string} modalId — назва файлу шаблону без розширення
 * @param {HTMLElement} [triggerElement] — елемент що викликав модал
 */
export async function showModal(modalId, triggerElement = null) {
    try {
        // Якщо модал вже в DOM — просто показуємо
        const existing = document.getElementById(`modal-${modalId}`);
        if (existing) {
            existing.classList.add('open');
            document.body.classList.add('modal-open');
            pushModal(modalId);
            runHook('onAfterOpen', modalId, triggerElement, existing);
            dispatchModalEvent('modal-opened', modalId, triggerElement, existing);
            return;
        }

        runHook('onBeforeOpen', modalId, triggerElement);

        // Завантаження шаблону (з кешу або fetch)
        let templateHtml = getCachedTemplate(modalId);
        if (!templateHtml) {
            const response = await fetch(`/templates/modals/${modalId}.html`);
            if (!response.ok) throw new Error(`Не вдалося завантажити шаблон: ${modalId}`);
            templateHtml = await response.text();
            setCachedTemplate(modalId, templateHtml);
        }

        // Вставка HTML в DOM
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = templateHtml.trim();
        const modalElement = tempDiv.firstElementChild;

        modalElement.id = `modal-${modalId}`;
        modalElement.dataset.modalId = modalId;
        document.body.appendChild(modalElement);

        // Закриття при кліку на overlay (не для fullscreen)
        if (!modalElement.classList.contains('modal-fullscreen')) {
            modalElement.addEventListener('click', (e) => {
                if (e.target === modalElement) closeModal(modalId);
            });
        }

        // Показуємо модал
        document.body.classList.add('modal-open');
        requestAnimationFrame(() => modalElement.classList.add('open'));

        pushModal(modalId);

        // Ініціалізація компонентів всередині модалу
        const modalBody = modalElement.querySelector('.modal-body');
        if (modalBody) initTabs(modalBody);
        initDropdowns();

        // Хуки та події
        runHook('onAfterOpen', modalId, triggerElement, modalElement);
        dispatchModalEvent('modal-opened', modalId, triggerElement, modalElement);

    } catch (error) {
        console.error('Помилка при відображенні модального вікна:', error);
        showToast(`Помилка: не вдалося відкрити модальне вікно "${modalId}"`, 'error');
    }
}

/**
 * Закриває модальне вікно
 * @param {string} [modalId] — ID модалу. Якщо не вказано — верхній зі стеку
 */
export function closeModal(modalId = null) {
    if (!modalId) modalId = peekModal();
    if (!modalId) return;

    const modalElement = document.getElementById(`modal-${modalId}`);
    if (!modalElement) return;

    runHook('onBeforeClose', modalId, modalElement);

    modalElement.classList.remove('open');
    popModal(modalId);

    if (!hasOpenModals()) {
        document.body.classList.remove('modal-open');
    }

    dispatchModalEvent('modal-closed', modalId, null, modalElement);
    runHook('onAfterClose', modalId);

    // Видалити з DOM після анімації
    setTimeout(() => {
        if (modalElement && !modalElement.classList.contains('open')) {
            modalElement.remove();
        }
    }, 300);
}

/**
 * Закриває всі відкриті модалі
 */
export function closeAllModals() {
    while (hasOpenModals()) {
        closeModal();
    }
}

/**
 * Повертає список відкритих модалів
 * @returns {string[]}
 */
export { getStack as getOpenModals };

/**
 * Очищає кеш шаблонів (для розробки)
 */
export { clearTemplateCache as clearModalCache };

// ── Global event delegation ──

/**
 * Ініціалізує глобальні слухачі: click triggers/close, ESC
 * Викликається один раз з modal-main.js
 */
export function initModalCore() {
    // Click: open / close
    document.addEventListener('click', (e) => {
        // Відкриття через [data-modal-trigger]
        const trigger = e.target.closest('[data-modal-trigger]');
        if (trigger) {
            e.preventDefault();
            showModal(trigger.dataset.modalTrigger, trigger);
        }

        // Закриття через [data-modal-close] або .modal-close-btn
        const closeTrigger = e.target.closest('[data-modal-close], .modal-close-btn');
        if (closeTrigger && closeTrigger.closest('.modal-container, .modal-fullscreen-container')) {
            e.preventDefault();
            closeModal();
        }
    });

    // ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('modal-open')) {
            closeModal();
        }
    });
}

// ── Private helpers ──

function dispatchModalEvent(eventName, modalId, triggerElement, modalElement) {
    document.dispatchEvent(new CustomEvent(eventName, {
        detail: {
            modalId,
            trigger: triggerElement,
            modalElement,
            bodyTarget: modalElement?.querySelector('.modal-body'),
        }
    }));
}
