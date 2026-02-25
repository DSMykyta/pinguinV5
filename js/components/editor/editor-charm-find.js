// js/components/editor/editor-charm-find.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ✨ ШАРМ [tools] — Find & Replace                                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Пошук та масова заміна тексту (в text і code режимах).                  ║
 * ║  Активується тільки якщо config.showFindReplace = true.                  ║
 * ║  Можна видалити — редактор працюватиме без пошуку.                       ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export function init(state) {
    // Пропустити якщо Find & Replace вимкнено
    if (!state.config.showFindReplace) return;

    const { dom } = state;

    // Кнопка "Замінити все"
    dom.replaceAllBtn?.addEventListener('click', () => {
        findAndReplaceAll(state);
    });

    // Enter в полі пошуку
    dom.findInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            findAndReplaceAll(state);
        }
    });
}

function findAndReplaceAll(state) {
    const { dom } = state;
    const findText = dom.findInput?.value;
    if (!findText) return;

    const replaceText = dom.replaceInput?.value || '';

    // Зберегти стан для undo
    state.runHook('onWillChange');

    if (state.currentMode === 'text') {
        // Очистити підсвічування
        clearHighlights(state);

        let html = dom.editor.innerHTML;
        const escapedFind = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedFind, 'g');
        const count = (html.match(regex) || []).length;

        if (count === 0) {
            showMessage(`Текст "${findText}" не знайдено`);
            return;
        }

        html = html.split(findText).join(replaceText);
        dom.editor.innerHTML = html;

        state.lastSavedContent = state.getCleanHtml();
        state.runHook('onValidate');

        showMessage(`Замінено "${findText}" на "${replaceText}" (${count} разів)`);
        dom.editor.focus();
    } else {
        const text = dom.codeEditor.value;
        const escapedFind = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedFind, 'g');
        const count = (text.match(regex) || []).length;

        if (count === 0) {
            showMessage(`Текст "${findText}" не знайдено`);
            return;
        }

        dom.codeEditor.value = text.split(findText).join(replaceText);
        state.runHook('onValidate');

        showMessage(`Замінено "${findText}" на "${replaceText}" (${count} разів)`);
        dom.codeEditor.focus();
    }
}

function clearHighlights(state) {
    state.dom.editor?.querySelectorAll('.highlight-error, .highlight-warning').forEach(el => {
        const parent = el.parentNode;
        while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
    });
    state.dom.editor?.normalize();
}

function showMessage(text) {
    // Спробувати використати toast якщо доступний
    import('../ui-toast.js')
        .then(module => module.showToast(text, 'success'))
}
