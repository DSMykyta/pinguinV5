// js/utils/utils-id.js

/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    ID UTILS — ГЕНЕРАЦІЯ ІДЕНТИФІКАТОРІВ                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  📋 Експорти:                                                            ║
 * ║  └── generateNextId(prefix, existingIds) → "prefix-000001"               ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Згенерувати наступний ID з авто-інкрементом
 *
 * @param {string} prefix - Префікс ID (наприклад 'task-', 'bran-', 'line-')
 * @param {string[]} existingIds - Масив існуючих ID
 * @returns {string} Новий ID у форматі prefix + 6 цифр (наприклад 'task-000001')
 */
export function generateNextId(prefix, existingIds) {
    let maxNum = 0;
    existingIds.forEach(id => {
        if (id && id.startsWith(prefix)) {
            const num = parseInt(id.replace(prefix, ''), 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });
    return `${prefix}${String(maxNum + 1).padStart(6, '0')}`;
}
