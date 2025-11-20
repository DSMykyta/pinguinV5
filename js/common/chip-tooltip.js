// js/common/chip-tooltip.js

/**
 * Ініціалізує позиціонування tooltip для chip елементів
 * Використовує position: fixed для виходу поверх overflow контейнерів
 */
export function initChipTooltips() {
    document.addEventListener('mouseover', (event) => {
        const chip = event.target.closest('.chip-tooltip');
        if (!chip) return;

        const tooltip = chip.querySelector('.chip-tooltip-content');
        if (!tooltip) return;

        // Отримуємо позицію chip відносно viewport
        const chipRect = chip.getBoundingClientRect();

        // Розраховуємо позицію tooltip (під chip)
        const top = chipRect.bottom + 8;
        const left = chipRect.left;

        // Встановлюємо CSS змінні для позиціонування
        tooltip.style.setProperty('--tooltip-top', `${top}px`);
        tooltip.style.setProperty('--tooltip-left', `${left}px`);
    });

    console.log('✅ Chip tooltips ініціалізовано');
}
