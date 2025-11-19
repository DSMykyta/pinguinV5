// js/main-glossary.js
import { initCore } from './main-core.js';
import { loadAsideTemplate } from './panel/panel-right.js';
import { initGlossaryPage } from './glossary/glossary-init.js';


async function initializeApp() {
    try {
        console.log('Ініціалізація глосарію...');
        
        // Initialize core functionality
        initCore(); 
        
        // Load aside template explicitly
        await loadAsideTemplate('aside-glossary');
        
        // Initialize glossary-specific functionality
        await initGlossaryPage();
        
        console.log('Глосарій успішно ініціалізовано.');
    } catch (error) {
        console.error('Критична помилка під час ініціалізації:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);