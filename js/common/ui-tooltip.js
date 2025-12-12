// js/common/ui-tooltip.js
// Система кастомних спливаючих підказок для елементів з data-tooltip

let tooltipElement;
let tooltipTimeout;

/**
 * Ініціалізує систему кастомних спливаючих підказок
 */
export function initTooltips() {
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('mousemove', handleMouseMove);
}

function handleMouseOver(event) {
    const target = event.target.closest('[data-tooltip]');
    if (!target) return;

    // Для аватарок і елементів з класом tooltip-always - завжди показуємо
    const forceTooltip = target.classList.contains('avatar') || target.hasAttribute('data-tooltip-always');

    // Перевірка чи текст обрізався (якщо елемент має overflow)
    const hasOverflow = target.scrollWidth > target.clientWidth;
    if (!hasOverflow && !forceTooltip) {
        // Якщо текст не обрізався і не force - не показувати tooltip
        return;
    }

    const tooltipText = target.getAttribute('data-tooltip');
    if (!tooltipText) return;

    // Затримка 1 секунда перед показом
    tooltipTimeout = setTimeout(() => {
        // Створюємо елемент підказки
        tooltipElement = document.createElement('div');
        tooltipElement.className = 'custom-tooltip';
        tooltipElement.textContent = tooltipText;
        document.body.appendChild(tooltipElement);

        // Позиціонуємо його і робимо видимим
        positionTooltip(event);
        requestAnimationFrame(() => {
            if (tooltipElement) {
                tooltipElement.classList.add('visible');
            }
        });
    }, 1000); // 1 секунда затримки
}

function handleMouseOut(event) {
    // Скасувати затримку якщо миша пішла до появи tooltip
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
    }

    // Видалити tooltip якщо він існує
    if (tooltipElement) {
        tooltipElement.remove();
        tooltipElement = null;
    }
}

function handleMouseMove(event) {
    if (tooltipElement) {
        positionTooltip(event);
    }
}

function positionTooltip(event) {
    const offsetX = 15;
    const offsetY = 15;

    let x = event.clientX + offsetX;
    let y = event.clientY + offsetY;

    // Використовуємо requestAnimationFrame для плавного оновлення позиції
    requestAnimationFrame(() => {
        if (!tooltipElement) return;

        const tooltipRect = tooltipElement.getBoundingClientRect();

        // Перевірка, щоб підказка не виходила за межі екрану
        if (x + tooltipRect.width > window.innerWidth) {
            x = event.clientX - tooltipRect.width - offsetX;
        }
        if (y + tooltipRect.height > window.innerHeight) {
            y = event.clientY - tooltipRect.height - offsetY;
        }

        tooltipElement.style.left = `${x}px`;
        tooltipElement.style.top = `${y}px`;
    });
}
