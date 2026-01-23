// js/generators/generator-highlight/ghl-main.js

import { registerPanelInitializer } from '../../panel/panel-right.js';
import { getHighlightDOM } from './ghl-dom.js';
import { initHighlighter } from './ghl-highlighter.js';
import { initValidator } from './ghl-validator.js';

function initHighlightGenerator() {
    const dom = getHighlightDOM();
    if (!dom.textarea) return;

    // Ініціалізація overlay структури
    initHighlighter();

    // Ініціалізація валідатора
    initValidator();
}

// Реєструємо ініціалізатор
registerPanelInitializer('aside-highlight', initHighlightGenerator);
