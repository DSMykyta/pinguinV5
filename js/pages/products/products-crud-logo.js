// js/pages/products/products-crud-logo.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS CRUD — ЗОБРАЖЕННЯ                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Секція завантаження зображення товару.
 * Шаблон: brands-crud-logo.js
 */

import { showToast } from '../../components/feedback/toast.js';

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати обробники для зображення
 */
export function initLogoHandlers() {
    const uploadBtn = document.getElementById('btn-upload-product-from-url');
    const removeBtn = document.getElementById('btn-remove-product-logo');
    const fileInput = document.getElementById('product-logo-file-input');
    const dropzone = document.getElementById('product-logo-dropzone');

    if (uploadBtn) {
        uploadBtn.onclick = () => {
            const urlField = document.getElementById('product-logo-url-field');
            const url = urlField?.value.trim();
            if (url) {
                uploadFromUrl(url);
            } else {
                showToast('Введіть URL зображення', 'warning');
            }
        };
    }

    if (removeBtn) {
        removeBtn.onclick = handleRemoveLogo;
    }

    if (fileInput) {
        fileInput.onchange = (e) => {
            if (e.target.files?.[0]) {
                handleFileUpload(e.target.files[0]);
            }
        };
    }

    if (dropzone) {
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files?.[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
            }
        });
        dropzone.addEventListener('click', (e) => {
            if (e.target.closest('.btn-icon')) return;
            fileInput?.click();
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Завантажити зображення з URL
 */
async function uploadFromUrl(url) {
    try {
        const { uploadBrandLogoUrl } = await import('../../utils/api-client.js');
        const productName = document.getElementById('product-name-ua')?.value.trim() || 'product';
        const result = await uploadBrandLogoUrl(url, normalizeName(productName));

        if (result?.success && result.thumbnailUrl) {
            document.getElementById('product-image-url').value = result.thumbnailUrl;
            setLogoPreview(result.thumbnailUrl, `${normalizeName(productName)}.webp`);
            showToast('Зображення завантажено', 'success');
        }
    } catch (error) {
        console.error('❌ Помилка завантаження:', error);
        showToast('Помилка завантаження зображення', 'error');
    }
}

/**
 * Завантажити файл
 */
async function handleFileUpload(file) {
    try {
        const { uploadBrandLogoFile } = await import('../../utils/api-client.js');
        const productName = document.getElementById('product-name-ua')?.value.trim() || 'product';
        const result = await uploadBrandLogoFile(file, normalizeName(productName));

        if (result?.success && result.thumbnailUrl) {
            document.getElementById('product-image-url').value = result.thumbnailUrl;
            setLogoPreview(result.thumbnailUrl, file.name);
            showToast('Зображення завантажено', 'success');
        }
    } catch (error) {
        console.error('❌ Помилка завантаження:', error);
        showToast('Помилка завантаження зображення', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PREVIEW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати прев'ю зображення
 */
export function setLogoPreview(url, filename = '') {
    const preview = document.getElementById('product-logo-preview');
    const img = document.getElementById('product-logo-preview-img');
    const nameEl = document.getElementById('product-logo-filename');
    const sizeEl = document.getElementById('product-logo-filesize');
    const formatEl = document.getElementById('product-logo-format');

    if (!preview) return;

    if (img) img.src = url;
    if (nameEl) nameEl.textContent = filename || 'image';
    if (sizeEl) sizeEl.textContent = '';

    const ext = filename.split('.').pop()?.toUpperCase() || 'IMG';
    if (formatEl) formatEl.textContent = ext;

    preview.classList.remove('u-hidden');
}

/**
 * Видалити зображення
 */
export function handleRemoveLogo() {
    const imageUrlField = document.getElementById('product-image-url');
    if (imageUrlField) imageUrlField.value = '';

    const urlField = document.getElementById('product-logo-url-field');
    if (urlField) urlField.value = '';

    const preview = document.getElementById('product-logo-preview');
    if (preview) preview.classList.add('u-hidden');

    const img = document.getElementById('product-logo-preview-img');
    if (img) img.src = '';
}

/**
 * Нормалізувати назву для файлу
 */
export function normalizeName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
