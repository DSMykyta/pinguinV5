// js/main-glossary.js
import { initCore } from './main-core.js';
import { initGlossaryPage } from './pages/glossary/glossary-init.js';


async function initializeApp() {
    try {
        await initCore();
        await initGlossaryPage();
        
    } catch (error) {
        console.error('Критична помилка під час ініціалізації:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);