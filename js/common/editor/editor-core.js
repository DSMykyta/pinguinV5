// js/common/editor/editor-core.js

/**
 * Ядро логіки редактора
 */

import { debounce } from '../../utils/common-utils.js';

/**
 * Ініціалізувати логіку редактора
 * @param {string} id - Унікальний ID
 * @param {HTMLElement} container - Контейнер
 * @param {Object} config - Конфігурація
 * @returns {Object} API
 */
export function initEditorCore(id, container, config) {
    // ═══════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════

    let currentMode = 'text';
    let undoStack = [];
    let redoStack = [];
    let lastSavedContent = '';
    let skipCaretRestore = false;

    // DOM Elements
    const dom = {
        editor: container.querySelector(`#${id}-editor`),
        codeEditor: container.querySelector(`#${id}-code-editor`),
        toolbar: container.querySelector(`#${id}-toolbar`),
        modeText: container.querySelector(`#${id}-mode-text`),
        modeCode: container.querySelector(`#${id}-mode-code`),
        validationResults: container.querySelector(`#${id}-validation-results`),
        findInput: container.querySelector(`#${id}-find-input`),
        replaceInput: container.querySelector(`#${id}-replace-input`),
        replaceAllBtn: container.querySelector(`#${id}-replace-all-btn`),
        charCount: container.querySelector(`#${id}-char-count`),
        wordCount: container.querySelector(`#${id}-word-count`),
        readingTime: container.querySelector(`#${id}-reading-time`),
    };

    // ═══════════════════════════════════════════════════════════════════════
    // VALIDATION (опціонально)
    // ═══════════════════════════════════════════════════════════════════════

    let validationRegex = null;
    let bannedWordsData = [];

    async function initValidation() {
        if (!config.validation) return;

        try {
            const { loadBannedWords, getBannedWords } = await import('../../banned-words/banned-words-data.js');
            await loadBannedWords();
            bannedWordsData = getBannedWords();
            buildValidationRegex();
        } catch (e) {
            console.warn('[Editor] Validation module not available:', e.message);
        }
    }

    function buildValidationRegex() {
        if (!bannedWordsData || bannedWordsData.length === 0) {
            validationRegex = null;
            return;
        }

        const words = bannedWordsData.map(item => item.word).filter(w => w);
        if (words.length === 0) {
            validationRegex = null;
            return;
        }

        const escapedWords = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const pattern = `\\b(${escapedWords.join('|')})\\b`;
        validationRegex = new RegExp(pattern, 'gi');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UNDO/REDO
    // ═══════════════════════════════════════════════════════════════════════

    function saveUndoState() {
        if (currentMode !== 'text' || !dom.editor) return;

        const currentContent = dom.editor.innerHTML;
        if (currentContent === lastSavedContent) return;

        undoStack.push({
            content: lastSavedContent,
            caretPosition: saveCaretPosition()
        });

        if (undoStack.length > 50) undoStack.shift();
        redoStack = [];
        lastSavedContent = currentContent;
    }

    function undo() {
        if (undoStack.length === 0 || currentMode !== 'text') return;

        const state = undoStack.pop();
        redoStack.push({
            content: dom.editor.innerHTML,
            caretPosition: saveCaretPosition()
        });

        dom.editor.innerHTML = state.content;
        lastSavedContent = state.content;

        if (state.caretPosition) {
            restoreCaretPosition(state.caretPosition);
        }

        validateAndHighlight();
    }

    function redo() {
        if (redoStack.length === 0 || currentMode !== 'text') return;

        const state = redoStack.pop();
        undoStack.push({
            content: dom.editor.innerHTML,
            caretPosition: saveCaretPosition()
        });

        dom.editor.innerHTML = state.content;
        lastSavedContent = state.content;

        if (state.caretPosition) {
            restoreCaretPosition(state.caretPosition);
        }

        validateAndHighlight();
    }

    function saveCaretPosition() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return null;

        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(dom.editor);
        preCaretRange.setEnd(range.startContainer, range.startOffset);

        return {
            start: preCaretRange.toString().length,
            end: preCaretRange.toString().length + range.toString().length
        };
    }

    function restoreCaretPosition(pos) {
        if (!pos || !dom.editor) return;

        try {
            const range = document.createRange();
            const selection = window.getSelection();

            let charCount = 0;
            let startNode = null;
            let startOffset = 0;

            const walker = document.createTreeWalker(dom.editor, NodeFilter.SHOW_TEXT);

            while (walker.nextNode()) {
                const node = walker.currentNode;
                const nodeLength = node.textContent.length;

                if (!startNode && charCount + nodeLength >= pos.start) {
                    startNode = node;
                    startOffset = pos.start - charCount;
                }

                charCount += nodeLength;
            }

            if (startNode) {
                range.setStart(startNode, Math.min(startOffset, startNode.textContent.length));
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        } catch (e) {
            // Ignore caret restoration errors
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MODE SWITCHING
    // ═══════════════════════════════════════════════════════════════════════

    function switchToTextMode() {
        if (currentMode === 'text') return;

        dom.editor.innerHTML = dom.codeEditor.value;
        dom.editor.style.display = '';
        dom.codeEditor.style.display = 'none';

        enableFormatButtons(true);
        currentMode = 'text';

        lastSavedContent = dom.editor.innerHTML;
        undoStack = [];
        redoStack = [];

        validateAndHighlight();
    }

    function switchToCodeMode() {
        if (currentMode === 'code') return;

        clearHighlights();
        dom.codeEditor.value = formatHtmlCode(getCleanHtml());

        dom.editor.style.display = 'none';
        dom.codeEditor.style.display = '';

        enableFormatButtons(false);
        currentMode = 'code';

        validateOnly();
    }

    function enableFormatButtons(enabled) {
        const buttons = dom.toolbar?.querySelectorAll('.btn-icon[data-action]');
        buttons?.forEach(btn => {
            btn.disabled = !enabled;
            btn.classList.toggle('text-disabled', !enabled);
            if (!enabled) btn.classList.remove('active');
        });
    }

    function formatHtmlCode(html) {
        let formatted = html.replace(/>\s+</g, '><').trim();

        formatted = formatted
            .replace(/<\/p>/g, '</p>\n')
            .replace(/<\/h([1-6])>/g, '</h$1>\n')
            .replace(/<\/li>/g, '</li>\n')
            .replace(/<\/ul>/g, '</ul>\n')
            .replace(/<\/ol>/g, '</ol>\n')
            .replace(/<ul>/g, '<ul>\n')
            .replace(/<ol>/g, '<ol>\n');

        return formatted;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FORMATTING
    // ═══════════════════════════════════════════════════════════════════════

    function wrapSelection(tagName) {
        if (currentMode !== 'text') return;
        dom.editor?.focus();

        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        saveUndoState();

        const range = selection.getRangeAt(0);

        let node = selection.anchorNode;
        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentNode;
        }
        const parentTag = node?.closest?.(tagName);

        if (parentTag && dom.editor.contains(parentTag)) {
            const parent = parentTag.parentNode;
            while (parentTag.firstChild) {
                parent.insertBefore(parentTag.firstChild, parentTag);
            }
            parent.removeChild(parentTag);
            parent.normalize();
        } else if (!range.collapsed) {
            const wrapper = document.createElement(tagName);
            wrapper.appendChild(range.extractContents());
            range.insertNode(wrapper);

            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(wrapper);
            selection.addRange(newRange);
        }

        updateToolbarState();
    }

    function toggleHeading(tag) {
        if (currentMode !== 'text') return;
        dom.editor?.focus();

        saveUndoState();

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

        updateToolbarState();
    }

    function execFormat(command) {
        if (currentMode !== 'text') return;
        dom.editor?.focus();
        saveUndoState();
        document.execCommand(command, false, null);
        updateToolbarState();
    }

    function convertCase(caseType) {
        if (currentMode !== 'text') return;
        dom.editor?.focus();

        const selection = window.getSelection();
        if (!selection.rangeCount || selection.isCollapsed) return;

        saveUndoState();

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

    function updateToolbarState() {
        if (currentMode !== 'text') return;

        const isInTag = (tagName) => {
            const selection = window.getSelection();
            if (!selection.rangeCount) return false;

            let node = selection.anchorNode;
            while (node && node !== dom.editor) {
                if (node.nodeName?.toLowerCase() === tagName.toLowerCase()) return true;
                node = node.parentNode;
            }
            return false;
        };

        dom.toolbar?.querySelector('[data-action="bold"]')?.classList.toggle('active', isInTag('strong'));
        dom.toolbar?.querySelector('[data-action="italic"]')?.classList.toggle('active', isInTag('em'));

        try {
            const block = document.queryCommandValue('formatBlock').toLowerCase();
            dom.toolbar?.querySelector('[data-action="h1"]')?.classList.toggle('active', block === 'h1');
            dom.toolbar?.querySelector('[data-action="h2"]')?.classList.toggle('active', block === 'h2');
            dom.toolbar?.querySelector('[data-action="h3"]')?.classList.toggle('active', block === 'h3');
        } catch (e) {}

        dom.toolbar?.querySelector('[data-action="list"]')?.classList.toggle('active', document.queryCommandState('insertUnorderedList'));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // VALIDATION & HIGHLIGHTING
    // ═══════════════════════════════════════════════════════════════════════

    function getCleanHtml() {
        if (!dom.editor) return '';

        const clone = dom.editor.cloneNode(true);
        clone.querySelectorAll('.highlight-error, .highlight-warning').forEach(el => {
            const parent = el.parentNode;
            while (el.firstChild) {
                parent.insertBefore(el.firstChild, el);
            }
            parent.removeChild(el);
        });

        return clone.innerHTML;
    }

    function getPlainText() {
        const html = currentMode === 'text' ? getCleanHtml() : dom.codeEditor?.value || '';
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || '';
    }

    function clearHighlights() {
        if (!dom.editor) return;

        dom.editor.querySelectorAll('.highlight-error, .highlight-warning').forEach(el => {
            const parent = el.parentNode;
            while (el.firstChild) {
                parent.insertBefore(el.firstChild, el);
            }
            parent.removeChild(el);
        });

        dom.editor.normalize();
    }

    function validateOnly() {
        if (!config.validation || !dom.validationResults) return;

        const text = getPlainText();
        const wordCounts = new Map();
        let bannedCount = 0;

        if (validationRegex && text) {
            validationRegex.lastIndex = 0;
            let match;
            while ((match = validationRegex.exec(text)) !== null) {
                if (match[1]) {
                    const word = match[1].toLowerCase();
                    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
                    bannedCount++;
                }
            }
        }

        displayValidationResults(wordCounts, bannedCount);
        updateStats();

        if (config.onValidate) {
            config.onValidate({ wordCounts, bannedCount });
        }
    }

    function validateAndHighlight() {
        validateOnly();

        if (currentMode === 'text' && config.validation) {
            applyHighlights();
        }
    }

    function applyHighlights() {
        if (!dom.editor || !validationRegex) return;

        clearHighlights();

        const walker = document.createTreeWalker(dom.editor, NodeFilter.SHOW_TEXT);
        const textNodes = [];

        while (walker.nextNode()) {
            textNodes.push(walker.currentNode);
        }

        textNodes.forEach(textNode => {
            const text = textNode.textContent;
            validationRegex.lastIndex = 0;

            const matches = [];
            let match;
            while ((match = validationRegex.exec(text)) !== null) {
                matches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    word: match[0]
                });
            }

            if (matches.length === 0) return;

            const fragment = document.createDocumentFragment();
            let lastIndex = 0;

            matches.forEach(m => {
                if (m.start > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, m.start)));
                }

                const span = document.createElement('span');
                span.className = 'highlight-error';
                span.textContent = m.word;
                fragment.appendChild(span);

                lastIndex = m.end;
            });

            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }

            textNode.parentNode.replaceChild(fragment, textNode);
        });
    }

    function displayValidationResults(wordCounts, bannedCount) {
        if (!dom.validationResults) return;

        if (bannedCount > 0) {
            const chips = [];
            const sortedEntries = Array.from(wordCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

            for (const [word, count] of sortedEntries) {
                chips.push(`<span class="chip chip-error chip-nav" data-banned-word="${word}">${word} (${count})</span>`);
            }

            dom.validationResults.innerHTML = chips.join(' ');
            dom.validationResults.classList.add('has-errors');
        } else {
            dom.validationResults.innerHTML = '';
            dom.validationResults.classList.remove('has-errors');
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STATS
    // ═══════════════════════════════════════════════════════════════════════

    function updateStats() {
        if (!config.showStats) return;

        const text = getPlainText();
        const charCount = text.length;
        const words = text.trim().split(/\s+/).filter(w => w);
        const wordCount = words.length;
        const readingTime = Math.ceil(wordCount / 200);

        if (dom.charCount) dom.charCount.textContent = charCount;
        if (dom.wordCount) dom.wordCount.textContent = wordCount;
        if (dom.readingTime) dom.readingTime.textContent = readingTime;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FIND & REPLACE
    // ═══════════════════════════════════════════════════════════════════════

    function findAndReplaceAll() {
        if (!dom.findInput || !dom.replaceInput) return;

        const findText = dom.findInput.value;
        const replaceText = dom.replaceInput.value;

        if (!findText) return;

        saveUndoState();

        if (currentMode === 'text') {
            dom.editor.innerHTML = dom.editor.innerHTML.split(findText).join(replaceText);
        } else {
            dom.codeEditor.value = dom.codeEditor.value.split(findText).join(replaceText);
        }

        validateAndHighlight();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ENTER HANDLING
    // ═══════════════════════════════════════════════════════════════════════

    function insertParagraphAndFocus() {
        const selection = window.getSelection();
        if (!selection.rangeCount) {
            const newParagraph = document.createElement('p');
            newParagraph.appendChild(document.createElement('br'));
            dom.editor.appendChild(newParagraph);
            const newRange = document.createRange();
            newRange.setStart(newParagraph, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            dom.editor.focus();
            return;
        }

        const range = selection.getRangeAt(0);
        let container = range.startContainer;
        let offset = range.startOffset;

        if (!range.collapsed) {
            range.deleteContents();
            container = range.startContainer;
            offset = range.startOffset;
        }

        let currentBlock = container;
        if (currentBlock.nodeType === Node.TEXT_NODE) {
            currentBlock = currentBlock.parentNode;
        }

        while (currentBlock && currentBlock !== dom.editor && !['P', 'H1', 'H2', 'H3', 'LI'].includes(currentBlock.nodeName)) {
            currentBlock = currentBlock.parentNode;
        }

        const newParagraph = document.createElement('p');

        if (currentBlock && currentBlock !== dom.editor) {
            const afterRange = document.createRange();
            afterRange.setStart(container, offset);
            afterRange.setEndAfter(currentBlock.lastChild || currentBlock);

            const afterContent = afterRange.extractContents();

            if (currentBlock.nextSibling) {
                currentBlock.parentNode.insertBefore(newParagraph, currentBlock.nextSibling);
            } else {
                currentBlock.parentNode.appendChild(newParagraph);
            }

            if (afterContent.textContent || afterContent.querySelector('*')) {
                newParagraph.appendChild(afterContent);
            } else {
                newParagraph.appendChild(document.createElement('br'));
            }

            if (!currentBlock.textContent && !currentBlock.querySelector('br')) {
                currentBlock.appendChild(document.createElement('br'));
            }
        } else {
            newParagraph.appendChild(document.createElement('br'));
            dom.editor.appendChild(newParagraph);
        }

        dom.editor.focus();

        const newRange = document.createRange();
        newRange.setStart(newParagraph, 0);
        newRange.collapse(true);

        selection.removeAllRanges();
        selection.addRange(newRange);
    }

    function insertLineBreak() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        range.deleteContents();

        const br = document.createElement('br');
        range.insertNode(br);

        const newRange = document.createRange();
        newRange.setStartAfter(br);
        newRange.collapse(true);

        selection.removeAllRanges();
        selection.addRange(newRange);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PASTE HANDLING
    // ═══════════════════════════════════════════════════════════════════════

    function handlePaste(e) {
        e.preventDefault();

        const clipboardData = e.clipboardData || window.clipboardData;
        let pastedData = clipboardData.getData('text/html') || clipboardData.getData('text/plain');

        // Очистити небажані теги
        const temp = document.createElement('div');
        temp.innerHTML = pastedData;

        // Видалити скрипти, стилі, коментарі
        temp.querySelectorAll('script, style, meta, link').forEach(el => el.remove());

        // Залишити тільки дозволені теги
        const allowedTags = ['P', 'H1', 'H2', 'H3', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'BR', 'A'];

        function cleanNode(node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (!allowedTags.includes(node.tagName)) {
                    const fragment = document.createDocumentFragment();
                    while (node.firstChild) {
                        fragment.appendChild(node.firstChild);
                    }
                    node.parentNode.replaceChild(fragment, node);
                }
            }
        }

        const walker = document.createTreeWalker(temp, NodeFilter.SHOW_ELEMENT);
        const nodesToClean = [];
        while (walker.nextNode()) {
            nodesToClean.push(walker.currentNode);
        }
        nodesToClean.reverse().forEach(cleanNode);

        saveUndoState();

        const selection = window.getSelection();
        if (selection.rangeCount) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(temp);
        }

        validateAndHighlight();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EVENT LISTENERS
    // ═══════════════════════════════════════════════════════════════════════

    function setupEventListeners() {
        const debouncedValidate = debounce(validateAndHighlight, 500);
        const debouncedSaveUndo = debounce(saveUndoState, 300);

        // Editor input
        dom.editor?.addEventListener('input', () => {
            debouncedSaveUndo();
            debouncedValidate();
            if (config.onChange) config.onChange(getCleanHtml());
        });

        // Keyboard shortcuts
        dom.editor?.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                undo();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
                e.preventDefault();
                redo();
                return;
            }
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveUndoState();
                insertParagraphAndFocus();
                return;
            }
            if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                saveUndoState();
                insertLineBreak();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                wrapSelection('strong');
            }
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                wrapSelection('em');
            }
        });

        dom.editor?.addEventListener('keyup', updateToolbarState);
        dom.editor?.addEventListener('mouseup', updateToolbarState);
        dom.editor?.addEventListener('paste', handlePaste);

        // Code editor input
        dom.codeEditor?.addEventListener('input', debounce(validateOnly, 300));

        // Toolbar buttons
        dom.toolbar?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;

            const action = btn.dataset.action;
            switch (action) {
                case 'bold': wrapSelection('strong'); break;
                case 'italic': wrapSelection('em'); break;
                case 'h1': toggleHeading('h1'); break;
                case 'h2': toggleHeading('h2'); break;
                case 'h3': toggleHeading('h3'); break;
                case 'list': execFormat('insertUnorderedList'); break;
                case 'lowercase': convertCase('lowercase'); break;
                case 'uppercase': convertCase('uppercase'); break;
                case 'titlecase': convertCase('titlecase'); break;
            }
        });

        dom.toolbar?.addEventListener('mousedown', (e) => {
            if (e.target.closest('.btn-icon')) e.preventDefault();
        });

        // Mode switching
        dom.modeText?.addEventListener('change', () => {
            if (dom.modeText.checked) switchToTextMode();
        });
        dom.modeCode?.addEventListener('change', () => {
            if (dom.modeCode.checked) switchToCodeMode();
        });

        // Find & Replace
        dom.replaceAllBtn?.addEventListener('click', findAndReplaceAll);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════

    async function init() {
        setupEventListeners();

        if (config.validation) {
            await initValidation();
        }

        if (config.initialValue) {
            dom.editor.innerHTML = config.initialValue;
            lastSavedContent = config.initialValue;
        }

        validateAndHighlight();
    }

    init();

    // ═══════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════

    return {
        getValue: () => currentMode === 'text' ? getCleanHtml() : dom.codeEditor?.value || '',
        setValue: (html) => {
            if (currentMode === 'text') {
                dom.editor.innerHTML = html || '';
                lastSavedContent = html || '';
            } else {
                dom.codeEditor.value = html || '';
            }
            validateAndHighlight();
        },
        getPlainText,
        getMode: () => currentMode,
        setMode: (mode) => {
            if (mode === 'text') switchToTextMode();
            else if (mode === 'code') switchToCodeMode();
        },
        focus: () => {
            if (currentMode === 'text') dom.editor?.focus();
            else dom.codeEditor?.focus();
        },
        clear: () => {
            dom.editor.innerHTML = '';
            dom.codeEditor.value = '';
            lastSavedContent = '';
            undoStack = [];
            redoStack = [];
            validateAndHighlight();
        },
        validate: validateAndHighlight,
        destroy: () => {
            container.innerHTML = '';
        },
        // Для зовнішнього доступу до DOM
        getDOM: () => dom,
        // Для оновлення регекспу валідації
        updateValidation: buildValidationRegex
    };
}
