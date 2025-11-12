// js/common/ui-tabs-scroll.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║           UNIVERSAL HORIZONTAL SCROLL COMPONENT FOR TABS                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Універсальний компонент для додавання горизонтального скролу з кнопками навігації.
 * Автоматично показує/приховує кнопки залежно від overflow.
 *
 * ФУНКЦІОНАЛ:
 * - Автоматичне створення wrapper та кнопок навігації
 * - Визначення чи потрібні кнопки (чи є overflow)
 * - Плавна прокрутка при кліку по стрілках
 * - Підтримка прокрутки колесом миші
 * - Fade градієнти на краях як індикатор overflow
 * - Автоматична прокрутка до активного елементу
 * - Адаптивність при зміні розміру вікна
 *
 * ВИКОРИСТАННЯ:
 * import { initTabsScroll } from './common/ui-tabs-scroll.js';
 * initTabsScroll('#tabs-head-container', { scrollAmount: 200 });
 */

/**
 * Ініціалізувати scroll для контейнера табів
 * @param {string|HTMLElement} containerSelector - Селектор або елемент контейнера
 * @param {Object} options - Опції
 * @param {number} options.scrollAmount - Кількість пікселів для прокрутки (за замовчуванням 200)
 * @param {boolean} options.smoothScroll - Використовувати плавну прокрутку (за замовчуванням true)
 * @param {boolean} options.showFadeIndicators - Показувати fade градієнти (за замовчуванням true)
 * @param {boolean} options.autoScrollToActive - Авто-прокрутка до активного табу (за замовчуванням true)
 * @returns {Object} API для керування scroll компонентом
 */
export function initTabsScroll(containerSelector, options = {}) {
    const {
        scrollAmount = 200,
        smoothScroll = true,
        showFadeIndicators = true,
        autoScrollToActive = true
    } = options;

    // Знайти контейнер
    const container = typeof containerSelector === 'string'
        ? document.querySelector(containerSelector)
        : containerSelector;

    if (!container) {
        console.warn(`⚠️ Tabs scroll container "${containerSelector}" не знайдено`);
        return null;
    }

    // Перевірити чи вже ініціалізовано
    if (container._tabsScrollAPI) {
        console.warn(`⚠️ Tabs scroll вже ініціалізовано для цього контейнера`);
        return container._tabsScrollAPI;
    }

    console.log('🎯 Ініціалізація tabs scroll для:', container.id || container);

    // Створити wrapper та кнопки
    const wrapper = createScrollWrapper(container, showFadeIndicators);
    const prevButton = wrapper.querySelector('.tabs-scroll-prev');
    const nextButton = wrapper.querySelector('.tabs-scroll-next');
    const fadeLeft = wrapper.querySelector('.tabs-scroll-fade-left');
    const fadeRight = wrapper.querySelector('.tabs-scroll-fade-right');

    // Додати клас для CSS
    

    // Функція оновлення стану кнопок
    function updateScrollState() {
        const { scrollLeft, scrollWidth, clientWidth } = container;
        const maxScroll = scrollWidth - clientWidth;

        // Визначити чи є overflow
        const hasOverflow = scrollWidth > clientWidth;

        // Оновити класи wrapper (з tolerance 2px для надійності)
        wrapper.classList.toggle('has-overflow', hasOverflow);
        wrapper.classList.toggle('is-start', scrollLeft <= 2);
        wrapper.classList.toggle('is-end', scrollLeft >= maxScroll - 2);

        console.log('📊 Scroll state:', { scrollLeft, scrollWidth, clientWidth, maxScroll, hasOverflow });
    }

    // Функція прокрутки
    function scrollBy(amount) {
        const behavior = smoothScroll ? 'smooth' : 'auto';
        container.scrollBy({
            left: amount,
            behavior: behavior
        });
    }

    // Обробники кліків по кнопках
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            scrollBy(-scrollAmount);
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            scrollBy(scrollAmount);
        });
    }

    // Обробник прокрутки колесом миші (горизонтальна прокрутка)
    container.addEventListener('wheel', (e) => {
        // Якщо прокрутка вертикальна, конвертувати в горизонтальну
        if (e.deltaY !== 0) {
            e.preventDefault();
            container.scrollLeft += e.deltaY;
        }
    }, { passive: false });

    // Drag-to-scroll functionality
    let isDragging = false;
    let startX;
    let scrollLeftStart;

    container.addEventListener('mousedown', (e) => {
        // Ігнорувати якщо клік по кнопці табу
        if (e.target.closest('.tab-button, .segment, button')) {
            return;
        }

        isDragging = true;
        startX = e.pageX - container.offsetLeft;
        scrollLeftStart = container.scrollLeft;
        container.style.cursor = 'grabbing';
        container.style.userSelect = 'none';
    });

    container.addEventListener('mouseleave', () => {
        isDragging = false;
        container.style.cursor = '';
        container.style.userSelect = '';
    });

    container.addEventListener('mouseup', () => {
        isDragging = false;
        container.style.cursor = '';
        container.style.userSelect = '';
    });

    container.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX) * 1.5; // Множник для швидкості прокрутки
        container.scrollLeft = scrollLeftStart - walk;
    });

    // Оновлювати стан при прокрутці
    container.addEventListener('scroll', updateScrollState);

    // Auto-scroll до активного табу
    function scrollToActiveTab() {
        if (!autoScrollToActive) return;

        const activeTab = container.querySelector('.tab-button.active, .segment.active');
        if (!activeTab) return;

        const containerRect = container.getBoundingClientRect();
        const activeRect = activeTab.getBoundingClientRect();

        // Перевірити чи активний таб видимий
        const isVisible =
            activeRect.left >= containerRect.left &&
            activeRect.right <= containerRect.right;

        if (!isVisible) {
            // Прокрутити так, щоб таб був по центру
            const scrollLeft = container.scrollLeft;
            const offset = activeRect.left - containerRect.left - (containerRect.width / 2) + (activeRect.width / 2);

            container.scrollTo({
                left: scrollLeft + offset,
                behavior: smoothScroll ? 'smooth' : 'auto'
            });
        }
    }

    // ResizeObserver для відстеження зміни розміру
    const resizeObserver = new ResizeObserver(() => {
        updateScrollState();
    });
    resizeObserver.observe(container);

    // MutationObserver для відстеження додавання/видалення табів
    const mutationObserver = new MutationObserver(() => {
        updateScrollState();
        // Невелика затримка для плавності
        setTimeout(scrollToActiveTab, 100);
    });
    mutationObserver.observe(container, {
        childList: true,
        subtree: true
    });

    // Початкове оновлення стану
    updateScrollState();

    // Прокрутити до активного табу після ініціалізації
    setTimeout(scrollToActiveTab, 100);

    // API для керування компонентом
    const api = {
        scrollTo: (amount) => scrollBy(amount),
        scrollToActive: scrollToActiveTab,
        updateState: updateScrollState,
        destroy: () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            container.removeEventListener('scroll', updateScrollState);
            delete container._tabsScrollAPI;
            console.log('🗑️ Tabs scroll знищено');
        }
    };

    // Зберегти API на контейнері
    container._tabsScrollAPI = api;

    console.log('✅ Tabs scroll ініціалізовано');
    return api;
}

