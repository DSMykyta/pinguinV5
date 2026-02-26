// js/generators/generator-image/gim-renderer.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              IMAGE TOOL - RENDERING                                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ПРИЗНАЧЕННЯ:
 * Відображення canvas та thumbnails.
 *
 * ЕКСПОРТОВАНІ ФУНКЦІЇ:
 * - setActiveImage(id) - Встановити активне зображення
 * - updateCanvasDisplay(image) - Оновити відображення canvas
 * - renderThumbnails() - Рендеринг мініатюр
 * - deleteImage(id) - Видалити зображення
 */

import { getImageDom } from './gim-dom.js';
import { getImageState, resetCanvasState } from './gim-state.js';
import { updateSaveButtonText } from './gim-saver.js';
import { showToast } from '../../components/feedback/toast.js';

/**
 * Встановлює активне зображення (для показу в Canvas)
 * @param {string} id - ID зображення
 */
export function setActiveImage(id) {
    const dom = getImageDom();
    const imageState = getImageState();
    const activeItem = imageState.files.find(f => f.id === id);
    if (!activeItem) return;

    imageState.activeId = id;

    // 1. Оновлюємо Canvas
    updateCanvasDisplay(activeItem.image);

    // 2. Оновлюємо Aside (поля вводу)
    dom.resizeWidth.value = activeItem.width;
    dom.resizeHeight.value = activeItem.height;
    dom.canvasWidth.value = activeItem.width;
    dom.canvasHeight.value = activeItem.height;
    dom.canvasWidth.placeholder = activeItem.width;
    dom.canvasHeight.placeholder = activeItem.height;

    dom.saveBtn.disabled = false;

    // 3. Оновлюємо активний клас мініатюр
    renderThumbnails();
}

/**
 * Оновлює Canvas, масштабуючи зображення (зберігаючи пропорції)
 * @param {HTMLImageElement} image - Зображення для відображення
 */
export function updateCanvasDisplay(image) {
    const dom = getImageDom();
    const canvas = dom.imageCanvas;
    const ctx = canvas.getContext('2d');
    const container = canvas.closest('.canvas-area');

    if (!container || !image) return;

    const containerHeight = container.clientHeight - 32; // -32px padding
    const containerWidth = container.clientWidth - 32;

    let newWidth = image.width;
    let newHeight = image.height;
    const ratio = image.width / image.height;

    if (image.height > containerHeight && containerHeight > 0) {
        newHeight = containerHeight;
        newWidth = newHeight * ratio;
    }

    if (newWidth > containerWidth && containerWidth > 0) {
        newWidth = containerWidth;
        newHeight = newWidth / ratio;
    }

    canvas.width = image.width;
    canvas.height = image.height;

    canvas.style.width = `${Math.round(newWidth)}px`;
    canvas.style.height = `${Math.round(newHeight)}px`;

    ctx.clearRect(0, 0, image.width, image.height);
    ctx.drawImage(image, 0, 0, image.width, image.height);
}

/**
 * Рендеринг мініатюр
 */
export function renderThumbnails() {
    const dom = getImageDom();
    const imageState = getImageState();
    dom.thumbnailsArea.innerHTML = '';

    if (imageState.files.length === 0) {
        dom.thumbnailsArea.appendChild(dom.emptyState);
        dom.emptyState.classList.remove('u-hidden');
        resetCanvasState();
        return;
    }

    dom.emptyState.classList.add('u-hidden');

    imageState.files.forEach(item => {
        const div = document.createElement('div');
        div.className = `thumbnail-item${item.id === imageState.activeId ? ' active' : ''}`;
        div.dataset.id = item.id;

        const isChecked = imageState.selectedIds.has(item.id);

        div.innerHTML = `
            <input type="checkbox" class="row-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
            <img src="${item.image.src}" alt="${item.name}">
            <div class="thumbnail-item-info">
                <strong>${item.name}</strong>
                <span>${item.width} x ${item.height} px</span>
            </div>
            <button class="tab-close-btn" data-delete-id="${item.id}" aria-label="Видалити">
                <span class="material-symbols-outlined">close</span>
            </button>
        `;

        div.querySelector('.thumbnail-item-info').addEventListener('click', () => {
            setActiveImage(item.id);
        });

        div.querySelector('.row-checkbox').addEventListener('change', (e) => {
            if (e.target.checked) {
                imageState.selectedIds.add(item.id);
            } else {
                imageState.selectedIds.delete(item.id);
            }
            updateSaveButtonText();
        });

        div.querySelector('.tab-close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteImage(item.id);
        });

        dom.thumbnailsArea.appendChild(div);
    });
}

/**
 * Видалення зображення зі state
 * @param {string} id - ID зображення
 */
export function deleteImage(id) {
    const imageState = getImageState();
    const index = imageState.files.findIndex(f => f.id === id);
    if (index === -1) return;
    imageState.files.splice(index, 1);
    imageState.selectedIds.delete(id);
    if (imageState.activeId === id) {
        if (imageState.files.length > 0) {
            setActiveImage(imageState.files[0].id);
        } else {
            resetCanvasState();
        }
    }
    renderThumbnails();
    updateSaveButtonText();
    showToast(`Зображення видалено`, 'info', 1500);
}
