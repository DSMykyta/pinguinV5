// js/common/textarea-expand.js

/**
 * Модуль для розгортання textarea на весь екран
 * Автоматично додає кнопки розгортання до великих textarea (rows >= 3)
 */

/**
 * Ініціалізує розгортання для всіх великих textarea в контейнері
 * @param {HTMLElement} container - Контейнер для пошуку textarea (за замовчуванням document)
 */
export function initTextareaExpand(container = document) {
    const textareas = container.querySelectorAll('textarea');

    textareas.forEach(textarea => {
        // Додаємо кнопку розгортання тільки для великих textarea
        const rows = parseInt(textarea.getAttribute('rows')) || 3;
        const height = parseInt(textarea.style.height) || 0;

        // Якщо textarea має 3+ рядки або висоту 100+px
        if (rows >= 3 || height >= 100) {
            const formGroup = textarea.closest('.form-group');

            if (formGroup && !formGroup.querySelector('.btn-expand-textarea')) {
                addExpandButton(formGroup, textarea);
            }
        }
    });
}

/**
 * Додає кнопку розгортання до form-group
 * @param {HTMLElement} formGroup - Батьківський form-group
 * @param {HTMLElement} textarea - Textarea елемент
 */
function addExpandButton(formGroup, textarea) {
    // Створюємо кнопку
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn-expand-textarea';
    button.setAttribute('aria-label', 'Розгорнути на весь екран');
    button.innerHTML = `
        <span class="material-symbols-outlined">open_in_full</span>
        <span class="btn-expand-text">Розгорнути</span>
    `;

    // Вставляємо кнопку в form-group (перед textarea)
    textarea.parentNode.insertBefore(button, textarea);

    // Обробник кліку
    button.addEventListener('click', () => {
        toggleExpand(formGroup, button, textarea);
    });

    // Обробник ESC для закриття
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && formGroup.classList.contains('is-expanded')) {
            toggleExpand(formGroup, button, textarea);
        }
    });
}

/**
 * Перемикає стан розгортання
 * @param {HTMLElement} formGroup - Form group елемент
 * @param {HTMLElement} button - Кнопка розгортання
 * @param {HTMLElement} textarea - Textarea елемент
 */
function toggleExpand(formGroup, button, textarea) {
    const isExpanded = formGroup.classList.contains('is-expanded');

    if (isExpanded) {
        // Згортаємо
        formGroup.classList.remove('is-expanded');
        document.body.classList.remove('textarea-expanded');

        button.innerHTML = `
            <span class="material-symbols-outlined">open_in_full</span>
            <span class="btn-expand-text">Розгорнути</span>
        `;
        button.setAttribute('aria-label', 'Розгорнути на весь екран');

        // Повертаємо фокус на textarea
        setTimeout(() => textarea.focus(), 100);
    } else {
        // Розгортаємо
        formGroup.classList.add('is-expanded');
        document.body.classList.add('textarea-expanded');

        button.innerHTML = `
            <span class="material-symbols-outlined">close_fullscreen</span>
            <span class="btn-expand-text">Згорнути</span>
        `;
        button.setAttribute('aria-label', 'Згорнути');

        // Фокус на textarea в розгорнутому стані
        setTimeout(() => textarea.focus(), 100);
    }
}

/**
 * Автоматична ініціалізація при відкритті модалу
 */
export function autoInitTextareaExpand() {
    // Слухаємо подію відкриття модалу
    document.addEventListener('modal-opened', (event) => {
        const modalBody = event.detail.bodyTarget;
        if (modalBody) {
            // Невелика затримка для того щоб DOM встиг оновитись
            setTimeout(() => {
                initTextareaExpand(modalBody);
            }, 50);
        }
    });

    console.log('✅ Textarea expand автоматична ініціалізація активована');
}
