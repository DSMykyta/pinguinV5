// js/pages/products/products-crud-variant-photos.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS CRUD — ФОТО ВАРІАНТУ                              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Галерея фото варіанту (до 10 зображень).
 * Upload на Google Drive: товари/{brand}/{product}/{variant}_{index}.webp
 *
 * Layout: col-8 (головне фото) + col-4 (upload zone + фото-картки)
 * Drag-and-drop для зміни порядку (перше фото = головне)
 *
 * Ідентичний products-crud-photos.js, але з variant- префіксами.
 */

import { uploadProductPhotoFile } from '../../utils/api-client.js';
import { escapeHtml } from '../../utils/text-utils.js';
import { showToast } from '../../components/feedback/toast.js';
import { normalizeName } from './products-crud-photos.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

const MAX_PHOTOS = 10;
let _photoUrls = [];

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

export function initVariantPhotoSection() {
    const dropzone = document.getElementById('variant-photo-dropzone');
    const fileInput = document.getElementById('variant-photo-file-input');
    const urlField = document.getElementById('variant-photo-url-field');
    const uploadBtn = document.getElementById('btn-upload-variant-photo');
    const pickBtn = document.getElementById('btn-pick-variant-photo');

    if (!dropzone || !fileInput) return;
    if (dropzone.dataset.photoInit) return;
    dropzone.dataset.photoInit = 'true';

    // Кнопка вибору файлу з пристрою
    pickBtn?.addEventListener('click', () => {
        if (_photoUrls.length >= MAX_PHOTOS) {
            showToast(`Максимум ${MAX_PHOTOS} фото`, 'warning');
            return;
        }
        fileInput.click();
    });

    // Кнопка завантаження з URL
    uploadBtn?.addEventListener('click', () => {
        const url = urlField?.value.trim();
        if (!url) return;
        if (_photoUrls.length >= MAX_PHOTOS) {
            showToast(`Максимум ${MAX_PHOTOS} фото`, 'warning');
            return;
        }
        _photoUrls.push(url);
        urlField.value = '';
        syncHiddenField();
        renderPhotoGrid();
        updateMainPreview();
    });

    // Вибір файлів
    fileInput.addEventListener('change', async () => {
        const files = Array.from(fileInput.files || []);
        if (files.length === 0) return;

        const remaining = MAX_PHOTOS - _photoUrls.length;
        const toUpload = files.slice(0, remaining);

        for (const file of toUpload) {
            await handleUploadPhoto(file);
        }

        fileInput.value = '';
    });

    // Drag-and-drop файлів на dropzone
    const inputsLine = dropzone.querySelector('.content-line');
    if (inputsLine) {
        inputsLine.addEventListener('dragover', (e) => {
            e.preventDefault();
            inputsLine.classList.add('drag-over');
        });

        inputsLine.addEventListener('dragleave', () => {
            inputsLine.classList.remove('drag-over');
        });

        inputsLine.addEventListener('drop', async (e) => {
            e.preventDefault();
            inputsLine.classList.remove('drag-over');

            const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
            if (files.length === 0) return;

            const remaining = MAX_PHOTOS - _photoUrls.length;
            const toUpload = files.slice(0, remaining);

            for (const file of toUpload) {
                await handleUploadPhoto(file);
            }
        });
    }

    // Enter в URL полі
    urlField?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            uploadBtn?.click();
        }
    });

    // Делегований обробник: видалення + drag
    const grid = document.getElementById('variant-photos-grid');
    if (grid) {
        grid.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('[data-photo-remove]');
            if (!removeBtn) return;

            const index = parseInt(removeBtn.dataset.photoRemove);
            if (!isNaN(index)) removePhoto(index);
        });

        initDragReorder(grid);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DRAG REORDER
// ═══════════════════════════════════════════════════════════════════════════

