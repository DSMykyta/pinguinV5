// js/panel/panel-right.js
import { loadHTML } from '../common/util-loader.js';
import { initDropdowns } from '../common/ui-dropdown.js';

// --- НАШ "РЕЄСТР" ІНІЦІАЛІЗАТОРІВ ---
// Це єдине місце, де ми пов'язуємо назву панелі з її функцією запуску.
// Він буде заповнюватися автоматично.
const panelInitializers = {};

/**
 * Функція для реєстрації запускача панелі.
 * @param {string} templateName - Назва шаблону (напр. 'aside-text').
 * @param {Function} initFunction - Функція, яка запускає логіку панелі.
 */
export function registerPanelInitializer(templateName, initFunction) {
    panelInitializers[templateName] = initFunction;
}


/**
 * Показує потрібну панель і ховає всі інші.
 * @param {string} templateName - Назва шаблону панелі, яку треба показати.
 */
function showActivePanel(templateName) {
    const contentContainer = document.getElementById('panel-right-content');
    if (!contentContainer) return;

    // Ховаємо всі завантажені фрагменти
    const allPanels = contentContainer.querySelectorAll('.panel-fragment');
    allPanels.forEach(panel => panel.classList.remove('is-active'));

    // Показуємо потрібний
    const activePanel = document.getElementById(templateName);
    if (activePanel) {
        activePanel.classList.add('is-active');
    }
}

/**
 * Сканує сторінку, знаходить всі потрібні панелі і завантажує їх у фоні.
 */
async function preloadAllPanels() {
    const contentContainer = document.getElementById('panel-right-content');
    const sections = document.querySelectorAll('.content-main section[data-panel-template]');
    if (!sections.length || !contentContainer) return;

    // Збираємо унікальні назви шаблонів
    const templateNames = new Set();
    sections.forEach(section => templateNames.add(section.dataset.panelTemplate));

    // Створюємо масив промісів для паралельного завантаження
    const loadingPromises = Array.from(templateNames).map(async (name) => {
        const wrapper = document.createElement('div');
        wrapper.id = name; // Використовуємо назву як ID для легкого доступу
        wrapper.className = 'panel-fragment'; // Клас для стилізації (ховаємо за замовчуванням)
        contentContainer.appendChild(wrapper);

        // Завантажуємо HTML у цей контейнер
        const templateUrl = `templates/aside/${name}.html`;
        await loadHTML(templateUrl, wrapper);

        // Після завантаження HTML, викликаємо відповідний ініціалізатор з "реєстру"
        if (panelInitializers[name]) {
            panelInitializers[name]();
        }
    });

    // Чекаємо, поки всі панелі завантажаться
    await Promise.all(loadingPromises);
    initDropdowns(); // Ініціалізуємо всі випадаючі списки одразу
}

/**
 * Налаштовує спостерігач, який перемикає панелі при скролі.
 */
function initSectionObserver() {
    const sections = document.querySelectorAll('.content-main section[data-panel-template]');
    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const templateName = entry.target.dataset.panelTemplate;
                showActivePanel(templateName); // Тепер просто показуємо, а не завантажуємо
            }
        });
    }, {
        root: document.querySelector('.content-main'),
        threshold: 0.1
    });

    sections.forEach(section => observer.observe(section));
}

/**
 * Головна функція запуску правої панелі.
 */
export async function initPanelRight() {
    // Спочатку завантажуємо все необхідне
    await preloadAllPanels();

    // І тільки потім налаштовуємо перемикання по скролу
    initSectionObserver();

    // Логіка кнопки згортання залишається без змін
    const panel = document.getElementById('panel-right');
    const toggleBtn = document.getElementById('btn-panel-right-toggle');
    const mainContent = document.getElementById('content-main');

    if (panel && toggleBtn && mainContent) {
        toggleBtn.addEventListener('click', () => {
            panel.classList.toggle('is-collapsed');
            document.body.classList.toggle('right-panel-collapsed', panel.classList.contains('is-collapsed'));
        });
    } else {
        console.error("Не знайдено panel-right, btn-panel-right-toggle або content-main");
    }
}