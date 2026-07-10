// js/pages/marketplaces/marketplaces-crud-utils.js

/**
 * Спільні перетворення даних для секцій CRUD-модалки маркетплейсу.
 */

/**
 * Отримати значення стандартного поля з MP об'єкта через column_mapping
 */
export function resolveMpField(obj, standardField, entityMapping) {
    if (!obj || typeof obj !== 'object') return undefined;

    if (entityMapping && entityMapping[standardField]) {
        const mpFieldName = entityMapping[standardField];
        if (obj[mpFieldName] !== undefined && obj[mpFieldName] !== '') {
            return obj[mpFieldName];
        }
    }

    if (obj[standardField] !== undefined && obj[standardField] !== '') {
        return obj[standardField];
    }

    return undefined;
}

export function extractMpName(obj, entityMapping) {
    if (!obj || typeof obj !== 'object') return '';

    const mapped = resolveMpField(obj, 'name', entityMapping);
    if (mapped) return mapped;

    if (obj.name_ua) return obj.name_ua;
    if (obj.nameUa) return obj.nameUa;
    if (obj.titleUk) return obj.titleUk;
    if (obj.titleRu) return obj.titleRu;
    if (obj.name) return obj.name;
    if (obj.name_ru) return obj.name_ru;
    if (obj.nameRu) return obj.nameRu;
    const nameKey = Object.keys(obj).find(k => {
        const lower = k.toLowerCase();
        return lower.includes('name') || lower.includes('title');
    });
    return nameKey ? obj[nameKey] : '';
}

/**
 * Синтезувати відсутніх батьків з path-полів.
 */
export function synthesizeMissingParents(data, catMapping, dataSet, byJsonId) {
    if (!data.length) return;

    let orphanCount = 0;
    let totalWithParent = 0;
    data.forEach(item => {
        const rawParent = resolveMpField(item, 'parent_id', catMapping)
            ?? item.parentId ?? item.parent_id ?? '';
        const parentId = rawParent === 0 || rawParent === '0' || rawParent === null ? '' : String(rawParent);
        if (parentId) {
            totalWithParent++;
            if (!dataSet.has(parentId)) orphanCount++;
        }
    });

    if (!totalWithParent || orphanCount / totalWithParent < 0.3) return;

    let pathField = null;
    const pathCandidates = ['parentsPathUa', 'parentsPath', 'path', 'breadcrumb', 'categoryPath'];
    for (const item of data.slice(0, 5)) {
        for (const field of pathCandidates) {
            if (item[field] && typeof item[field] === 'string' && item[field].includes('/')) {
                pathField = field;
                break;
            }
        }
        if (pathField) break;
    }
    if (!pathField) return;

    const pathToId = new Map();

    data.forEach(item => {
        const path = item[pathField];
        if (!path) return;
        const segments = path.split(/\s*\/\s*/);
        if (segments.length < 2) return;

        const itemId = String(item._jsonId || item.external_id || '');
        if (itemId) {
            const itemPath = segments.join(' / ');
            if (!pathToId.has(itemPath)) pathToId.set(itemPath, itemId);
        }

        const rawParent = resolveMpField(item, 'parent_id', catMapping)
            ?? item.parentId ?? item.parent_id ?? '';
        const parentId = rawParent === 0 || rawParent === '0' || rawParent === null ? '' : String(rawParent);
        if (parentId && segments.length >= 2) {
            const parentPath = segments.slice(0, -1).join(' / ');
            if (!pathToId.has(parentPath)) {
                pathToId.set(parentPath, parentId);
            }
        }
    });

    const synthetics = new Map();

    data.forEach(item => {
        const path = item[pathField];
        if (!path) return;
        const segments = path.split(/\s*\/\s*/);
        if (segments.length < 2) return;

        for (let i = 0; i < segments.length - 1; i++) {
            const currentPath = segments.slice(0, i + 1).join(' / ');
            const parentPath = i > 0 ? segments.slice(0, i).join(' / ') : null;

            let currentId = pathToId.get(currentPath);
            if (!currentId) {
                currentId = `_path:${currentPath}`;
                pathToId.set(currentPath, currentId);
            }

            if (dataSet.has(String(currentId)) || synthetics.has(String(currentId))) continue;

            let synthParentId = '';
            if (parentPath) {
                synthParentId = pathToId.get(parentPath) || `_path:${parentPath}`;
                if (!pathToId.has(parentPath)) pathToId.set(parentPath, synthParentId);
            }

            synthetics.set(String(currentId), {
                _jsonId: String(currentId),
                _synthetic: true,
                parentId: synthParentId,
                nameUa: segments[i],
                name: segments[i],
            });
        }
    });

    synthetics.forEach((item, id) => {
        dataSet.add(id);
        byJsonId.set(id, item);
        data.push(item);
    });
}

