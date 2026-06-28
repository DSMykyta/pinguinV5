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
import { setImageSelected, syncSelectAllControl } from './gim-selection.js';
import { showToast } from '../../components/feedback/toast.js';
import { getEditableFileBaseName, getItemSourceExtension, setEditableFileBaseName } from './gim-filenames.js';

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
    if (dom.saveFolderBtn) dom.saveFolderBtn.disabled = false;

    // 3. Оновлюємо активний клас мініатюр
    renderThumbnails();
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function escapeAttribute(value) {
    return escapeHtml(value)
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function insertPlainTextAtSelection(text) {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);

    selection.removeAllRanges();
    selection.addRange(range);
}

function scrollEditableNameToCaret(element) {
    requestAnimationFrame(() => {
        if (document.activeElement !== element) return;

        const selection = window.getSelection();
        if (!selection?.rangeCount || !element.contains(selection.anchorNode)) {
            element.scrollLeft = element.scrollWidth;
            return;
        }

        const range = selection.getRangeAt(0).cloneRange();
        range.collapse(false);

        const rects = range.getClientRects();
        const caretRect = rects[rects.length - 1] || range.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const inset = 6;

        if (!caretRect || (caretRect.left === 0 && caretRect.right === 0)) {
            element.scrollLeft = element.scrollWidth;
            return;
        }

        if (caretRect.right > elementRect.right - inset) {
            element.scrollLeft += caretRect.right - elementRect.right + inset;
        } else if (caretRect.left < elementRect.left + inset) {
            element.scrollLeft -= elementRect.left - caretRect.left + inset;
        }
    });
}

/**
 * Оновлює Canvas, масштабуючи зображення (зберігаючи пропорції)
 * @param {HTMLImageElement} image - Зображення для відображення
 */
export function updateCanvasDisplay(image) {
    const dom = getImageDom();
    const canvas = dom.imageCanvas;
    const ctx = canvas.getContext('2d');
    const container = canvas.closest('.photo-main-preview');

    if (!container || !image) return;

    const containerHeight = container.clientHeight;
    const containerWidth = container.clientWidth;

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
        syncSelectAllControl();
        resetCanvasState();
        return;
    }

    dom.emptyState.classList.add('u-hidden');

    imageState.files.forEach(item => {
        const ext = getItemSourceExtension(item);
        const baseName = getEditableFileBaseName(item);
        const isActive = item.id === imageState.activeId;
        const isChecked = imageState.selectedIds.has(item.id);

        const div = document.createElement('div');
        div.className = 'content-bloc';
        div.dataset.id = item.id;

        div.innerHTML = `
            <div class="content-line${isActive ? ' main' : ''}">
                <div class="input-box">
                    <input type="checkbox" class="row-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                    <div class="content-line-photo">
                        <img src="${item.image.src}" alt="${item.name}" show>
                    </div>
                    <div class="content-line-info">
                        <span class="content-line-name photo-name-editable"
                            contenteditable="true"
                            role="textbox"
                            spellcheck="false"
                            title="${escapeAttribute(baseName)}"
                            aria-label="Назва файлу">${escapeHtml(baseName)}</span>
                        <span class="content-line-label">${item.width}×${item.height}</span>
                    </div>
                    <span class="tag c-tertiary">${escapeHtml(ext)}</span>
                    <button type="button" class="btn-icon ci-remove" data-delete-id="${item.id}"
                        data-tooltip="Видалити">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>
        `;

        const nameInput = div.querySelector('.photo-name-editable');

        nameInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        nameInput.addEventListener('focus', (e) => {
            scrollEditableNameToCaret(e.target);
        });

        nameInput.addEventListener('mouseup', (e) => {
            scrollEditableNameToCaret(e.target);
        });

        nameInput.addEventListener('input', (e) => {
            item.baseName = e.target.textContent;
            e.target.title = e.target.textContent;
            scrollEditableNameToCaret(e.target);
        });

        nameInput.addEventListener('blur', (e) => {
            setEditableFileBaseName(item, e.target.textContent);
            const normalized = getEditableFileBaseName(item);
            e.target.textContent = normalized;
            e.target.title = normalized;
            e.target.scrollLeft = 0;
        });

        nameInput.addEventListener('paste', (e) => {
            e.preventDefault();
            insertPlainTextAtSelection(e.clipboardData?.getData('text/plain') || '');
            item.baseName = e.target.textContent;
            e.target.title = e.target.textContent;
            scrollEditableNameToCaret(e.target);
        });

        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.target.blur();
                return;
            }

            scrollEditableNameToCaret(e.target);
        });

        nameInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                return;
            }

            scrollEditableNameToCaret(e.target);
        });

        div.querySelector('.content-line-info').addEventListener('click', (e) => {
            if (e.target.closest('.photo-name-editable')) return;
            setActiveImage(item.id);
        });

        div.querySelector('.row-checkbox').addEventListener('change', (e) => {
            setImageSelected(item.id, e.target.checked);
            updateSaveButtonText();
        });

        div.querySelector('.btn-icon.ci-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteImage(item.id);
        });

        dom.thumbnailsArea.appendChild(div);
    });

    syncSelectAllControl();
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
