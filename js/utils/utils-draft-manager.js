// js/utils/utils-draft-manager.js

/*
╔══════════════════════════════════════════════════════════════════════════╗
║  DRAFT MANAGER — чернетки для модальних вікон                           ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Генерік менеджер чернеток: всі зміни локальні до commit().              ║
║                                                                          ║
║  📋 API:                                                                 ║
║  ├── init(items)         — створити чернетку (snapshot + draft)          ║
║  ├── remove(id)          — прибрати елемент з чернетки                   ║
║  ├── add(item)           — додати елемент в чернетку                     ║
║  ├── update(id, data)    — оновити елемент в чернетці                    ║
║  ├── getDraft()          — поточний стан чернетки                        ║
║  ├── hasPending()        — чи є незбережені зміни                        ║
║  ├── commit()            — зберегти всі зміни через API                  ║
║  └── discard()           — скинути все                                   ║
║                                                                          ║
║  🎯 Використання:                                                        ║
║  const draft = createDraftManager({                                      ║
║      getId: (item) => item.line_id,                                      ║
║      commitRemove: (id) => updateBrandLine(id, { brand_id: '' }),        ║
║      commitAdd: (item) => addBrandLine(item),                            ║
║      commitUpdate: (id, data) => updateBrandLine(id, data),              ║
║  });                                                                     ║
║  draft.init(lines);                                                      ║
║  draft.remove('line-000001');  // локально                               ║
║  await draft.commit();         // зберігає в API                         ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
*/

/**
 * Створити менеджер чернеток
 * @param {Object} config
 * @param {Function} config.getId — (item) => string — як отримати ID елемента
 * @param {Function} [config.commitRemove] — (id) => Promise — API видалення
 * @param {Function} [config.commitAdd] — (item) => Promise — API додавання
 * @param {Function} [config.commitUpdate] — (id, data) => Promise — API оновлення
 * @returns {Object} Draft manager API
 */
export function createDraftManager(config) {
    const { getId, commitRemove, commitAdd, commitUpdate } = config;

    let _draft = [];
    let _pendingRemoves = [];
    let _pendingAdds = [];
    let _pendingUpdates = {}; // { id: mergedData }

    /**
     * Створити чернетку зі списку елементів
     * @param {Array} items — вхідні дані (буде скопійовано)
     */
    function init(items) {
        _draft = (items || []).map(item => ({ ...item }));
        _pendingRemoves = [];
        _pendingAdds = [];
        _pendingUpdates = {};
    }

    /**
     * Прибрати елемент з чернетки (локально)
     * @param {string} id
     */
    function remove(id) {
        const existed = _draft.some(item => getId(item) === id);
        if (!existed) return;

        _draft = _draft.filter(item => getId(item) !== id);

        // Якщо це був pending add — просто прибрати з adds
        const addIdx = _pendingAdds.findIndex(item => getId(item) === id);
        if (addIdx !== -1) {
            _pendingAdds.splice(addIdx, 1);
            delete _pendingUpdates[id];
        } else {
            _pendingRemoves.push(id);
            delete _pendingUpdates[id];
        }
    }

    /**
     * Додати елемент в чернетку (локально)
     * @param {Object} item
     */
    function add(item) {
        const copy = { ...item };
        _draft.push(copy);
        _pendingAdds.push(copy);
    }

    /**
     * Оновити елемент в чернетці (локально)
     * @param {string} id
     * @param {Object} data — часткові оновлення
     */
    function update(id, data) {
        const item = _draft.find(item => getId(item) === id);
        if (!item) return;

        Object.assign(item, data);

        // Якщо це pending add — оновити в adds
        const addItem = _pendingAdds.find(a => getId(a) === id);
        if (addItem) {
            Object.assign(addItem, data);
        } else {
            _pendingUpdates[id] = { ...(_pendingUpdates[id] || {}), ...data };
        }
    }

    /**
     * Поточний стан чернетки
     * @returns {Array}
     */
    function getDraft() {
        return _draft;
    }

    /**
     * Чи є незбережені зміни
     * @returns {boolean}
     */
    function hasPending() {
        return _pendingRemoves.length > 0
            || _pendingAdds.length > 0
            || Object.keys(_pendingUpdates).length > 0;
    }

    /**
     * Зберегти всі pending зміни через API
     * @returns {Promise<void>}
     */
    async function commit() {
        const promises = [];

        if (commitRemove) {
            for (const id of _pendingRemoves) {
                promises.push(commitRemove(id));
            }
        }

        if (commitAdd) {
            for (const item of _pendingAdds) {
                promises.push(commitAdd(item));
            }
        }

        if (commitUpdate) {
            for (const [id, data] of Object.entries(_pendingUpdates)) {
                promises.push(commitUpdate(id, data));
            }
        }

        if (promises.length > 0) {
            await Promise.allSettled(promises);
        }

        _pendingRemoves = [];
        _pendingAdds = [];
        _pendingUpdates = {};
    }

    /**
     * Скинути все (при закритті без збереження)
     */
    function discard() {
        _draft = [];
        _pendingRemoves = [];
        _pendingAdds = [];
        _pendingUpdates = {};
    }

    return { init, remove, add, update, getDraft, hasPending, commit, discard };
}