function initDragReorder(grid) {
    let draggedIndex = null;

    grid.addEventListener('dragstart', (e) => {
        const bloc = e.target.closest('.content-bloc[data-photo-index]');
        if (!bloc) return;
        draggedIndex = parseInt(bloc.dataset.photoIndex);
        bloc.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    grid.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const bloc = e.target.closest('.content-bloc[data-photo-index]');
        if (!bloc) return;

        grid.querySelectorAll('.content-bloc').forEach(b => b.classList.remove('drag-target'));
        bloc.classList.add('drag-target');
    });

    grid.addEventListener('dragleave', (e) => {
        const bloc = e.target.closest('.content-bloc[data-photo-index]');
        if (bloc) bloc.classList.remove('drag-target');
    });

    grid.addEventListener('drop', (e) => {
        e.preventDefault();
        grid.querySelectorAll('.content-bloc').forEach(b => b.classList.remove('drag-target', 'dragging'));

        const bloc = e.target.closest('.content-bloc[data-photo-index]');
        if (!bloc || draggedIndex === null) return;

        const targetIndex = parseInt(bloc.dataset.photoIndex);
        if (draggedIndex === targetIndex) return;

        const [moved] = _photoUrls.splice(draggedIndex, 1);
        _photoUrls.splice(targetIndex, 0, moved);

        syncHiddenField();
        renderPhotoGrid();
        updateMainPreview();
        draggedIndex = null;
    });

    grid.addEventListener('dragend', () => {
        grid.querySelectorAll('.content-bloc').forEach(b => b.classList.remove('dragging', 'drag-target'));
        draggedIndex = null;
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD
// ═══════════════════════════════════════════════════════════════════════════

async function handleUploadPhoto(file) {
    if (_photoUrls.length >= MAX_PHOTOS) return;

    if (!file.type.startsWith('image/')) {
        showToast('Файл не є зображенням', 'error');
        return;
    }

    if (file.size > 4 * 1024 * 1024) {
        showToast('Файл занадто великий. Максимум 4 MB', 'error');
        return;
    }

    const dropzone = document.getElementById('variant-photo-dropzone');
    dropzone?.classList.add('loading');

    try {
        const brandId = getProductFieldValue('product-brand');
        const productId = document.getElementById('variant-product-id')?.value.trim() || '';
        const photoIndex = _photoUrls.length + 1;

        if (!brandId || !productId) {
            showToast('Спочатку збережіть товар, щоб завантажити фото', 'warning');
            dropzone?.classList.remove('loading');
            return;
        }

        const result = await uploadProductPhotoFile(file, brandId, productId, photoIndex);

        dropzone?.classList.remove('loading');

        if (result && result.thumbnailUrl) {
            _photoUrls.push(result.thumbnailUrl);
            syncHiddenField();
            renderPhotoGrid();
            updateMainPreview();
            showToast('Фото завантажено', 'success');
        }
    } catch (error) {
        console.error('Помилка завантаження фото:', error);
        dropzone?.classList.remove('loading');
        showToast('Помилка завантаження фото', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════════════

function renderPhotoGrid() {
    const grid = document.getElementById('variant-photos-grid');
    const counter = document.getElementById('variant-photos-counter');
    const dropzone = document.getElementById('variant-photo-dropzone');
    if (!grid) return;

    if (counter) {
        counter.textContent = _photoUrls.length > 0 ? `${_photoUrls.length} / ${MAX_PHOTOS}` : '';
    }

    if (dropzone) {
        dropzone.classList.toggle('u-hidden', _photoUrls.length >= MAX_PHOTOS);
    }

    if (_photoUrls.length === 0) {
        grid.innerHTML = '';
        updateMainPreview();
        return;
    }

    const photoBaseName = buildPhotoName();

    let html = '';
    _photoUrls.forEach((url, index) => {
        const fileName = `${photoBaseName}_${index + 1}.webp`;
        const ext = extractExtension(fileName);
        const isMain = index === 0;
        html += `
            <div class="content-bloc" draggable="true" data-photo-index="${index}">
                <div class="content-line${isMain ? ' main' : ''}">
                    <button class="btn-icon ghost drag" tabindex="-1">
                        <span class="material-symbols-outlined">expand_all</span>
                    </button>
                    <div class="content-line-photo">
                        <img src="${escapeHtml(url)}" alt="Фото ${index + 1}" show
                             onload="this.closest('.content-line').querySelector('.content-line-label').textContent = this.naturalWidth + '×' + this.naturalHeight">
                    </div>
                    <div class="content-line-info">
                        <span class="content-line-name" title="${fileName}">${fileName}</span>
                        <span class="content-line-label"></span>
                    </div>
                    <span class="tag c-tertiary">${ext}</span>
                    <button type="button" class="btn-icon ci-remove" data-photo-remove="${index}"
                        data-tooltip="Видалити">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

function updateMainPreview() {
    const mainImg = document.getElementById('variant-photo-main-img');
    const mainEmpty = document.getElementById('variant-photo-main-empty');
    if (!mainImg) return;

    if (_photoUrls.length > 0) {
        mainImg.src = _photoUrls[0];
        mainImg.style.display = '';
        if (mainEmpty) mainEmpty.style.display = 'none';
    } else {
        mainImg.src = '';
        mainImg.style.display = 'none';
        if (mainEmpty) mainEmpty.style.display = '';
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════

export function setVariantPhotoUrls(urls) {
    _photoUrls = Array.isArray(urls) ? [...urls] : [];
    renderPhotoGrid();
    updateMainPreview();
    syncHiddenField();
}

export function getVariantPhotoUrls() {
    return [..._photoUrls];
}

/**
 * Отримати ефективні фото для варіанту з урахуванням фото товару.
 *
 * - 0 фото варіанту → фото товару
 * - 1 фото варіанту → [варіант[0], ...товар.slice(1)] (замінює головне)
 * - 2+ фото варіанту → тільки фото варіанту (товар ігнорується)
 *
 * @param {string|Array} variantImageUrl - image_url варіанту (JSON string або масив)
 * @param {string|Array} productImageUrl - image_url товару (JSON string або масив)
 * @returns {Array} Масив URL фото для відображення
 */
export function getEffectiveVariantPhotos(variantImageUrl, productImageUrl) {
    const variantPhotos = parsePhotoUrls(variantImageUrl);
    const productPhotos = parsePhotoUrls(productImageUrl);

    if (variantPhotos.length === 0) return productPhotos;
    if (variantPhotos.length === 1) return [variantPhotos[0], ...productPhotos.slice(1)];
    return variantPhotos;
}

function parsePhotoUrls(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    const trimmed = String(raw).trim();
    if (!trimmed) return [];
    try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
        return [trimmed];
    } catch {
        return [trimmed];
    }
}

export function clearVariantPhotos() {
    _photoUrls = [];
    renderPhotoGrid();
    updateMainPreview();
    syncHiddenField();
}

function removePhoto(index) {
    if (index < 0 || index >= _photoUrls.length) return;

    const removedUrl = _photoUrls[index];
    _photoUrls.splice(index, 1);
    renderPhotoGrid();
    updateMainPreview();
    syncHiddenField();

    showToast('Фото видалено', 'info', {
        duration: 5000,
        action: {
            label: 'Відмінити',
            onClick: () => {
                _photoUrls.splice(index, 0, removedUrl);
                renderPhotoGrid();
                updateMainPreview();
                syncHiddenField();
            },
        },
    });
}

function syncHiddenField() {
    const hidden = document.getElementById('variant-image-url');
    if (hidden) {
        hidden.value = _photoUrls.length > 0 ? JSON.stringify(_photoUrls) : '';
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getProductFieldValue(id) {
    return document.getElementById(id)?.value.trim() || '';
}

function buildPhotoName() {
    const variantName = document.getElementById('variant-name-ua')?.value.trim() || '';
    const productId = document.getElementById('variant-product-id')?.value.trim() || '';

    const name = [productId, variantName]
        .map(p => normalizeName(p))
        .filter(Boolean)
        .join('-');

    return name || 'variant';
}

function extractExtension(name) {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(dot + 1).toUpperCase() : '';
}
