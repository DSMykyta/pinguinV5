// js/common/editor/editor-mode.js

/**
 * 🔒 ЯДРО — Перемикання режимів Text/Code
 */

/**
 * Ініціалізувати режими
 */
export function initEditorMode(state) {
    const { dom } = state;

    // Перезаписати setMode (code може бути вимкнений)
    state.setMode = (mode) => {
        if (!dom.codeEditor) return; // code: false — перемикання вимкнено
        if (mode === 'text') switchToTextMode(state);
        else if (mode === 'code') switchToCodeMode(state);
    };

    // Radio buttons
    dom.modeText?.addEventListener('change', () => {
        if (dom.modeText.checked) switchToTextMode(state);
    });

    dom.modeCode?.addEventListener('change', () => {
        if (dom.modeCode.checked) switchToCodeMode(state);
    });

    // Input події
    dom.editor?.addEventListener('input', () => {
        state.runHook('onInput');
        if (state.config.onChange) {
            state.config.onChange(state.getCleanHtml());
        }
    });

    dom.editor?.addEventListener('keydown', (e) => {
        state.runHook('onKeydown', e);
    });

    dom.editor?.addEventListener('keyup', () => {
        state.runHook('onInput');
    });

    dom.editor?.addEventListener('mouseup', () => {
        state.runHook('onInput');
    });

    dom.codeEditor?.addEventListener('input', () => {
        state.runHook('onValidate');
    });
}

function switchToTextMode(state) {
    if (state.currentMode === 'text') return;

    const { dom } = state;
    if (!dom.codeEditor) return;

    dom.editor.innerHTML = dom.codeEditor.value;
    dom.editor.classList.remove('u-hidden');
    dom.codeEditor.classList.add('u-hidden');

    enableToolbarButtons(dom.toolbar, true);
    state.currentMode = 'text';
    state.lastSavedContent = dom.editor.innerHTML;

    state.runHook('onModeChange', 'text');
    state.runHook('onValidate');
}

function switchToCodeMode(state) {
    if (state.currentMode === 'code') return;

    const { dom } = state;
    if (!dom.codeEditor) return;

    // Очистити підсвічування перед переключенням
    clearHighlights(dom.editor);

    dom.codeEditor.value = formatHtml(state.getCleanHtml());
    dom.editor.classList.add('u-hidden');
    dom.codeEditor.classList.remove('u-hidden');

    enableToolbarButtons(dom.toolbar, false);
    state.currentMode = 'code';

    state.runHook('onModeChange', 'code');
    state.runHook('onValidate');
}

function enableToolbarButtons(toolbar, enabled) {
    const buttons = toolbar?.querySelectorAll('.btn-icon[data-action]');
    buttons?.forEach(btn => {
        btn.disabled = !enabled;
        btn.classList.toggle('text-disabled', !enabled);
        if (!enabled) btn.classList.remove('active');
    });
}

function clearHighlights(editor) {
    if (!editor) return;
    editor.querySelectorAll('.highlight-error, .highlight-warning').forEach(el => {
        const parent = el.parentNode;
        while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
    });
    editor.normalize();
}

function formatHtml(html) {
    return html
        .replace(/>\s+</g, '><')
        .trim()
        .replace(/<\/p>/g, '</p>\n')
        .replace(/<\/h([1-6])>/g, '</h$1>\n')
        .replace(/<\/li>/g, '</li>\n')
        .replace(/<\/ul>/g, '</ul>\n')
        .replace(/<\/ol>/g, '</ol>\n')
        .replace(/<ul>/g, '<ul>\n')
        .replace(/<ol>/g, '<ol>\n');
}
