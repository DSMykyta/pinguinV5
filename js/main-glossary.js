// js/main-glossary.js
import { initCore } from './main-core.js';
import './glossary/glossary-init.js';


async function initializeApp() {
    try {
        console.log('Ініціалізація ядра додатка...');
        initCore(); // initCore має запускати initPanelRight
        console.log('Додаток успішно ініціалізовано. Панелі завантажуються...');
    } catch (error) {
        console.error('Критична помилка під час ініціалізації:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);