// js/common/ui-toast.js

/** type → color class (error = c-red, інше — базовий чорний) */
const TOAST_COLOR = { error: 'c-red' };

/**
 * Знаходить або створює контейнер для toast-повідомлень.
 */
function getOrCreateToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Показує спливаюче повідомлення (toast).
 * @param {string} message - Текст повідомлення.
 * @param {string} [type='success'] - Тип повідомлення ('success', 'error', 'info').
 * @param {number|Object} [durationOrOptions=3000] - Тривалість (мс) або об'єкт опцій.
 * @param {number} [durationOrOptions.duration=5000] - Тривалість показу в мілісекундах.
 * @param {Object} [durationOrOptions.action] - Action button для toast.
 * @param {string} durationOrOptions.action.label - Текст кнопки.
 * @param {Function} durationOrOptions.action.onClick - Callback при натисканні.
 */
export function showToast(message, type = 'success', durationOrOptions = 3000) {
    let duration, action;
    if (typeof durationOrOptions === 'object') {
        duration = durationOrOptions.duration || 5000;
        action = durationOrOptions.action;
    } else {
        duration = durationOrOptions;
    }

    const toastContainer = getOrCreateToastContainer();

    const toast = document.createElement('div');
    const colorClass = TOAST_COLOR[type] || '';
    toast.className = colorClass ? `toast ${colorClass}` : 'toast';

    // Текст повідомлення
    const textSpan = document.createElement('span');
    textSpan.className = 'toast-message';
    textSpan.textContent = message;
    toast.appendChild(textSpan);

    // Action button (якщо є)
    if (action) {
        const btn = document.createElement('button');
        btn.className = 'toast-action';
        btn.textContent = action.label;
        btn.addEventListener('click', () => {
            clearTimeout(dismissTimer);
            action.onClick();
            toast.classList.remove('visible');
            toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        });
        toast.appendChild(btn);
    }

    toastContainer.appendChild(toast);

    // Запускаємо анімацію появи
    setTimeout(() => {
        toast.classList.add('visible');
    }, 10);

    // Зникнення та видалення після завершення тривалості
    const dismissTimer = setTimeout(() => {
        toast.classList.remove('visible');

        // Чекаємо завершення анімації зникнення перед видаленням з DOM
        toast.addEventListener('transitionend', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }, duration);
}
