// js/pages/products/products-crud-photos.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS CRUD — ФОТО                                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Галерея фото товару (до 10 зображень).
 * Upload на Google Drive: товари/{brand}/{product}/{product}_{index}.webp
 *
 * Layout: col-8 (головне фото) + col-4 (upload zone + фото-картки)
 * Drag-and-drop для зміни порядку (перше фото = головне)
 */

import { uploadProductPhotoFile } from '../../utils/utils-api-client.js';
import { escapeHtml, normalizeName } from '../../utils/utils-text.js';
import { showToast } from '../../components/feedback/toast.js';
import { SORTABLE_CONFIG } from '../../utils/utils-sortable-config.js';
import { fetchImageAsFile, extractExtension } from '../../utils/utils-file.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

const MAX_PHOTOS = 10;
let _photoUrls = [];

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

export function initPhotoSection() {
    const dropzone = document.getElementById('product-photo-dropzone');
    const fileInput = document.getElementById('product-photo-file-input');
    const urlField = document.getElementById('product-photo-url-field');
    const uploadBtn = document.getElementById('btn-upload-product-photo');
    const pickBtn = document.getElementById('btn-pick-product-photo');

    if (!dropzone || !fileInput) return;
    if (dropzone.dataset.photoInit) return;
    dropzone.dataset.photoInit = 'true';

    // [data-dz-pick] → відкрити файл-діалог (з гардом на MAX_PHOTOS)
    pickBtn?.addEventListener('click', () => {
        if (_photoUrls.length >= MAX_PHOTOS) {
            showToast(`Максимум ${MAX_PHOTOS} фото`, 'warning');
            return;
        }
        fileInput.click();
    });

    // [data-dz-upload] → скачати фото з URL і завантажити на Drive
    uploadBtn?.addEventListener('click', () => {
        const url = urlField?.value.trim();
        if (!url) return;
        if (_photoUrls.length >= MAX_PHOTOS) {
            showToast(`Максимум ${MAX_PHOTOS} фото`, 'warning');
            return;
        }
        urlField.value = '';
        urlField.dispatchEvent(new Event('input', { bubbles: true }));
        handleUploadFromUrl(url);
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

    // Drop файлів (charm обробляє візуал, тут — бізнес-логіка)
    dropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;

        const remaining = MAX_PHOTOS - _photoUrls.length;
        const toUpload = files.slice(0, remaining);

        for (const file of toUpload) {
            await handleUploadPhoto(file);
        }
    });

    // Делегований обробник: видалення + drag
    const grid = document.getElementById('product-photos-grid');
    if (grid) {
        grid.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('[data-photo-remove]');
            if (!removeBtn) return;

            const index = parseInt(removeBtn.dataset.photoRemove);
            if (!isNaN(index)) removePhoto(index);
        });

        // Sortable.js для drag reorder
        if (typeof Sortable !== 'undefined') {
            new Sortable(grid, {
                ...SORTABLE_CONFIG,
                onEnd: () => {
                    // Синхронізуємо масив з DOM-порядком
                    const newOrder = [];
                    grid.querySelectorAll('[data-photo-index]').forEach((el, i) => {
                        newOrder.push(_photoUrls[parseInt(el.dataset.photoIndex)]);
                    });
                    _photoUrls.length = 0;
                    _photoUrls.push(...newOrder);
                    syncHiddenField();
                    renderPhotoGrid();
                    updateMainPreview();
                }
            });
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD
// ═══════════════════════════════════════════════════════════════════════════

async function handleUploadFromUrl(url) {
    const dropzone = document.getElementById('product-photo-dropzone');
    dropzone?.classList.add('loading');
    try {
        const file = await fetchImageAsFile(url);
        dropzone?.classList.remove('loading');
        await handleUploadPhoto(file);
    } catch (error) {
        console.error('Помилка завантаження з URL:', error);
        dropzone?.classList.remove('loading');
        showToast('Не вдалося завантажити зображення з URL', 'error');
    }
}

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

    const dropzone = document.getElementById('product-photo-dropzone');
    dropzone?.classList.add('loading');

    try {
        const brandId = getSelectValue('product-brand');
        const productId = getInputValue('product-id');
        const photoIndex = _photoUrls.length + 1;

        const brandName = getSelectText('product-brand');
        if (!brandId && !brandName) {
            showToast('Оберіть бренд перед завантаженням фото', 'warning');
            dropzone?.classList.remove('loading');
            return;
        }

        const productName = buildPhotoName();
        if (!productId && !productName) {
            showToast('Введіть назву товару перед завантаженням фото', 'warning');
            dropzone?.classList.remove('loading');
            return;
        }

        const result = await uploadProductPhotoFile(file, brandId, productId, photoIndex, { brandName, productName });

        dropzone?.classList.remove('loading');

        if (result && result.thumbnailUrl) {
            _photoUrls.push(result.thumbnailUrl);
            syncHiddenField();
            renderPhotoGrid();
            updateMainPreview();
            showToast('Фото завантажено', 'success');
        }
    } catch (error) {
        console.error('❌ Помилка завантаження фото:', error);
        dropzone?.classList.remove('loading');
        showToast('Помилка завантаження фото', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════════════

function renderPhotoGrid() {
    const grid = document.getElementById('product-photos-grid');
    const counter = document.getElementById('product-photos-counter');
    const dropzone = document.getElementById('product-photo-dropzone');
    if (!grid) return;

    if (counter) {
        counter.textContent = _photoUrls.length > 0 ? `${_photoUrls.length} / ${MAX_PHOTOS}` : '';
    }

    // Ховаємо dropzone якщо досягнуто ліміт
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
        const urlExt = url.match(/\.(\w{3,4})(?:[?#]|$)/)?.[1] || 'jpg';
        const fileName = `${photoBaseName}_${index + 1}.${urlExt}`;
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
    const mainImg = document.getElementById('product-photo-main-img');
    const mainEmpty = document.getElementById('product-photo-main-empty');
    if (!mainImg) return;

    if (_photoUrls.length > 0) {
        mainImg.src = _photoUrls[0];
        mainImg.classList.remove('u-hidden');
        if (mainEmpty) mainEmpty.classList.add('u-hidden');
    } else {
        mainImg.src = '';
        mainImg.classList.add('u-hidden');
        if (mainEmpty) mainEmpty.classList.remove('u-hidden');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════

export function setPhotoUrls(urls) {
    _photoUrls = Array.isArray(urls) ? [...urls] : [];
    renderPhotoGrid();
    updateMainPreview();
    syncHiddenField();
}

export function getPhotoUrls() {
    return [..._photoUrls];
}

export function clearPhotos() {
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
    const hidden = document.getElementById('product-image-url');
    if (hidden) {
        hidden.value = _photoUrls.length > 0 ? JSON.stringify(_photoUrls) : '';
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getSelectText(id) {
    const sel = document.getElementById(id);
    if (!sel) return '';
    const opt = sel.selectedOptions?.[0];
    return (opt && opt.value) ? opt.textContent.trim() : '';
}

function getSelectValue(id) {
    return document.getElementById(id)?.value.trim() || '';
}

function getInputValue(id) {
    return document.getElementById(id)?.value.trim() || '';
}

/**
 * Побудувати базову назву фото з полів модалу:
 * {Бренд}-{Лінійка}-{Назва}-{Ознака}-{Деталь}-{Варіація}
 * Порожні частини пропускаються.
 */
function buildPhotoName() {
    const parts = [
        getSelectText('product-brand'),
        getSelectText('product-line'),
        getInputValue('product-name-ua'),
        getInputValue('product-label-ua'),
        getInputValue('product-detail-ua'),
        getInputValue('product-variation-ua'),
    ];

    const name = parts
        .map(p => normalizeName(p))
        .filter(Boolean)
        .join('-');

    return name || 'product';
}


