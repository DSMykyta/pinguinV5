// js/pages/redirect-target/redirect-target-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                     REDIRECT TARGET SYSTEM                               ║
 * ║  Powered by Entity Engine — config-driven architecture                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createEntity } from '../../engine/entity-engine.js';
import config from '../../configs/redirect-target.config.js';

const entity = createEntity(config);

export async function initRedirectTarget() {
    await entity.init();
}
