// js/layout/ui-section-navigator.js

/**
 * Ініціалізує логіку для нового фіксованого навігатора секцій.
 * - Додає плавну прокрутку по кліку.
 * - Додає "Scroll Spy" для підсвічування активної іконки.
 * - Додає sliding pill ефект для плавного переходу між табами.
 */
export function initSectionNavigator() {
    const navigator = document.getElementById('section-navigator');
    if (!navigator) return;

    // --- Sliding Pill Setup ---
    const pill = document.createElement('div');
    pill.className = 'nav-pill';
    navigator.style.position = 'relative';
    navigator.appendChild(pill);

    let activeIcon = null;

    /**
     * Переміщує pill до вказаного елемента nav-icon.
     * @param {HTMLElement} target - Цільовий .nav-icon елемент
     * @param {boolean} instant - Якщо true, переміщення без анімації
     */
    function movePill(target, instant = false) {
        if (!target) {
            pill.classList.remove('is-ready');
            return;
        }

        const navRect = navigator.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();

        const left = targetRect.left - navRect.left;
        const width = targetRect.width;

        if (instant) {
            pill.style.transition = 'none';
        }

        pill.style.transform = `translateX(${left}px)`;
        pill.style.width = `${width}px`;

        if (instant) {
            // Force reflow, then restore transition
            pill.offsetHeight;
            pill.style.transition = '';
        }

        pill.classList.add('is-ready');
    }

    /**
     * Повертає pill до поточного активного табу.
     */
    function returnToActive() {
        movePill(activeIcon);
    }

    // --- Hover: pill слідує за курсором і трекає розширення іконки ---
    const navIcons = navigator.querySelectorAll('.nav-icon');
    let hoveredIcon = null;
    let hoverRafId = null;

    function trackHoveredIcon() {
        if (hoveredIcon) {
            movePill(hoveredIcon);
            hoverRafId = requestAnimationFrame(trackHoveredIcon);
        }
    }

    navIcons.forEach(icon => {
        icon.addEventListener('mouseenter', () => {
            hoveredIcon = icon;
            // Стартуємо RAF loop щоб pill слідкував за розширенням іконки
            if (hoverRafId) cancelAnimationFrame(hoverRafId);
            hoverRafId = requestAnimationFrame(trackHoveredIcon);
        });
    });

    navigator.addEventListener('mouseleave', () => {
        hoveredIcon = null;
        if (hoverRafId) {
            cancelAnimationFrame(hoverRafId);
            hoverRafId = null;
        }
        returnToActive();
    });

    // --- 1. Плавна прокрутка по кліку ---
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

    // --- 2. Scroll Spy (підсвічування активної секції) ---
    const sections = document.querySelectorAll('main > section[id]');

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
                    activeIcon = correspondingIcon;

                    // Якщо не ховеримо навігатор — рухаємо pill
                    if (!navigator.matches(':hover')) {
                        movePill(correspondingIcon);
                    }
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

    // --- Ініціалізація: встановлюємо pill на перший активний таб ---
    const initialActive = navigator.querySelector('.nav-icon.is-active');
    if (initialActive) {
        activeIcon = initialActive;
        // Даємо браузеру відмалювати навігатор перед позиціонуванням
        requestAnimationFrame(() => {
            movePill(initialActive, true);
        });
    }
}
