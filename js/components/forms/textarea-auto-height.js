const MIN_TEXTAREA_HEIGHT = 40;
const initializedTextareas = new WeakSet();

export function syncTextareaHeight(textarea) {
    if (!(textarea instanceof HTMLTextAreaElement)) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, MIN_TEXTAREA_HEIGHT)}px`;
}

export function enableTextareaAutoHeight(textarea) {
    if (!(textarea instanceof HTMLTextAreaElement)) return;

    textarea.dataset.autoHeight = '';

    if (!initializedTextareas.has(textarea)) {
        initializedTextareas.add(textarea);
        textarea.addEventListener('input', () => syncTextareaHeight(textarea));
    }

    syncTextareaHeight(textarea);

    // Programmatic values can be assigned immediately after the field is created.
    requestAnimationFrame(() => syncTextareaHeight(textarea));
}
