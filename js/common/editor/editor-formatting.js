// js/common/editor/editor-formatting.js

/**
 * 🔌 ПЛАГІН — Bold, Italic, H1-H3, List
 *
 * Можна видалити — редактор працюватиме без форматування.
 */

export function init(state) {
    const { dom } = state;

    // Клік на кнопки тулбара
    dom.toolbar?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn || state.currentMode !== 'text') return;

        const action = btn.dataset.action;

        switch (action) {
            case 'bold':
                wrapSelection(state, 'strong');
                break;
            case 'italic':
                wrapSelection(state, 'em');
                break;
            case 'h1':
                toggleHeading(state, 'h1');
                break;
            case 'h2':
                toggleHeading(state, 'h2');
                break;
            case 'h3':
                toggleHeading(state, 'h3');
                break;
            case 'list':
                execCommand('insertUnorderedList');
                break;
        }
    });

    // Prevent focus loss
    dom.toolbar?.addEventListener('mousedown', (e) => {
        if (e.target.closest('.btn-icon')) e.preventDefault();
    });

    // Keyboard shortcuts
    state.registerHook('onKeydown', (e) => {
        if (state.currentMode !== 'text') return;

        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            wrapSelection(state, 'strong');
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'i') {
            e.preventDefault();
            wrapSelection(state, 'em');
        }
    });

    // Update toolbar state
    state.registerHook('onInput', () => updateToolbarState(state));
}

function wrapSelection(state, tagName) {
    state.dom.editor?.focus();
    state.runHook('onBeforeChange');

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);

    let node = selection.anchorNode;
    if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
    }
    const parentTag = node?.closest?.(tagName);

    if (parentTag && state.dom.editor.contains(parentTag)) {
        // Unwrap
        const parent = parentTag.parentNode;
        while (parentTag.firstChild) {
            parent.insertBefore(parentTag.firstChild, parentTag);
        }
        parent.removeChild(parentTag);
        parent.normalize();
    } else if (!range.collapsed) {
        // Wrap
        const wrapper = document.createElement(tagName);
        wrapper.appendChild(range.extractContents());
        range.insertNode(wrapper);

        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(wrapper);
        selection.addRange(newRange);
    }

    updateToolbarState(state);
}

function toggleHeading(state, tag) {
    state.dom.editor?.focus();
    state.runHook('onBeforeChange');

    try {
        const currentBlock = document.queryCommandValue('formatBlock').toLowerCase();
        if (currentBlock === tag.toLowerCase()) {
            document.execCommand('formatBlock', false, '<p>');
        } else {
            document.execCommand('formatBlock', false, `<${tag}>`);
        }
    } catch (e) {
        document.execCommand('formatBlock', false, `<${tag}>`);
    }

    updateToolbarState(state);
}

function execCommand(command) {
    document.execCommand(command, false, null);
}

function updateToolbarState(state) {
    if (state.currentMode !== 'text') return;

    const { toolbar, editor } = state.dom;
    if (!toolbar || !editor) return;

    const isInTag = (tagName) => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return false;

        let node = selection.anchorNode;
        while (node && node !== editor) {
            if (node.nodeName?.toLowerCase() === tagName.toLowerCase()) return true;
            node = node.parentNode;
        }
        return false;
    };

    toolbar.querySelector('[data-action="bold"]')?.classList.toggle('active', isInTag('strong'));
    toolbar.querySelector('[data-action="italic"]')?.classList.toggle('active', isInTag('em'));

    try {
        const block = document.queryCommandValue('formatBlock').toLowerCase();
        toolbar.querySelector('[data-action="h1"]')?.classList.toggle('active', block === 'h1');
        toolbar.querySelector('[data-action="h2"]')?.classList.toggle('active', block === 'h2');
        toolbar.querySelector('[data-action="h3"]')?.classList.toggle('active', block === 'h3');
    } catch (e) {}

    toolbar.querySelector('[data-action="list"]')?.classList.toggle('active', document.queryCommandState('insertUnorderedList'));
}
