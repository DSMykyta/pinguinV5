// js/generators/generator-image/gim-main.js
import { registerPanelInitializer } from '../../panel/panel-right.js';
import { initImageToolLogic } from './gim-logic.js';

async function initImageToolGenerator() {
    // Перевірка, чи елементи HTML присутні на сторінці
    if (!document.getElementById('gim-image-input')) return;

    // Ініціалізація логіки
    initImageToolLogic();
}

// Реєструємо наш запускач
registerPanelInitializer('aside-image-tool', initImageToolGenerator);