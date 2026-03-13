// js/main-attributes-manager.js

import { initCore } from './main-core.js';
import { initAM } from './pages/attributes-manager/am-main.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initCore();
    await initAM();
});
