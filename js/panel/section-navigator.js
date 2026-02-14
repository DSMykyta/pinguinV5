// js/layout/ui-section-navigator.js

/**
 * Ініціалізує логіку для навігатора секцій.
 * - Sliding indicator (підложка що їде між кнопками).
 * - Плавна прокрутка по кліку.
 * - Scroll Spy для підсвічування активної іконки.
 * - Плавна прокрутка колесом миші між секціями.
 */
export function initSectionNavigator() {
    const navigator = document.getElementById('section-navigator');
    if (!navigator) return;

    const contentMain = document.getElementById('content-main');
    const sections = [...document.querySelectorAll('main > section[id]')];
    const navIcons = navigator.querySelectorAll('.nav-icon');

    if (sections.length === 0 || !contentMain) return;

    // --- 0. Створюємо підложку-індикатор ---
    const indicator = document.createElement('div');
    indicator.className = 'nav-indicator';
    navigator.appendChild(indicator);

    function moveIndicator() {
        const activeIcon = navigator.querySelector('.nav-icon.is-active');
        if (!activeIcon) return;

        indicator.style.transform = `translateX(${activeIcon.offsetLeft}px)`;
        indicator.style.width = `${activeIcon.offsetWidth}px`;
    }

    // Початкова позиція без анімації
    moveIndicator();
    // Вмикаємо transition після першого кадру
    requestAnimationFrame(() => {
        indicator.classList.add('is-ready');
    });

    // --- Слідкування за hover (іконки розширюються — індикатор їде за ними) ---
    let trackingRAF = null;
    let stopTimeout = null;

    function startTracking() {
        clearTimeout(stopTimeout);
        indicator.classList.remove('is-ready'); // Вимикаємо transition — слідкуємо покадрово
        if (trackingRAF) return;
        function track() {
            moveIndicator();
            trackingRAF = requestAnimationFrame(track);
        }
        trackingRAF = requestAnimationFrame(track);
    }

    function stopTracking() {
        if (trackingRAF) {
            cancelAnimationFrame(trackingRAF);
            trackingRAF = null;
        }
        moveIndicator();
        requestAnimationFrame(() => {
            indicator.classList.add('is-ready'); // Повертаємо transition
        });
    }

    navigator.addEventListener('mouseenter', startTracking);
    navigator.addEventListener('mouseleave', () => {
        stopTimeout = setTimeout(stopTracking, 600); // Чекаємо поки іконка стисне назад
    });

    // --- 1. Плавна прокрутка по кліку ---
    let isAnimating = false;

    contentMain.addEventListener('scrollend', () => {
        isAnimating = false;
    });

    function getCurrentSectionIndex() {
        const scrollTop = contentMain.scrollTop;
        let closest = 0;
        let closestDist = Infinity;
        for (let i = 0; i < sections.length; i++) {
            const dist = Math.abs(sections[i].offsetTop - scrollTop);
            if (dist < closestDist) {
                closestDist = dist;
                closest = i;
            }
        }
        return closest;
    }

    function scrollToSection(index) {
        if (index < 0 || index >= sections.length) return;
        isAnimating = true;
        contentMain.scrollTo({
            top: sections[index].offsetTop,
            behavior: 'smooth'
        });
        setTimeout(() => { isAnimating = false; }, 1000);
    }

    navigator.addEventListener('click', (e) => {
        const navIcon = e.target.closest('.nav-icon');
        if (!navIcon || !navIcon.hash) return;

        e.preventDefault();
        const targetElement = document.querySelector(navIcon.hash);

        if (targetElement) {
            const index = sections.indexOf(targetElement);
            scrollToSection(index !== -1 ? index : 0);
        }
    });

    // --- 2. Scroll Spy + рух індикатора ---
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const sectionId = entry.target.id;
            const correspondingIcon = navigator.querySelector(`.nav-icon[href="#${sectionId}"]`);

            if (entry.isIntersecting) {
                navIcons.forEach(icon => icon.classList.remove('is-active'));
                if (correspondingIcon) {
                    correspondingIcon.classList.add('is-active');
                }
                moveIndicator();
            }
        });
    }, {
        root: contentMain,
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0
    });

    sections.forEach(section => observer.observe(section));

    // --- 3. Плавна прокрутка колесом миші ---
    contentMain.addEventListener('wheel', (e) => {
        if (isAnimating) {
            e.preventDefault();
            return;
        }

        const section = e.target.closest('section');
        if (section) {
            const canScroll = section.scrollHeight > section.clientHeight + 1;
            if (canScroll) {
                const atTop = section.scrollTop <= 0;
                const atBottom = section.scrollTop + section.clientHeight >= section.scrollHeight - 2;

                if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) {
                    return;
                }
            }
        }

        e.preventDefault();

        const current = getCurrentSectionIndex();
        const next = e.deltaY > 0
            ? Math.min(current + 1, sections.length - 1)
            : Math.max(current - 1, 0);

        if (next !== current) {
            scrollToSection(next);
        }
    }, { passive: false });
}
