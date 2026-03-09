// js/pages/products/products-crud-variants-validation.js

/**
 * PRODUCTS CRUD — ВАЛІДАЦІЯ ВАРІАНТІВ
 *
 * Перевірка унікальності варіантів по name_ua/name_ru.
 * Два варіанти одного товару — дублікати, якщо їх name JSON ідентичні.
 */

import { getVariantsByProductId } from './variants-data.js';
import { getPendingVariants } from './products-crud-variant-pending.js';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Нормалізувати JSON-name для порівняння:
 * stringify з відсортованими ключами
 */
function normalizeNameJson(name) {
    if (!name) return '';
    const obj = typeof name === 'string' ? safeJsonParse(name) : name;
    if (!obj || typeof obj !== 'object') return String(name);
    const sorted = Object.keys(obj).sort().reduce((acc, k) => {
        acc[k] = String(obj[k]);
        return acc;
    }, {});
    return JSON.stringify(sorted);
}

function safeJsonParse(value) {
    if (!value || typeof value !== 'string') return null;
    try { return JSON.parse(value.trim()); } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Перевірити унікальність варіанту по name_ua
 *
 * @param {string} nameUa - JSON name_ua варіанту що зберігається
 * @param {string} productId - ID товару (може бути null для нових товарів)
 * @param {string|null} excludeId - variant_id або _pendingId поточного варіанту (щоб не порівнювати з собою)
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateVariantUniqueness(nameUa, productId, excludeId = null) {
    const currentName = normalizeNameJson(nameUa);
    if (!currentName) return { valid: true };

    // Збираємо всі варіанти: API + pending
    const apiVariants = productId ? getVariantsByProductId(productId) : [];
    const pendingVariants = getPendingVariants();

    const allVariants = [
        ...apiVariants.map(v => ({ id: v.variant_id, name_ua: v.name_ua })),
        ...pendingVariants.map(v => ({ id: v._pendingId, name_ua: v.name_ua })),
    ];

    for (const v of allVariants) {
        if (v.id === excludeId) continue;
        if (normalizeNameJson(v.name_ua) === currentName) {
            return { valid: false, message: 'Варіант з такою назвою вже існує' };
        }
    }

    return { valid: true };
}
