// js/main-glossary.js
import { initCore } from './main-core.js';
// Імпортуйте вашу функцію ініціалізації сторінки
import { initGlossaryGenerator } from './glossary/glossary-init.js';


async function initializeApp() {
    try {
        console.log('Ініціалізація ядра додатка...');
        initCore(); // initCore запустить initPanelRight, як і раніше
        console.log('Ядро ініціалізовано. Завантаження контенту глосарію...');

        // Тепер ми викликаємо завантажувач контенту сторінки
        // окремо і у правильному місці.
        await initGlossaryGenerator(); 

        console.log('Додаток успішно ініціалізовано.');
    } catch (error) {
        console.error('Критична помилка під час ініціалізації:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);