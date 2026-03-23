// js/pages/tasks/tasks-main.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                           TASKS SYSTEM                                  ║
 * ║  Powered by Entity Engine — config-driven architecture                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { createEntity } from '../../components/page/page-entity.js';
import config from '../../config/pages/tasks.config.js';

const entity = createEntity(config);

export async function initTasks() {
    await entity.init();
}
