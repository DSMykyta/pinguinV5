/**
 * COMPONENT: Bubble Nav
 *
 * Ініціалізує горизонтальну навігацію bubble-nav.
 * Ренейм section-navigator → bubble-nav.
 *
 * - Плавна прокрутка по кліку.
 * - Scroll Spy для підсвічування активної кнопки.
 *
 * CSS: css/components/navigation/bubble-nav.css
 */

/**
 * @param {HTMLElement} nav - елемент .bubble-nav-row
 * @param {Object} [opts]
 * @param {HTMLElement} [opts.scrollRoot] - контейнер скролу (default: #content-main)
 */
export function initBubbleNav(nav, opts = {}) {
    if (!nav) return;

    // 1. Плавна прокрутка по кліку
    nav.addEventListener('click', (e) => {
        const btn = e.target.closest('.bubble-nav-btn');
        if (!btn || !btn.hash) return;

        e.preventDefault();
        const target = document.querySelector(btn.hash);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    // 2. Scroll Spy
    const sections = document.querySelectorAll('main > section[id]');
    const btns = nav.querySelectorAll('.bubble-nav-btn');

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const id = entry.target.id;
            const btn = nav.querySelector(`.bubble-nav-btn[href="#${id}"]`);

            if (entry.isIntersecting) {
                btns.forEach(b => b.classList.remove('active'));
                if (btn) btn.classList.add('active');
            }
        });
    }, {
        root: opts.scrollRoot || document.getElementById('content-main'),
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0
    });

    sections.forEach(section => observer.observe(section));
}
