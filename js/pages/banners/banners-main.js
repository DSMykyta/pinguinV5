// js/pages/banners/banners-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         BANNERS SYSTEM                                   ║
 * ║  Powered by Entity Engine — config-driven architecture                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createEntity } from '../../engine/entity-engine.js';
import config from '../../configs/banners.config.js';

const entity = createEntity(config);

export async function initBanners() {
    await entity.init();
}
