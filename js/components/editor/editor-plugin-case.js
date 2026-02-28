// js/components/editor/editor-plugin-case.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🔌 ПЛАГІН — Зміна регістру                                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  lowercase / UPPERCASE / Title Case для виділеного тексту.               ║
 * ║  Можна видалити — редактор працюватиме без зміни регістру.               ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export function init(state) {
    const { dom } = state;

    dom.toolbar?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn || state.currentMode !== 'text') return;

        const action = btn.dataset.action;

        switch (action) {
            case 'lowercase':
                convertCase(state, 'lowercase');
                break;
            case 'uppercase':
                convertCase(state, 'uppercase');
                break;
            case 'titlecase':
                convertCase(state, 'titlecase');
                break;
        }
    });
}

function convertCase(state, caseType) {
    state.dom.editor?.focus();

    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) return;

    state.runHook('onWillChange');

    const selectedText = selection.toString();
    let convertedText;

    switch (caseType) {
        case 'lowercase':
            convertedText = selectedText.toLowerCase();
            break;
        case 'uppercase':
            convertedText = selectedText.toUpperCase();
            break;
        case 'titlecase':
            convertedText = selectedText
                .toLowerCase()
                .replace(/(?:^|\s)\S/g, char => char.toUpperCase());
            break;
        default:
            convertedText = selectedText;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(convertedText));

    selection.removeAllRanges();
}
