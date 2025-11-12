// js/layout/ui-section-navigator.js

/**
 * Ініціалізує логіку для нового фіксованого навігатора секцій.
 * - Додає плавну прокрутку по кліку.
 * - Додає "Scroll Spy" для підсвічування активної іконки.
 */
export function initSectionNavigator() {
    const navigator = document.getElementById('section-navigator');
    if (!navigator) return;

    // 1. Плавна прокрутка по кліку
    navigator.addEventListener('click', (e) => {
        const navIcon = e.target.closest('.nav-icon');
        // Перевіряємо, чи це дійсно клік по посиланню з хешем
        if (!navIcon || !navIcon.hash) return;
        
        e.preventDefault(); // Забороняємо стандартний "стрибок"
        const targetId = navIcon.hash;
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });

    // 2. Scroll Spy (підсвічування активної секції)
    const sections = document.querySelectorAll('main > section[id]');
    const navIcons = navigator.querySelectorAll('.nav-icon');

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const sectionId = entry.target.id;
            const correspondingIcon = navigator.querySelector(`.nav-icon[href="#${sectionId}"]`);
            
            // Якщо секція входить в центральну зону перегляду
            if (entry.isIntersecting) {
                // Видаляємо .is-active з усіх іконок
                navIcons.forEach(icon => icon.classList.remove('is-active'));
                // Додаємо .is-active до потрібної
                if (correspondingIcon) {
                    correspondingIcon.classList.add('is-active');
                }
            }
        });
    }, {
        root: document.getElementById('content-main'), // Скрол відбувається всередині #content-main
        rootMargin: '-50% 0px -50% 0px', // Активується, коли секція досягає центру екрану
        threshold: 0 // Спрацьовує як тільки секція торкнеться цієї зони
    });

    // Починаємо спостереження за всіма секціями
    sections.forEach(section => observer.observe(section));

    console.log('✅ Фіксований навігатор секцій ініціалізовано.');
}