// js/pages/products/products-crud-variant-photos-inline.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        PRODUCTS CRUD — ФОТО ВАРІАНТУ (INLINE / EXPANDABLE)              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Per-row photo management для expandable рядків таблиці варіантів.
 * Кожен рядок має свій окремий стан (Map<rowId, urls[]>).
 * Логіка ідентична модалу варіанту (drag, Sortable, назви файлів).
 */

import { uploadProductPhotoFile } from '../../utils/api-client.js';
import { escapeHtml, normalizeName } from '../../utils/text-utils.js';
import { showToast } from '../../components/feedback/toast.js';
import { registerProductsPlugin } from './products-plugins.js';
import { SORTABLE_CONFIG, fetchImageAsFile } from '../../utils/common-utils.js';

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

    // Upload URL → скачати і завантажити на Drive
    uploadBtn?.addEventListener('click', () => {
        const url = urlField?.value.trim();
        if (!url) return;
        if (getPhotos(rowId).length >= MAX_PHOTOS) {
            showToast(`Максимум ${MAX_PHOTOS} фото`, 'warning');
            return;
        }
        urlField.value = '';
        urlField.dispatchEvent(new Event('input', { bubbles: true }));
        handleUploadFromUrl(rowId, url);
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

    // Grid: remove
    if (grid) {
        grid.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('[data-photo-remove]');
            if (!removeBtn) return;
            const index = parseInt(removeBtn.dataset.photoRemove);
            if (!isNaN(index)) removePhoto(rowId, index);
        });

        // Sortable
        if (typeof Sortable !== 'undefined') {
            new Sortable(grid, {
                ...SORTABLE_CONFIG,
                onEnd: () => {
                    const photos = getPhotos(rowId);
                    const newOrder = [];
                    grid.querySelectorAll('[data-photo-index]').forEach(el => {
                        const idx = parseInt(el.dataset.photoIndex);
                        if (!isNaN(idx) && photos[idx]) newOrder.push(photos[idx]);
                    });
                    _rowPhotos.set(rowId, newOrder);
                    renderGrid(rowId);
                },
            });
        }
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

async function handleUploadFromUrl(rowId, url) {
    const dropzone = document.getElementById(`${rowId}-photo-dropzone`);
    dropzone?.classList.add('loading');
    try {
        const file = await fetchImageAsFile(url);
        dropzone?.classList.remove('loading');
        await handleUpload(rowId, file);
    } catch (error) {
        console.error('Помилка завантаження з URL:', error);
        dropzone?.classList.remove('loading');
        showToast('Не вдалося завантажити зображення з URL', 'error');
    }
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

        const brandName = document.getElementById('product-brand')?.selectedOptions?.[0]?.textContent?.trim() || '';
        if (!brandId && !brandName) {
            showToast('Оберіть бренд перед завантаженням фото', 'warning');
            dropzone?.classList.remove('loading');
            return;
        }

        const productName = buildPhotoName(rowId);
        if (!productId && !productName) {
            showToast('Введіть назву товару перед завантаженням фото', 'warning');
            dropzone?.classList.remove('loading');
            return;
        }

        const result = await uploadProductPhotoFile(file, brandId, productId, photoIndex, { brandName, productName });

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

    const photoBaseName = buildPhotoName(rowId);

    let html = '';
    photos.forEach((url, index) => {
        const urlExt = url.match(/\.(\w{3,4})(?:[?#]|$)/)?.[1] || 'jpg';
        const fileName = `${photoBaseName}_${index + 1}.${urlExt}`;
        const ext = urlExt.toUpperCase();
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
                    <button type="button" class="btn-icon ci-remove" data-photo-remove="${index}" data-tooltip="Видалити">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function buildPhotoName(rowId) {
    // Шукаємо variant_display з розкритого рядка
    const nameField = document.getElementById(`${rowId}-variant-display`)
        || document.querySelector(`[data-row-id="${rowId}"] [data-field="variant_display"]`);
    const variantName = nameField?.value?.trim() || nameField?.textContent?.trim() || '';
    const productId = document.getElementById('product-id')?.value.trim() || '';

    const name = [productId, variantName]
        .map(p => normalizeName(p))
        .filter(Boolean)
        .join('-');

    return name || 'variant';
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: рендер фото блоку в grid характеристик
// ═══════════════════════════════════════════════════════════════════════════

registerProductsPlugin('onCharsRender', (container) => {
    if (!container) return;
    // Тільки для expandable рядків, НЕ для модалу (де є окрема секція "Фото")
    if (container.id === 'variant-characteristics-container') return;
    const rowId = container.id?.replace('-chars-container', '');
    if (!rowId) return;
    // Не дублювати
    if (container.querySelector(`#${CSS.escape(rowId)}-photos-list`)) return;

    const photoField = document.createElement('div');
    photoField.className = 'group column col-3';
    photoField.id = `${rowId}-photos-list`;
    photoField.innerHTML = `
        <label class="label-l">Фото</label>
        <div class="content-bloc" id="${rowId}-photo-dropzone" data-dropzone>
            <div class="content-line">
                <div class="input-box">
                    <input type="url" id="${rowId}-photo-url-field" placeholder="URL або перетягніть файл...">
                </div>
                <button type="button" class="btn-icon ci-action" id="${rowId}-btn-pick-photo" data-dz-pick data-tooltip="Вибрати файл" data-tooltip-always>
                    <span class="material-symbols-outlined">folder_open</span>
                </button>
                <button type="button" class="btn-icon ci-action u-hidden" id="${rowId}-btn-upload-photo" data-dz-upload data-tooltip="Завантажити з URL" data-tooltip-always>
                    <span class="material-symbols-outlined">download</span>
                </button>
            </div>
            <input type="file" id="${rowId}-photo-file-input" accept="image/*" multiple hidden>
        </div>
        <div class="content-bloc-container photos" id="${rowId}-photos-grid"></div>
    `;

    const grid = container.querySelector('.grid');
    if (grid) {
        grid.appendChild(photoField);
    } else {
        container.appendChild(photoField);
    }
}, 20); // priority 20 — після ваги (10)

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
