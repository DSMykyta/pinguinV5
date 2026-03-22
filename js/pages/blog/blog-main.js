// js/pages/blog/blog-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                           BLOG SYSTEM                                    ║
 * ║  Powered by Entity Engine — config-driven architecture                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createEntity } from '../../components/page/page-entity.js';
import config from '../../config/pages/blog.config.js';

const entity = createEntity(config);

export async function initBlog() {
    await entity.init();
}
