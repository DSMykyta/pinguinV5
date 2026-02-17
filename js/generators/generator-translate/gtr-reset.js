// js/generators/generator-translate/gtr-reset.js

export function initTranslateReset() {
    const reloadBtn = document.getElementById('reload-section-translate');
    const iframeContainer = document.querySelector('#section-translate .section-content');

    if (!reloadBtn || !iframeContainer) {
        return;
    }

    reloadBtn.addEventListener('click', () => {
        const oldIframe = iframeContainer.querySelector('iframe');
        if (!oldIframe) {
            console.error("Iframe для перезавантаження не знайдено.");
            return;
        }

        const icon = reloadBtn.querySelector('span'); // Знаходимо іконку

        // === Анімація СТАРТ: Додаємо клас ===
        reloadBtn.disabled = true;
        reloadBtn.style.color = 'var(--color-primary)';
        icon?.classList.add('spinning'); // Додаємо клас для обертання
        // ===================================

        try {
            const initialSrc = oldIframe.getAttribute('src');
            let cleanSrc = initialSrc.split('&_=')[0].split('?_=')[0];
            const separator = cleanSrc.includes('?') ? '&' : '?';
            const newSrc = `${cleanSrc}${separator}_=${Date.now()}`;

            const newIframe = document.createElement('iframe');
            newIframe.style.cssText = oldIframe.style.cssText;
            newIframe.title = oldIframe.title;
            newIframe.src = newSrc;

            // Функція для зупинки анімації
            const stopAnimation = () => {
                reloadBtn.disabled = false;
                reloadBtn.style.color = 'var(--text-disabled)';
                icon?.classList.remove('spinning'); // Прибираємо клас обертання
                 // Переконуємось, що transform скинуто (про всяк випадок)
                if(icon) {
                    icon.style.transform = 'none';
                    icon.style.transition = 'none'; // Скидаємо transition, якщо він був
                }
            };

            // Слухаємо 'load' на НОВОМУ iframe
            newIframe.onload = () => {
                stopAnimation();
                newIframe.onload = null;
            };

            // Обробник помилки
             newIframe.onerror = () => {
                 console.error('Помилка завантаження нового iframe.');
                 stopAnimation(); // Зупиняємо анімацію
             };

            // Замінюємо старий iframe
            iframeContainer.replaceChild(newIframe, oldIframe);

        } catch (e) {
            console.error("Помилка під час заміни iframe:", e);
             // Зупиняємо анімацію
             reloadBtn.disabled = false;
             reloadBtn.style.color = 'var(--text-disabled)';
             icon?.classList.remove('spinning');
             if(icon) icon.style.transform = 'none';
        }
    });
}