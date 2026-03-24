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
import { showToast } from '../../components/feedback/toast.js';

/**
 * Застосовує трансформацію до одного зображення
 * @param {object} item - Елемент зі state.files
 * @param {'resize' | 'canvas'} mode - Тип трансформації
 * @param {number} targetW - Цільова ширина
 * @param {number} targetH - Цільова висота
 * @returns {Promise<void>}
 */
function transformItem(item, mode, targetW, targetH) {
    return new Promise(resolve => {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        tempCanvas.width = targetW;
        tempCanvas.height = targetH;

        if (mode === 'resize') {
            tempCtx.drawImage(item.image, 0, 0, targetW, targetH);
        } else {
            tempCtx.fillStyle = 'white';
            tempCtx.fillRect(0, 0, targetW, targetH);
            const centerX = (targetW - item.width) / 2;
            const centerY = (targetH - item.height) / 2;
            tempCtx.drawImage(item.image, centerX, centerY, item.width, item.height);
        }

        const newImg = new Image();
        newImg.onload = () => {
            item.image = newImg;
            item.width = newImg.width;
            item.height = newImg.height;
            resolve();
        };
        newImg.src = tempCanvas.toDataURL('image/png');
    });
}

/**
 * Повертає список елементів для обробки (виділені або активний)
 */
function getTargetItems() {
    const imageState = getImageState();
    if (imageState.selectedIds.size > 0) {
        return imageState.files.filter(f => imageState.selectedIds.has(f.id));
    }
    const active = imageState.files.find(f => f.id === imageState.activeId);
    return active ? [active] : [];
}

/**
 * Застосовує трансформацію (resize або canvas) до виділених або активного зображення
 * @param {'resize' | 'canvas'} mode - Яку трансформацію застосувати
 */
export async function applyTransformation(mode) {
    const dom = getImageDom();
    const imageState = getImageState();
    const items = getTargetItems();

    if (items.length === 0) {
        showToast('Спочатку виберіть зображення', 'warning');
        return;
    }

    const inputW = parseInt(mode === 'resize' ? dom.resizeWidth.value : dom.canvasWidth.value);
    const inputH = parseInt(mode === 'resize' ? dom.resizeHeight.value : dom.canvasHeight.value);

    for (const item of items) {
        const finalW = inputW || item.width;
        const finalH = inputH || item.height;
        await transformItem(item, mode, finalW, finalH);
    }

    // Оновлюємо UI для активного
    const activeItem = imageState.files.find(f => f.id === imageState.activeId);
    if (activeItem) {
        updateCanvasDisplay(activeItem.image);
        dom.resizeWidth.value = activeItem.width;
        dom.resizeHeight.value = activeItem.height;
        dom.canvasWidth.value = activeItem.width;
        dom.canvasHeight.value = activeItem.height;
        dom.canvasWidth.placeholder = activeItem.width;
        dom.canvasHeight.placeholder = activeItem.height;
    }

    renderThumbnails();
    showToast(`Застосовано: ${mode} до ${items.length} зобр.`, 'success');
}

/**
 * Квадратизує виділені або активне зображення (полотно = max сторона)
 */
export async function squarifyImages() {
    const imageState = getImageState();
    const items = getTargetItems();

    if (items.length === 0) {
        showToast('Спочатку виберіть зображення', 'warning');
        return;
    }

    for (const item of items) {
        const maxSide = Math.max(item.width, item.height);
        await transformItem(item, 'canvas', maxSide, maxSide);
    }

    const dom = getImageDom();
    const activeItem = imageState.files.find(f => f.id === imageState.activeId);
    if (activeItem) {
        updateCanvasDisplay(activeItem.image);
        dom.resizeWidth.value = activeItem.width;
        dom.resizeHeight.value = activeItem.height;
        dom.canvasWidth.value = activeItem.width;
        dom.canvasHeight.value = activeItem.height;
        dom.canvasWidth.placeholder = activeItem.width;
        dom.canvasHeight.placeholder = activeItem.height;
    }

    renderThumbnails();
    showToast(`Квадратизовано ${items.length} зобр.`, 'success');
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
