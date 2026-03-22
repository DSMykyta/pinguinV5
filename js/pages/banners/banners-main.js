// js/pages/banners/banners-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                         BANNERS SYSTEM                                   ║
 * ║  Powered by Entity Engine — config-driven architecture                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createEntity } from '../../components/page/page-entity.js';
import config from '../../config/pages/banners.config.js';

const entity = createEntity(config);

export async function initBanners() {
    await entity.init();
}
