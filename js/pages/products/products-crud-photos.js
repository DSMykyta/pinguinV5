// js/pages/products/products-crud-photos.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS CRUD — ФОТО                                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Галерея фото товару (до 10 зображень).
 * Upload на Google Drive: товари/{brand}/{product}/{product}_{index}.webp
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
    const addBtn = document.getElementById('btn-add-product-photo');
    const fileInput = document.getElementById('product-photo-file-input');

    if (addBtn && fileInput) {
        addBtn.onclick = () => {
            if (_photoUrls.length >= MAX_PHOTOS) {
                showToast(`Максимум ${MAX_PHOTOS} фото`, 'warning');
                return;
            }
            fileInput.click();
        };

        fileInput.onchange = async () => {
            const files = Array.from(fileInput.files || []);
            if (files.length === 0) return;

            const remaining = MAX_PHOTOS - _photoUrls.length;
            const toUpload = files.slice(0, remaining);

            for (const file of toUpload) {
                await handleUploadPhoto(file);
            }

            fileInput.value = '';
        };
    }

    // Drag-and-drop на всю секцію фото
    const grid = document.getElementById('product-photos-grid');
    if (grid) {
        grid.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        grid.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
            if (files.length === 0) return;

            const remaining = MAX_PHOTOS - _photoUrls.length;
            const toUpload = files.slice(0, remaining);

            for (const file of toUpload) {
                await handleUploadPhoto(file);
            }
        });

        // Делегований обробник видалення
        grid.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('[data-photo-remove]');
            if (!removeBtn) return;

            const index = parseInt(removeBtn.dataset.photoRemove);
            if (!isNaN(index)) {
                removePhoto(index);
            }
        });

        // Прив'язати getter до DOM
        grid._getPhotoUrls = () => [..._photoUrls];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD
// ═══════════════════════════════════════════════════════════════════════════

async function handleUploadPhoto(file) {
    if (_photoUrls.length >= MAX_PHOTOS) return;

    const brandName = getBrandName();
    const productName = getProductName();
    const photoIndex = _photoUrls.length + 1;

    try {
        const result = await uploadProductPhotoFile(file, brandName, productName, photoIndex);

        if (result && result.thumbnailUrl) {
            _photoUrls.push(result.thumbnailUrl);
            syncHiddenField();
            renderPhotoGrid();
        }
    } catch (error) {
        console.error('❌ Помилка завантаження фото:', error);
        showToast('Помилка завантаження фото', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════════════

function renderPhotoGrid() {
    const grid = document.getElementById('product-photos-grid');
    const empty = document.getElementById('product-photos-empty');
    if (!grid) return;

    if (_photoUrls.length === 0) {
        grid.innerHTML = '';
        if (empty) {
            empty.innerHTML = `<div class="empty-state"><span class="avatar-state-message">Перетягніть зображення або натисніть +</span></div>`;
            empty.classList.remove('u-hidden');
        }
        return;
    }

    if (empty) empty.classList.add('u-hidden');

    let html = '';
    _photoUrls.forEach((url, index) => {
        const fileName = `photo_${index + 1}.webp`;
        html += `
            <div class="group column col-4">
                <div class="content-bloc">
                    <div class="content-line">
                        <div class="content-line-photo">
                            <img src="${escapeHtml(url)}" alt="Фото ${index + 1}" show>
                        </div>
                        <div class="content-line-info">
                            <span class="content-line-name">${fileName}</span>
                            <span class="content-line-label">${index + 1} / ${_photoUrls.length}</span>
                        </div>
                        <button type="button" class="btn-icon ci-remove" data-photo-remove="${index}"
                            data-tooltip="Видалити">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
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
    _photoUrls.splice(index, 1);
    renderPhotoGrid();
    syncHiddenField();
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

export function normalizeName(name) {
    return name.trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_\-а-яієїґ]/gi, '')
        .replace(/[а-яієїґ]+/gi, (match) => {
            // Транслітерація для імен файлів
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
