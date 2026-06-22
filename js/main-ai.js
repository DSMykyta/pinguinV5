// js/main-ai.js

/*
 * MAIN - AI
 * Standalone entry point for the AI product-content workspace.
 */

import { initCore } from './main-core.js';
import { initAiMagicPage } from './generators/generator-ai-magic/aim-main.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initCore();
    initAiMagicPage();
});