/**
 * Створити wrapper структуру навколо контейнера
 * @param {HTMLElement} container - Контейнер табів
 * @param {boolean} showFadeIndicators - Показувати fade градієнти
 * @returns {HTMLElement} Wrapper елемент
 */
function createScrollWrapper(container, showFadeIndicators) {
    // Перевірити чи вже є wrapper
    if (container.parentElement?.classList.contains('tabs-scroll-wrapper')) {
        return container.parentElement;
    }

    // Створити wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'tabs-scroll-wrapper';

    // Вставити wrapper перед контейнером
    container.parentNode.insertBefore(wrapper, container);

    // Створити fade індикатори
    if (showFadeIndicators) {
        const fadeLeft = document.createElement('div');
        fadeLeft.className = 'tabs-scroll-fade-left';
        wrapper.appendChild(fadeLeft);
    }

    // Створити кнопку prev
    const prevButton = document.createElement('button');
    prevButton.className = 'tabs-scroll-nav tabs-scroll-prev';
    prevButton.setAttribute('aria-label', 'Попередні таби');
    prevButton.innerHTML = '<span class="material-symbols-outlined">chevron_left</span>';
    wrapper.appendChild(prevButton);

    // Перемістити контейнер в wrapper
    wrapper.appendChild(container);

    // Створити кнопку next
    const nextButton = document.createElement('button');
    nextButton.className = 'tabs-scroll-nav tabs-scroll-next';
    nextButton.setAttribute('aria-label', 'Наступні таби');
    nextButton.innerHTML = '<span class="material-symbols-outlined">chevron_right</span>';
    wrapper.appendChild(nextButton);

    // Створити fade індикатори
    if (showFadeIndicators) {
        const fadeRight = document.createElement('div');
        fadeRight.className = 'tabs-scroll-fade-right';
        wrapper.appendChild(fadeRight);
    }

    return wrapper;
}

/**
 * Знищити scroll компонент
 * @param {string|HTMLElement} containerSelector - Селектор або елемент контейнера
 */
export function destroyTabsScroll(containerSelector) {
    const container = typeof containerSelector === 'string'
        ? document.querySelector(containerSelector)
        : containerSelector;

    if (!container || !container._tabsScrollAPI) {
        console.warn(`⚠️ Tabs scroll не знайдено для знищення`);
        return;
    }

    container._tabsScrollAPI.destroy();
}

/**
 * Автоматично ініціалізувати scroll для всіх елементів з data-атрибутом
 * Використання: додайте data-tabs-scroll до HTML елемента
 *
 * @example
 * <div data-tabs-scroll>...</div>
 * <div data-tabs-scroll data-scroll-amount="300">...</div>
 */
export function autoInitTabsScroll() {
    const containers = document.querySelectorAll('[data-tabs-scroll]:not([data-scroll-initialized])');

    containers.forEach(container => {
        // Отримати параметри з data-атрибутів
        const scrollAmount = parseInt(container.dataset.scrollAmount) || 200;
        const smoothScroll = container.dataset.smoothScroll !== 'false';
        const showFadeIndicators = container.dataset.showFadeIndicators !== 'false';
        const autoScrollToActive = container.dataset.autoScrollToActive !== 'false';

        // Ініціалізувати scroll
        initTabsScroll(container, {
            scrollAmount,
            smoothScroll,
            showFadeIndicators,
            autoScrollToActive
        });

        // Позначити як ініціалізований
        container.dataset.scrollInitialized = 'true';
    });

    console.log(`✅ Auto-init: ініціалізовано ${containers.length} контейнерів`);
}
