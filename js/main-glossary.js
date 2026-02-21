// js/main-glossary.js
import { initCore } from './main-core.js';
import { loadSingleAsideTemplate } from './aside/aside-main.js';
import { initGlossaryPage } from './glossary/glossary-init.js';


async function initializeApp() {
    try {
        
        // Initialize core functionality
        await initCore();
        
        // Load aside template
        await loadSingleAsideTemplate('aside-glossary');
        
        // Initialize glossary-specific functionality
        await initGlossaryPage();
        
    } catch (error) {
        console.error('Критична помилка під час ініціалізації:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);