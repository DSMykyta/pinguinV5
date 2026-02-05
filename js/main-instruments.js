// js/main-instruments.js
import { initCore } from './main-core.js';

// Імпортуємо головні файли генераторів, щоб їхній код виконав реєстрацію
import './generators/generator-table/gt-main.js';
import './generators/generator-seo/gse-main.js'
import './generators/generator-link/gln-main.js';
import './generators/generator-translate/gtr-main.js';
import './generators/generator-image/gim-main.js';
import './generators/generator-highlight/ghl-main.js';

async function initializeApp() {
    try {
        initCore(); // initCore має запускати initPanelRight
    } catch (error) {
        console.error('Критична помилка під час ініціалізації:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);