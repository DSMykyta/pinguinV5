// js/pages/keywords/keywords-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    KEYWORDS - INITIALIZATION                             ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Powered by Entity Engine + custom CRUD (keywords-crud.js)              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createEntity } from '../../components/page/page-entity.js';
import config from '../../config/pages/keywords.config.js';

const entity = createEntity(config);

// Export data layer for keywords-crud.js to use
export const keywordsData = entity.data;
export const keywordsState = entity.state;

export async function initKeywords() {
    await entity.init();
}
