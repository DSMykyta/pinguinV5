// js/generators/generator-text/gte-main.js
import { registerPanelInitializer } from '../../panel/panel-right.js';
import { getTextDOM } from './gte-dom.js';
import { initFormattingButtons } from './gte-formatting.js';
import { initResultCards } from './gte-results.js';
import { initFindAndReplace } from './gte-find-replace.js';
import { initStats } from './gte-stats.js';
import { initTextReset } from './gte-reset.js';
import { initValidator } from './gte-validator.js';

function initTextGenerator() {
    const dom = getTextDOM();
    if (!dom.inputMarkup) return;

    initFormattingButtons();
    initResultCards();
    initFindAndReplace();
    initStats();
    initTextReset();
    initValidator();

    console.log('Генератор тексту успішно ініціалізовано.');
}

// Реєструємо наш запускач в системі правої панелі
registerPanelInitializer('aside-text', initTextGenerator);