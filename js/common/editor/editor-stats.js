// js/common/editor/editor-stats.js

/**
 * 🔌 ПЛАГІН — Статистика тексту
 *
 * Можна видалити — редактор працюватиме без статистики.
 * Активується тільки якщо config.showStats = true
 */

export function init(state) {
    // Пропустити якщо статистика вимкнена
    if (!state.config.showStats) return;

    // Оновлення статистики
    function updateStats() {
        const text = state.getPlainText();
        const charCount = text.length;
        const wordCount = (text.match(/\S+/g) || []).length;
        const readingTime = Math.ceil(wordCount / 200) || 0;

        const { dom } = state;
        if (dom.charCount) dom.charCount.textContent = charCount;
        if (dom.wordCount) dom.wordCount.textContent = wordCount;
        if (dom.readingTime) dom.readingTime.textContent = readingTime;
    }

    // Початкове оновлення
    updateStats();

    // Реєстрація на хуки
    state.registerHook('onInput', updateStats);
    state.registerHook('onValidate', updateStats);
    state.registerHook('onModeChange', updateStats);
}
