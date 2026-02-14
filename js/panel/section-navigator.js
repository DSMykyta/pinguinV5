// js/layout/ui-section-navigator.js

/**
 * Ініціалізує логіку для навігатора секцій.
 * - Sliding indicator (підложка що їде між кнопками) — на ВСІХ сторінках.
 * - Плавна прокрутка по кліку — тільки на сторінках із секціями.
 * - Scroll Spy — тільки на сторінках із секціями.
 * - Плавна прокрутка колесом миші — тільки на сторінках із секціями.
 */
export function initSectionNavigator() {
    // Знаходимо навігатор на будь-якій сторінці (scroll або tabbed)
    const nav = document.getElementById('section-navigator')
             || document.querySelector('.section-navigator');
    if (!nav) return;

    const contentMain = document.getElementById('content-main');
    const sections = [...document.querySelectorAll('main > section[id]')];

    // ═══════════════════════════════════════════════
    //  ІНДИКАТОР — працює на ВСІХ сторінках
    // ═══════════════════════════════════════════════

    const indicator = document.createElement('div');
    indicator.className = 'nav-indicator';
    nav.appendChild(indicator);

    function moveIndicator() {
        const activeIcon = nav.querySelector('.nav-icon.is-active, .nav-icon.active');
        if (!activeIcon) {
            indicator.style.width = '0';
            return;
        }
        indicator.style.transform = `translateX(${activeIcon.offsetLeft}px)`;
        indicator.style.width = `${activeIcon.offsetWidth}px`;
    }

    // Початкова позиція без анімації
    moveIndicator();
    requestAnimationFrame(() => {
        indicator.classList.add('is-ready');
    });

    // Автоматичне слідкування за зміною класів (.active / .is-active)
    // Працює і для scroll spy, і для ui-tabs.js
    const classObserver = new MutationObserver(moveIndicator);
    classObserver.observe(nav, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
        childList: true
    });

    // Hover tracking — індикатор їде покадрово за розширенням іконок
    let trackingRAF = null;
    let stopTimeout = null;

    function startTracking() {
        clearTimeout(stopTimeout);
        indicator.classList.remove('is-ready');
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
            indicator.classList.add('is-ready');
        });
    }

    nav.addEventListener('mouseenter', startTracking);
    nav.addEventListener('mouseleave', () => {
        stopTimeout = setTimeout(stopTracking, 600);
    });

    // ═══════════════════════════════════════════════
    //  SCROLL FEATURES — тільки на сторінках із секціями
    // ═══════════════════════════════════════════════

    if (sections.length === 0 || !contentMain) return;

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

    // Плавна прокрутка по кліку на навігатор
    nav.addEventListener('click', (e) => {
        const navIcon = e.target.closest('.nav-icon');
        if (!navIcon || !navIcon.hash) return;

        e.preventDefault();
        const targetElement = document.querySelector(navIcon.hash);

        if (targetElement) {
            const index = sections.indexOf(targetElement);
            scrollToSection(index !== -1 ? index : 0);
        }
    });

    // Scroll Spy
    const navIcons = nav.querySelectorAll('.nav-icon');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const sectionId = entry.target.id;
            const correspondingIcon = nav.querySelector(`.nav-icon[href="#${sectionId}"]`);

            if (entry.isIntersecting) {
                navIcons.forEach(icon => icon.classList.remove('is-active'));
                if (correspondingIcon) {
                    correspondingIcon.classList.add('is-active');
                }
            }
        });
    }, {
        root: contentMain,
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0
    });

    sections.forEach(section => observer.observe(section));

    // Плавна прокрутка колесом миші
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
