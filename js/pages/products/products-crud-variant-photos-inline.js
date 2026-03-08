// js/pages/products/products-crud-variant-photos-inline.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        PRODUCTS CRUD — ФОТО ВАРІАНТУ (INLINE / EXPANDABLE)              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Per-row photo management для expandable рядків таблиці варіантів.
 * Кожен рядок має свій окремий стан (Map<rowId, urls[]>).
 * Без головного прев'ю — тільки dropzone + photo grid.
 */

import { uploadProductPhotoFile } from '../../utils/api-client.js';
import { escapeHtml } from '../../utils/text-utils.js';
import { showToast } from '../../components/feedback/toast.js';

const MAX_PHOTOS = 10;

/** Per-row photo state */
const _rowPhotos = new Map();

/**
 * Ініціалізувати inline photo section для expandable рядка
 * @param {string} rowId - variant_id або _pendingId
 * @param {string|Array} imageUrl - поточне значення image_url (JSON або рядок)
 */
export function initInlinePhotos(rowId, imageUrl) {
    const dropzone = document.getElementById(`${rowId}-photo-dropzone`);
    const fileInput = document.getElementById(`${rowId}-photo-file-input`);
    const urlField = document.getElementById(`${rowId}-photo-url-field`);
    const uploadBtn = document.getElementById(`${rowId}-btn-upload-photo`);
    const pickBtn = document.getElementById(`${rowId}-btn-pick-photo`);
    const grid = document.getElementById(`${rowId}-photos-grid`);

    if (!dropzone || !fileInput) return;
    if (dropzone.dataset.photoInit) return;
    dropzone.dataset.photoInit = 'true';

    // Parse initial photos
    _rowPhotos.set(rowId, parsePhotoUrls(imageUrl));

    // Render initial state
    renderGrid(rowId);

    // Pick file
    pickBtn?.addEventListener('click', () => {
        if (getPhotos(rowId).length >= MAX_PHOTOS) {
            showToast(`Максимум ${MAX_PHOTOS} фото`, 'warning');
            return;
        }
        fileInput.click();
    });

    // Upload URL
    uploadBtn?.addEventListener('click', () => {
        const url = urlField?.value.trim();
        if (!url) return;
        if (getPhotos(rowId).length >= MAX_PHOTOS) {
            showToast(`Максимум ${MAX_PHOTOS} фото`, 'warning');
            return;
        }
        getPhotos(rowId).push(url);
        urlField.value = '';
        urlField.dispatchEvent(new Event('input', { bubbles: true }));
        renderGrid(rowId);
    });

    // File input change
    fileInput.addEventListener('change', async () => {
        const files = Array.from(fileInput.files || []);
        if (files.length === 0) return;

        const photos = getPhotos(rowId);
        const remaining = MAX_PHOTOS - photos.length;
        const toUpload = files.slice(0, remaining);

        for (const file of toUpload) {
            await handleUpload(rowId, file);
        }
        fileInput.value = '';
    });

    // Drop files
    dropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;

        const photos = getPhotos(rowId);
        const remaining = MAX_PHOTOS - photos.length;
        const toUpload = files.slice(0, remaining);

        for (const file of toUpload) {
            await handleUpload(rowId, file);
        }
    });

    // Grid: remove + drag
    if (grid) {
        grid.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('[data-photo-remove]');
            if (!removeBtn) return;
            const index = parseInt(removeBtn.dataset.photoRemove);
            if (!isNaN(index)) removePhoto(rowId, index);
        });
    }
}

/**
 * Отримати поточні фото для рядка
 * @param {string} rowId
 * @returns {string[]}
 */
export function getInlinePhotoUrls(rowId) {
    return [...(getPhotos(rowId))];
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL
// ═══════════════════════════════════════════════════════════════════════════

function getPhotos(rowId) {
    if (!_rowPhotos.has(rowId)) _rowPhotos.set(rowId, []);
    return _rowPhotos.get(rowId);
}

async function handleUpload(rowId, file) {
    const photos = getPhotos(rowId);
    if (photos.length >= MAX_PHOTOS) return;

    if (!file.type.startsWith('image/')) {
        showToast('Файл не є зображенням', 'error');
        return;
    }
    if (file.size > 4 * 1024 * 1024) {
        showToast('Файл занадто великий. Максимум 4 MB', 'error');
        return;
    }

    const dropzone = document.getElementById(`${rowId}-photo-dropzone`);
    dropzone?.classList.add('loading');

    try {
        const brandId = document.getElementById('product-brand')?.value.trim() || '';
        const productId = document.getElementById('product-id')?.value.trim() || '';
        const photoIndex = photos.length + 1;

        if (!brandId) {
            showToast('Оберіть бренд перед завантаженням фото', 'warning');
            dropzone?.classList.remove('loading');
            return;
        }

        const result = await uploadProductPhotoFile(file, brandId, productId, photoIndex, {
            brandName: document.getElementById('product-brand')?.selectedOptions?.[0]?.textContent?.trim() || '',
            productName: rowId,
        });

        dropzone?.classList.remove('loading');

        if (result?.thumbnailUrl) {
            photos.push(result.thumbnailUrl);
            renderGrid(rowId);
            showToast('Фото завантажено', 'success');
        }
    } catch (error) {
        console.error('Помилка завантаження фото:', error);
        dropzone?.classList.remove('loading');
        showToast('Помилка завантаження фото', 'error');
    }
}

function removePhoto(rowId, index) {
    const photos = getPhotos(rowId);
    if (index < 0 || index >= photos.length) return;

    const removedUrl = photos[index];
    photos.splice(index, 1);
    renderGrid(rowId);

    showToast('Фото видалено', 'info', {
        duration: 5000,
        action: {
            label: 'Відмінити',
            onClick: () => {
                photos.splice(index, 0, removedUrl);
                renderGrid(rowId);
            },
        },
    });
}

function renderGrid(rowId) {
    const grid = document.getElementById(`${rowId}-photos-grid`);
    const dropzone = document.getElementById(`${rowId}-photo-dropzone`);
    if (!grid) return;

    const photos = getPhotos(rowId);

    if (dropzone) {
        dropzone.classList.toggle('u-hidden', photos.length >= MAX_PHOTOS);
    }

    if (photos.length === 0) {
        grid.innerHTML = '';
        return;
    }

    let html = '';
    photos.forEach((url, index) => {
        const ext = url.match(/\.(\w{3,4})(?:[?#]|$)/)?.[1]?.toUpperCase() || 'IMG';
        html += `
            <div class="content-bloc" data-photo-index="${index}">
                <div class="content-line">
                    <div class="content-line-photo">
                        <img src="${escapeHtml(url)}" alt="Фото ${index + 1}" show
                             onload="this.closest('.content-line').querySelector('.content-line-label').textContent = this.naturalWidth + '×' + this.naturalHeight">
                    </div>
                    <div class="content-line-info">
                        <span class="content-line-name" title="${escapeHtml(url)}">Фото ${index + 1}</span>
                        <span class="content-line-label"></span>
                    </div>
                    <span class="tag c-tertiary">${ext}</span>
                    <button type="button" class="btn-icon ci-remove" data-photo-remove="${index}" data-tooltip="Видалити">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
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
