// js/generators/generator-seo/gse-main.js
import { registerPanelInitializer } from '../../panel/panel-right.js';
import { fetchData } from './gse-data.js';

// Імпортуємо наші нові модулі-активатори
import { renderTriggerButtons } from './gse-triggers.js';
import { initEventListeners, runCalculations } from './gse-events.js';
import { initResetButton } from './gse-reset.js';
import { initCopyListeners } from './gse-copy.js';
import { initAsideButtons } from './gse-aside.js';

async function initSeoGenerator() {
    // Перевірка, чи ми взагалі на сторінці, де є SEO-блок
    if (!document.getElementById('brand-name')) return;

    // 1. Завантажуємо дані
    await fetchData();

    // 2. Ініціалізуємо кожен модуль
    renderTriggerButtons(); // Малюємо кнопки в асайді
    initEventListeners();   // Включаємо всі "слухачі"
    initResetButton(runCalculations); // Включаємо кнопку очищення
    initCopyListeners();    // Включаємо копіювання результатів
    initAsideButtons();     // Кнопки додавання та глосарію

    // 3. Робимо перший запуск, щоб заповнити поля
    runCalculations();

    console.log('Генератор SEO успішно ініціалізовано за НОВОЮ ЧИСТОЮ СХЕМОЮ.');
}

// Реєструємо наш запускач в системі правої панелі
registerPanelInitializer('aside-seo', initSeoGenerator);