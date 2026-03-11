// js/pages/mapper/mapper-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - DATA MANAGEMENT                              ║
 * ║                   (Backward Compat Re-export Hub)                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Реекспортує з нового спільного data layer (js/data/).
 * Зберігає сумісність з існуючими імпортерами.
 *
 * Нові модулі:
 *   js/data/data-helpers.js      — конфіг аркушів, hard delete, утиліти
 *   js/data/entities-data.js     — CRUD для категорій, характеристик, опцій
 *   js/data/marketplaces-data.js — CRUD для маркетплейсів
 *   js/data/mp-data.js           — Load MP сутностей
 *   js/data/mappings-data.js     — CRUD маппінгів, autoMap, batch операції
 */

export * from '../../data/data-helpers.js';
export * from '../../data/entities-data.js';
export * from '../../data/marketplaces-data.js';
export * from '../../data/mp-data.js';
export * from '../../data/mappings-data.js';

// Backward compat: loadMapperData = loadAllEntities + loadMarketplaces
import { loadAllEntities } from '../../data/entities-data.js';
import { loadMarketplaces } from '../../data/marketplaces-data.js';

export async function loadMapperData() {
    await Promise.allSettled([
        loadAllEntities(),
        loadMarketplaces()
    ]);
}
