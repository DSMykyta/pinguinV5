// js/generators/generator-image/gim-transformer.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              IMAGE TOOL - IMAGE TRANSFORMATIONS                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Трансформації зображень (resize, canvas).
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - applyTransformation(mode) - Застосувати трансформацію
 * - updateResizeProportions(e) - Синхронізувати пропорції resize
 * - updateCanvasProportions(e) - Автозаповнення полів canvas
 */

import { getImageDom } from './gim-dom.js';
import { getImageState } from './gim-state.js';
import { updateCanvasDisplay, renderThumbnails } from './gim-renderer.js';
import { showToast } from '../../common/ui-toast.js';

/**
 * Застосовує трансформацію (resize або canvas) до АКТИВНОГО зображення
 * @param {'resize' | 'canvas'} mode - Яку трансформацію застосувати
 */
export function applyTransformation(mode) {
    const dom = getImageDom();
    const imageState = getImageState();
    const activeItem = imageState.files.find(f => f.id === imageState.activeId);
    if (!activeItem) {
        showToast('Спочатку виберіть зображення', 'warning');
        return;
    }

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    let finalW = activeItem.width;
    let finalH = activeItem.height;

    if (mode === 'resize') {
        // РЕЖИМ 1: Зміна розміру зображення
        finalW = parseInt(dom.resizeWidth.value) || finalW;
        finalH = parseInt(dom.resizeHeight.value) || finalH;

        tempCanvas.width = finalW;
        tempCanvas.height = finalH;
        tempCtx.drawImage(activeItem.image, 0, 0, finalW, finalH);

    } else if (mode === 'canvas') {
        // РЕЖИМ 2: Зміна розміру полотна
        finalW = parseInt(dom.canvasWidth.value) || activeItem.width;
        finalH = parseInt(dom.canvasHeight.value) || activeItem.height;

        tempCanvas.width = finalW;
        tempCanvas.height = finalH;

        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, finalW, finalH);

        const centerX = (finalW - activeItem.width) / 2;
        const centerY = (finalH - activeItem.height) / 2;
        tempCtx.drawImage(activeItem.image, centerX, centerY, activeItem.width, activeItem.height);
    }

    // Створюємо DataURL з тимчасового canvas
    const dataUrl = tempCanvas.toDataURL('image/png');

    // Створюємо новий об'єкт Image
    const newImg = new Image();
    newImg.onload = () => {
        // ОНОВЛЮЄМО STATE
        activeItem.image = newImg;
        activeItem.width = newImg.width;
        activeItem.height = newImg.height;

        // Оновлюємо UI
        updateCanvasDisplay(newImg);
        renderThumbnails();

        // Оновлюємо поля вводу
        dom.resizeWidth.value = newImg.width;
        dom.resizeHeight.value = newImg.height;
        dom.canvasWidth.value = newImg.width;
        dom.canvasHeight.value = newImg.height;
        dom.canvasWidth.placeholder = newImg.width;
        dom.canvasHeight.placeholder = newImg.height;

        showToast(`Застосовано: ${mode} (${finalW}x${finalH})`, 'success');
    };
    newImg.src = dataUrl;
}

/**
 * Синхронізація пропорцій для зміни розміру зображення
 * @param {Event} e - Input event
 */
export function updateResizeProportions(e) {
    const dom = getImageDom();
    const imageState = getImageState();
    const activeItem = imageState.files.find(f => f.id === imageState.activeId);
    if (!activeItem) return;
    const currentW = activeItem.width;
    const currentH = activeItem.height;
    const ratio = currentW / currentH;

    if (e.target === dom.resizeWidth && dom.resizeWidth.value) {
        const newW = parseInt(dom.resizeWidth.value);
        if (!isNaN(newW)) dom.resizeHeight.value = Math.round(newW / ratio);
    } else if (e.target === dom.resizeHeight && dom.resizeHeight.value) {
        const newH = parseInt(dom.resizeHeight.value);
        if (!isNaN(newH)) dom.resizeWidth.value = Math.round(newH * ratio);
    }
}

/**
 * Автозаповнення полів полотна поточними розмірами
 * @param {Event} e - Input event
 */
export function updateCanvasProportions(e) {
     const dom = getImageDom();
     const imageState = getImageState();
     const activeItem = imageState.files.find(f => f.id === imageState.activeId);
     if (!activeItem) return;
     if (!dom.canvasWidth.value) dom.canvasWidth.placeholder = activeItem.width;
     if (!dom.canvasHeight.value) dom.canvasHeight.placeholder = activeItem.height;
}
