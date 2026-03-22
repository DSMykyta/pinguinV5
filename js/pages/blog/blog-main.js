// js/pages/blog/blog-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                           BLOG SYSTEM                                    ║
 * ║  Powered by Entity Engine — config-driven architecture                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createEntity } from '../../engine/entity-engine.js';
import config from '../../configs/blog.config.js';

const entity = createEntity(config);

export async function initBlog() {
    await entity.init();
}
