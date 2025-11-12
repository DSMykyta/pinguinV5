// Вміст файлу event-handlers.js

export function initEventHandlers() {
    const panelItems = document.querySelectorAll('.panel-item');

    panelItems.forEach(item => {
        // Додаємо стиль, щоб показати, що блок клікабельний
        item.style.cursor = 'pointer';

        item.addEventListener('click', function(event) {
            // Перевіряємо, чи є у елемента атрибут для скролу
            const scrollToSelector = item.dataset.scrollTo;

            // --- ЛОГІКА ДЛЯ СКРОЛУ ---
            if (scrollToSelector) {
                const targetElement = document.querySelector(scrollToSelector);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            } 
            // --- СТАРА ЛОГІКА ДЛЯ ВІДКРИТТЯ ПОСИЛАННЯ ---
            else {
                const link = item.querySelector('a');
                if (link) {
                    // Ця перевірка потрібна, щоб не відкривати 2 вкладки,
                    // якщо ви клікнете прямо на іконку "open_in_new".
                    if (!event.target.closest('a')) {
                        window.open(link.href, '_blank');
                    }
                }
            }
        });
    });
}