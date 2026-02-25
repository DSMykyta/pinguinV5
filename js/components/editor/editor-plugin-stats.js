// js/common/editor/editor-stats.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🔌 ПЛАГІН — Статистика тексту                                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Символи / слова / час читання в футері редактора.                       ║
 * ║  Активується тільки якщо config.showStats = true.                        ║
 * ║  Можна видалити — редактор працюватиме без статистики.                   ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
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
    state.registerHook('onInput', updateStats, { plugin: 'stats' });
    state.registerHook('onValidate', updateStats, { plugin: 'stats' });
    state.registerHook('onModeChange', updateStats, { plugin: 'stats' });
}
