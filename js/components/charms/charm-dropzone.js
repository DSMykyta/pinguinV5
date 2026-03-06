// js/components/charms/charm-dropzone.js

/**
 * CHARM: DROPZONE
 * ================================================================
 * Document-level delegation. Один listener на весь додаток.
 *
 * HTML (еталон):
 * <div class="content-bloc" data-dropzone>
 *     <div class="content-line">
 *         <div class="input-box">
 *             <input type="url" placeholder="URL або перетягніть файл...">
 *         </div>
 *         <button type="button" class="btn-icon ci-action" data-dz-pick
 *             data-tooltip="Вибрати файл">
 *             <span class="material-symbols-outlined">folder_open</span>
 *         </button>
 *         <button type="button" class="btn-icon ci-action u-hidden" data-dz-upload
 *             data-tooltip="Завантажити з URL">
 *             <span class="material-symbols-outlined">download</span>
 *         </button>
 *     </div>
 *     <input type="file" accept="image/*" hidden>
 * </div>
 *
 * ПОВЕДІНКА (тільки UI — бізнес-логіка лишається на сторінці):
 * 1. Клік на порожній URL-інпут → імітує клік на [data-dz-pick]
 * 2. Введення URL → ховає pick, показує upload; Enter → клік [data-dz-upload]
 * 3. Drag-over → зона розширюється (клас .dz-dragging)
 *
 * Сторінковий код слухає:
 * - [data-dz-pick] click  → fileInput.click() з гардами
 * - [data-dz-upload] click → обробка URL
 * - input[type=file] change → обробка файлів
 * - drop на [data-dropzone]  → обробка файлів
 */

export function initDropzoneCharm() {

    // --- CLICK: empty URL input → delegate to pick button ---
    document.addEventListener('click', (e) => {
        const zone = e.target.closest('[data-dropzone]');
        if (!zone) return;

        // Click on URL input when empty → trigger pick button
        if (e.target.matches('input[type="url"]') && !e.target.value.trim()) {
            const pickBtn = zone.querySelector('[data-dz-pick]');
            if (pickBtn) pickBtn.click();
        }
    });

    // --- INPUT: toggle pick/upload buttons ---
    document.addEventListener('input', (e) => {
        if (e.target.type !== 'url') return;
        const zone = e.target.closest('[data-dropzone]');
        if (!zone) return;

        _toggleButtons(zone, e.target.value.trim());
    });

    // --- KEYDOWN: Enter in URL field → trigger upload ---
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        if (e.target.type !== 'url') return;
        const zone = e.target.closest('[data-dropzone]');
        if (!zone) return;

        if (!e.target.value.trim()) return;

        e.preventDefault();
        const uploadBtn = zone.querySelector('[data-dz-upload]');
        if (uploadBtn) uploadBtn.click();
    });

    // --- DRAG: visual feedback ---
    document.addEventListener('dragenter', (e) => {
        const zone = e.target.closest('[data-dropzone]');
        if (!zone) return;
        e.preventDefault();
        zone.classList.add('dz-dragging');
    });

    document.addEventListener('dragover', (e) => {
        const zone = e.target.closest('[data-dropzone]');
        if (!zone) return;
        e.preventDefault();
    });

    document.addEventListener('dragleave', (e) => {
        const zone = e.target.closest('[data-dropzone]');
        if (!zone) return;

        // Only remove if leaving the zone entirely
        if (!zone.contains(e.relatedTarget)) {
            zone.classList.remove('dz-dragging');
        }
    });

    document.addEventListener('drop', (e) => {
        const zone = e.target.closest('[data-dropzone]');
        if (!zone) return;
        zone.classList.remove('dz-dragging');
        // Actual file handling stays in page-specific code
    });
}

function _toggleButtons(zone, hasValue) {
    const pickBtn = zone.querySelector('[data-dz-pick]');
    const uploadBtn = zone.querySelector('[data-dz-upload]');

    if (hasValue) {
        pickBtn?.classList.add('u-hidden');
        uploadBtn?.classList.remove('u-hidden');
    } else {
        pickBtn?.classList.remove('u-hidden');
        uploadBtn?.classList.add('u-hidden');
    }
}
