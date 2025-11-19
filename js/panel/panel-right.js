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
    console.log('🔍 preloadAllPanels: початок завантаження панелей');
    const contentContainer = document.getElementById('panel-right-content');
    const sections = document.querySelectorAll('[data-panel-template]');

    console.log('📦 Знайдено елементів з data-panel-template:', sections.length);
    console.log('📦 contentContainer:', contentContainer);

    if (!sections.length || !contentContainer) {
        console.error('❌ preloadAllPanels: не знайдено sections або contentContainer');
        return;
    }

    // Збираємо унікальні назви шаблонів
    const templateNames = new Set();
    sections.forEach(section => templateNames.add(section.dataset.panelTemplate));
    console.log('📋 Унікальні шаблони для завантаження:', Array.from(templateNames));

    // Створюємо масив промісів для паралельного завантаження
    const loadingPromises = Array.from(templateNames).map(async (name) => {
        console.log(`🔄 Завантаження панелі: ${name}`);
        const wrapper = document.createElement('div');
        wrapper.id = name; // Використовуємо назву як ID для легкого доступу
        wrapper.className = 'panel-fragment'; // Клас для стилізації (ховаємо за замовчуванням)
        contentContainer.appendChild(wrapper);

        // Завантажуємо HTML у цей контейнер
        const templateUrl = `templates/aside/${name}.html`;
        await loadHTML(templateUrl, wrapper);
        console.log(`✅ Завантажено HTML для: ${name}`);

        // Після завантаження HTML, викликаємо відповідний ініціалізатор з "реєстру"
        if (panelInitializers[name]) {
            console.log(`🚀 Викликаємо ініціалізатор для: ${name}`);
            panelInitializers[name]();
        } else {
            console.warn(`⚠️ Ініціалізатор не знайдено для: ${name}`);
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
    const sections = document.querySelectorAll('[data-panel-template]');
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

/**
 * Завантажує конкретний шаблон в асайд панель.
 * @param {string} templateName - Назва шаблону (напр. 'aside-glossary').
 */
export async function loadAsideTemplate(templateName) {
    const contentContainer = document.getElementById('panel-right-content');
    if (!contentContainer) return;

    // Перевіряємо, чи вже завантажено
    if (document.getElementById(templateName)) return;

    const wrapper = document.createElement('div');
    wrapper.id = templateName;
    wrapper.className = 'panel-fragment is-active'; // Одразу активний
    contentContainer.appendChild(wrapper);

    const templateUrl = `templates/aside/${templateName}.html`;

    try {
        await loadHTML(templateUrl, wrapper);
        console.log(`✅ Завантажено HTML для: ${templateName}`);

        if (panelInitializers[templateName]) {
            console.log(`🚀 Викликаємо ініціалізатор для: ${templateName}`);
            panelInitializers[templateName]();
        }

        initDropdowns();
    } catch (error) {
        console.error(`❌ Помилка завантаження шаблону ${templateName}:`, error);
    }
}