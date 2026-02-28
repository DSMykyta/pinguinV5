// js/components/feedback/loading.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    UNIVERSAL LOADING STATES                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Універсальні компоненти для показу станів завантаження:
 * - Spinner (крутиться)
 * - Progress dots (крапки що анімуються)
 * - Progress bar (прогрес-бар з відсотками)
 */

import { showToast } from './toast.js';

/**
 * Показати loader в контейнері
 * @param {string|HTMLElement} container - Селектор або елемент контейнера
 * @param {Object} options - Налаштування
 * @param {string} options.type - Тип loader: 'spinner' | 'dots' | 'progress'
 * @param {string} options.message - Повідомлення
 * @param {boolean} options.overlay - Показати напівпрозорий overlay
 */
export function showLoader(container, options = {}) {
    const {
        type = 'spinner',
        message = 'Завантаження...',
        overlay = false
    } = options;

    const containerEl = typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!containerEl) {
        console.error('❌ Контейнер для loader не знайдено:', container);
        return null;
    }

    // Видалити попередній loader якщо є
    const existingLoader = containerEl.querySelector('.loading-overlay, .loading-state');
    if (existingLoader) {
        existingLoader.remove();
    }

    const loaderEl = document.createElement('div');
    loaderEl.className = overlay ? 'loading-overlay' : 'loading-state';

    let loaderHTML = '';

    switch (type) {
        case 'spinner':
            loaderHTML = `
                <div class="spinner"></div>
                <p class="loading-message">${message}</p>
            `;
            break;

        case 'dots':
            loaderHTML = `
                <div class="loading-dots">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
                <p class="loading-message">${message}</p>
            `;
            break;

        case 'progress':
            loaderHTML = `
                <div class="progress-bar">
                    <div class="progress-fill" data-progress-fill></div>
                </div>
                <p class="loading-message" data-progress-message>${message}</p>
            `;
            break;
    }

    loaderEl.innerHTML = loaderHTML;
    containerEl.appendChild(loaderEl);

    // Повернути API для оновлення прогресу
    return {
        element: loaderEl,
        updateProgress: (percent, newMessage) => {
            if (type === 'progress') {
                const fill = loaderEl.querySelector('[data-progress-fill]');
                if (fill) {
                    fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
                }
                const msg = loaderEl.querySelector('[data-progress-message]');
                if (msg && newMessage) msg.textContent = newMessage;
            }
        },
        updateMessage: (newMessage) => {
            const msg = loaderEl.querySelector('.loading-message');
            if (msg) msg.textContent = newMessage;
        },
        hide: () => {
            loaderEl.remove();
        }
    };
}

/**
 * Приховати loader
 * @param {string|HTMLElement} container - Селектор або елемент контейнера
 */
export function hideLoader(container) {
    const containerEl = typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!containerEl) return;

    const loader = containerEl.querySelector('.loading-overlay, .loading-state');
    if (loader) {
        loader.remove();
    }
}

/**
 * Показати помилку з детальною інформацією
 * @param {Error} error - Об'єкт помилки
 * @param {string} context - Контекст помилки (що робили)
 */
export function showErrorDetails(error, context = '') {
    console.error(`❌ Помилка${context ? ` (${context})` : ''}:`, error);

    const errorMessage = error.message || 'Невідома помилка';
    const fullMessage = context
        ? `${context}: ${errorMessage}`
        : errorMessage;

    showToast(fullMessage, 'error', 5000);
}

/**
 * Обгорнути асинхронну операцію в loader
 * @param {string|HTMLElement} container - Контейнер для loader
 * @param {Function} asyncFn - Асинхронна функція
 * @param {Object} loaderOptions - Налаштування loader
 */
export async function withLoader(container, asyncFn, loaderOptions = {}) {
    const loader = showLoader(container, loaderOptions);

    try {
        const result = await asyncFn(loader);
        return result;
    } catch (error) {
        showErrorDetails(error, loaderOptions.message || 'Операція');
        throw error;
    } finally {
        if (loader) {
            loader.hide();
        }
    }
}
