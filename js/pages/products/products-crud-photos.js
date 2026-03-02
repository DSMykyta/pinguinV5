// js/pages/products/products-crud-photos.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS CRUD — ФОТО                                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Галерея фото товару (до 10 зображень).
 * Upload на Google Drive: товари/{brand}/{product}/{product}_{index}.webp
 *
 * Паттерн аналогічний brands-crud-logo.js:
 * - Upload zone: URL input + file picker + drag-and-drop
 * - Preview: content-bloc з img[show], filename, format tag, remove button
 */

import { uploadProductPhotoFile } from '../../utils/api-client.js';
import { escapeHtml } from '../../utils/text-utils.js';
import { showToast } from '../../components/feedback/toast.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

const MAX_PHOTOS = 10;
let _photoUrls = [];

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати секцію фото
 */
export function initPhotoSection() {
    const dropzone = document.getElementById('product-photo-dropzone');
    const fileInput = document.getElementById('product-photo-file-input');
    const urlField = document.getElementById('product-photo-url-field');
    const uploadBtn = document.getElementById('btn-upload-product-photo');
    const btnIcon = uploadBtn?.querySelector('.material-symbols-outlined');

    if (!dropzone || !fileInput) return;

    // Зміна іконки: є URL → download, пусто → upload
    function updateButtonIcon() {
        if (!btnIcon) return;
        const hasUrl = urlField?.value.trim().length > 0;
        btnIcon.textContent = hasUrl ? 'download' : 'upload';
        uploadBtn.dataset.tooltip = hasUrl ? 'Завантажити з URL' : 'Вибрати файл';
    }

    urlField?.addEventListener('input', updateButtonIcon);

    // Розумна кнопка: є URL → TODO (url upload), пусто → file picker
    uploadBtn?.addEventListener('click', () => {
        if (_photoUrls.length >= MAX_PHOTOS) {
            showToast(`Максимум ${MAX_PHOTOS} фото`, 'warning');
            return;
        }
        fileInput.click();
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

    // Drag-and-drop на dropzone
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

    // Делегований обробник видалення фото
    const grid = document.getElementById('product-photos-grid');
    if (grid) {
        grid.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('[data-photo-remove]');
            if (!removeBtn) return;

            const index = parseInt(removeBtn.dataset.photoRemove);
            if (!isNaN(index)) {
                removePhoto(index);
            }
        });
    }
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

    const dropzone = document.getElementById('product-photo-dropzone');
    dropzone?.classList.add('loading');

    try {
        const brandName = getBrandName();
        const productName = getProductName();
        const photoIndex = _photoUrls.length + 1;

        const result = await uploadProductPhotoFile(file, brandName, productName, photoIndex);

        dropzone?.classList.remove('loading');

        if (result && result.thumbnailUrl) {
            _photoUrls.push(result.thumbnailUrl);
            syncHiddenField();
            renderPhotoGrid();
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
    const empty = document.getElementById('product-photos-empty');
    const counter = document.getElementById('product-photos-counter');
    if (!grid) return;

    // Лічильник
    if (counter) {
        counter.textContent = _photoUrls.length > 0 ? `${_photoUrls.length} / ${MAX_PHOTOS}` : '';
    }

    if (_photoUrls.length === 0) {
        grid.innerHTML = '';
        if (empty) empty.classList.remove('u-hidden');
        return;
    }

    if (empty) empty.classList.add('u-hidden');

    let html = '';
    _photoUrls.forEach((url, index) => {
        const fileName = `photo_${index + 1}.webp`;
        const ext = extractExtension(fileName);
        html += `
            <div class="content-bloc">
                <div class="content-line">
                    <div class="content-line-photo">
                        <img src="${escapeHtml(url)}" alt="Фото ${index + 1}" show>
                    </div>
                    <div class="content-line-info">
                        <span class="content-line-name">${fileName}</span>
                        <span class="content-line-label">${index + 1} / ${_photoUrls.length}</span>
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

// ═══════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Встановити масив URL фото (при відкритті товару)
 */
export function setPhotoUrls(urls) {
    _photoUrls = Array.isArray(urls) ? [...urls] : [];
    renderPhotoGrid();
    syncHiddenField();
}

/**
 * Отримати масив URL фото
 */
export function getPhotoUrls() {
    return [..._photoUrls];
}

/**
 * Очистити фото
 */
export function clearPhotos() {
    _photoUrls = [];
    renderPhotoGrid();
    syncHiddenField();
}

function removePhoto(index) {
    if (index < 0 || index >= _photoUrls.length) return;

    const removedUrl = _photoUrls[index];
    _photoUrls.splice(index, 1);
    renderPhotoGrid();
    syncHiddenField();

    showToast('Фото видалено', 'info', {
        duration: 5000,
        action: {
            label: 'Відмінити',
            onClick: () => {
                _photoUrls.splice(index, 0, removedUrl);
                renderPhotoGrid();
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

function getBrandName() {
    const brandSelect = document.getElementById('product-brand');
    return brandSelect?.selectedOptions?.[0]?.textContent?.trim() || 'brand';
}

function getProductName() {
    return document.getElementById('product-name-ua')?.value.trim() || 'product';
}

function extractExtension(name) {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(dot + 1).toUpperCase() : '';
}

export function normalizeName(name) {
    return name.trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_\-а-яієїґ]/gi, '')
        .replace(/[а-яієїґ]+/gi, (match) => {
            const map = {
                'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e',
                'є': 'ye', 'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y',
                'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
                'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch',
                'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'yu', 'я': 'ya',
            };
            return match.split('').map(c => map[c.toLowerCase()] || c).join('');
        });
}
