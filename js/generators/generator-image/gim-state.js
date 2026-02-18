// js/generators/generator-image/gim-state.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              IMAGE TOOL - STATE MANAGEMENT                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Управління глобальним станом інструменту обробки зображень.
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - getImageState() - Отримати об'єкт стану
 * - resetState() - Скинути весь стан
 * - resetCanvasState() - Скинути стан canvas
 */

import { getImageDom } from './gim-dom.js';

/**
 * Глобальний стан інструменту
 */
const imageState = {
    files: [], // Масив об'єктів { id: string, file: File, image: HTMLImageElement, width: number, height: number, name: string }
    activeId: null,
    selectedIds: new Set(),
    counter: 0
};

/**
 * Отримати об'єкт стану
 * @returns {object} imageState
 */
export function getImageState() {
    return imageState;
}

/**
 * Скидає стан інструмента
 */
export function resetState() {
    const dom = getImageDom();
    imageState.files.length = 0;
    imageState.activeId = null;
    imageState.selectedIds.clear();
    imageState.counter = 0;
    dom.imageInput.value = '';
    dom.imageUrlInput.value = '';
    dom.thumbnailsArea.innerHTML = '';
    if (dom.emptyState) {
        dom.thumbnailsArea.appendChild(dom.emptyState);
        dom.emptyState.classList.remove('u-hidden');
    }
    resetCanvasState();
}

/**
 * Скидає стан Canvas (коли всі зображення видалено)
 */
export function resetCanvasState() {
    const dom = getImageDom();
    imageState.activeId = null;
    dom.imageCanvas.width = 1;
    dom.imageCanvas.height = 1;
    dom.imageCanvas.style.width = 'auto';
    dom.imageCanvas.style.height = 'auto';
    dom.resizeWidth.value = '';
    dom.resizeHeight.value = '';
    dom.canvasWidth.value = '';
    dom.canvasHeight.value = '';
    dom.resizeWidth.placeholder = 'Поточна';
    dom.resizeHeight.placeholder = 'Поточна';
    dom.canvasWidth.placeholder = 'Поточна';
    dom.canvasHeight.placeholder = 'Поточна';
    dom.saveBtn.disabled = true;
    dom.dragDropOverlay.classList.add('visible');
}
