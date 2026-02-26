// js/common/util-lazy-load.js

/**
 * Утиліта для відкладеного (lazy) завантаження даних.
 *
 * Дані завантажуються тільки при першому виклику load(),
 * повторні виклики повертають кешований результат.
 * Можна інвалідувати кеш через invalidate().
 *
 * @example
 *   const loader = createLazyLoader(() => fetch('/api/data').then(r => r.json()));
 *
 *   // Дані завантажаться тільки тут:
 *   const data = await loader.load();
 *
 *   // Повторний виклик — з кешу (миттєво):
 *   const same = await loader.load();
 *
 *   // Скинути кеш (наступний load() завантажить заново):
 *   loader.invalidate();
 */
export function createLazyLoader(loadFn) {
    let _data = null;
    let _promise = null;
    let _loaded = false;

    return {
        /**
         * Завантажити дані (lazy — тільки при першому виклику)
         * @returns {Promise<*>}
         */
        async load() {
            if (_loaded) return _data;

            // Якщо вже йде завантаження — чекаємо на нього (дедуплікація)
            if (_promise) return _promise;

            _promise = (async () => {
                try {
                    _data = await loadFn();
                    _loaded = true;
                    return _data;
                } finally {
                    _promise = null;
                }
            })();

            return _promise;
        },

        /**
         * Отримати дані синхронно (null якщо ще не завантажено)
         * @returns {*|null}
         */
        get() {
            return _data;
        },

        /**
         * Чи завантажено дані
         * @returns {boolean}
         */
        get loaded() {
            return _loaded;
        },

        /**
         * Скинути кеш — наступний load() завантажить заново
         */
        invalidate() {
            _data = null;
            _loaded = false;
            _promise = null;
        }
    };
}

/**
 * Створити кешовану функцію з автоматичною інвалідацією.
 * Результат кешується до виклику invalidate() або до зміни версії.
 *
 * @example
 *   const getLabels = createCachedFn(() => buildExpensiveLabelMap());
 *   getLabels();           // обчислює
 *   getLabels();           // з кешу
 *   getLabels.invalidate(); // скинути
 *   getLabels();           // обчислює заново
 */
export function createCachedFn(fn) {
    let _cache = undefined;
    let _valid = false;

    const cached = () => {
        if (_valid) return _cache;
        _cache = fn();
        _valid = true;
        return _cache;
    };

    cached.invalidate = () => {
        _cache = undefined;
        _valid = false;
    };

    cached.get = () => _cache;

    return cached;
}
