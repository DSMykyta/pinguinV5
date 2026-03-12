// js/pages/brands/lines-crud-logo.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    LINES CRUD — ЛОГОТИП                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Секція логотипу у модалі лінійки.
 * File upload, URL upload, drag-and-drop, preview.
 * Ідентичний до brands-crud-logo.js за принципом.
 */

import { showConfirmModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { uploadBrandLogoFile, uploadBrandLogoUrl } from '../../utils/utils-api-client.js';
import { normalizeName } from '../../utils/utils-text.js';
import { formatFileSize, extractFileName, extractExtension } from '../../utils/utils-file.js';

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати обробники завантаження логотипу лінійки
 */
export function initLineLogoHandlers() {
    const dropzone = document.getElementById('line-logo-dropzone');
    const fileInput = document.getElementById('line-logo-file-input');
    const urlField = document.getElementById('line-logo-url-field');
    const uploadBtn = document.getElementById('btn-upload-line-logo');
    const pickBtn = document.getElementById('btn-pick-line-logo');
    const removeBtn = document.getElementById('btn-remove-line-logo');

    if (!dropzone || !urlField) return;

    // [data-dz-pick] → file picker з підтвердженням заміни
    pickBtn?.addEventListener('click', () => {
        uploadLogoWithConfirm(() => fileInput?.click());
    });

    // [data-dz-upload] → завантажити з URL (charm тригерить через Enter / клік)
    uploadBtn?.addEventListener('click', () => {
        const url = urlField.value.trim();
        if (!url) return;
        uploadLogoWithConfirm(() => handleLogoUrlUpload(url));
    });

    // Вибір файлу
    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleLogoFileUpload(file);
        }
        fileInput.value = '';
    });

    // Drop файлів (charm обробляє візуал, тут — бізнес-логіка)
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) uploadLogoWithConfirm(() => handleLogoFileUpload(file));
    });

    // Видалення логотипу
    removeBtn?.addEventListener('click', handleRemoveLineLogo);
}

// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати назву для файлу логотипу: [бренд]-[лінійка]
 */
function getLogoFileName() {
    const brandSelect = document.getElementById('line-brand-id');
    const brandName = brandSelect?.selectedOptions[0]?.textContent.trim() || 'brand';
    const lineName = document.getElementById('line-name-uk')?.value.trim() || 'line';
    return `${brandName}-${lineName}`;
}

/**
 * Завантажити логотип з файлу
 * @param {File} file
 */
async function handleLogoFileUpload(file) {
    const dropzone = document.getElementById('line-logo-dropzone');
    if (!dropzone) return;

    if (!file.type.startsWith('image/')) {
        showToast('Файл не є зображенням', 'error');
        return;
    }

    if (file.size > 4 * 1024 * 1024) {
        showToast('Файл занадто великий. Максимум 4 MB', 'error');
        return;
    }

    dropzone.classList.add('loading');

    try {
        const fileName = getLogoFileName();
        const result = await uploadBrandLogoFile(file, fileName);

        dropzone.classList.remove('loading');
        dropzone.classList.add('is-success');
        setTimeout(() => dropzone.classList.remove('is-success'), 2000);

        const displayName = `${normalizeName(getLogoFileName())}.webp`;
        setLineLogoPreview(result.thumbnailUrl, displayName, formatFileSize(file.size));
        showToast('Логотип завантажено', 'success');
    } catch (error) {
        console.error('Помилка завантаження логотипу:', error);
        dropzone.classList.remove('loading');
        dropzone.classList.add('is-error');
        setTimeout(() => dropzone.classList.remove('is-error'), 2000);
        showToast('Помилка завантаження логотипу', 'error');
    }
}

/**
 * Завантажити логотип з URL
 * @param {string} url
 */
async function handleLogoUrlUpload(url) {
    const dropzone = document.getElementById('line-logo-dropzone');
    if (!dropzone) return;

    dropzone.classList.add('loading');

    try {
        const logoName = getLogoFileName();
        const result = await uploadBrandLogoUrl(url, logoName);

        dropzone.classList.remove('loading');
        dropzone.classList.add('is-success');
        setTimeout(() => dropzone.classList.remove('is-success'), 2000);

        const displayName = `${normalizeName(logoName)}.webp`;
        setLineLogoPreview(result.thumbnailUrl, displayName);

        const urlField = document.getElementById('line-logo-url-field');
        if (urlField) urlField.value = '';

        showToast('Логотип завантажено з URL', 'success');
    } catch (error) {
        console.error('Помилка завантаження з URL:', error);
        dropzone.classList.remove('loading');
        dropzone.classList.add('is-error');
        setTimeout(() => dropzone.classList.remove('is-error'), 2000);
        showToast('Помилка завантаження з URL', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIRM / PREVIEW / REMOVE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Перевірити чи є вже логотип
 */
function hasExistingLogo() {
    return !!document.getElementById('line-logo-url')?.value.trim();
}

/**
 * Завантажити логотип з підтвердженням заміни
 * @param {Function} uploadFn - Функція завантаження
 */
async function uploadLogoWithConfirm(uploadFn) {
    if (hasExistingLogo()) {
        const confirmed = await showConfirmModal({
            action: 'замінити',
            entity: 'логотип',
        });
        if (!confirmed) return;
    }
    await uploadFn();
}

/**
 * Показати inline preview логотипу
 * @param {string} thumbnailUrl - Публічний URL зображення
 * @param {string} [fileName] - Ім'я файлу
 * @param {string} [fileSize] - Розмір файлу (форматований)
 */
export function setLineLogoPreview(thumbnailUrl, fileName, fileSize) {
    const hiddenInput = document.getElementById('line-logo-url');
    const preview = document.getElementById('line-logo-preview');
    const previewImg = document.getElementById('line-logo-preview-img');
    const nameEl = document.getElementById('line-logo-filename');
    const sizeEl = document.getElementById('line-logo-filesize');
    const formatEl = document.getElementById('line-logo-format');

    const name = fileName || extractFileName(thumbnailUrl);

    if (hiddenInput) hiddenInput.value = thumbnailUrl;
    if (previewImg) previewImg.src = thumbnailUrl;
    if (nameEl) nameEl.textContent = name;
    if (sizeEl) sizeEl.textContent = fileSize || '';
    if (formatEl) formatEl.textContent = extractExtension(name);
    if (preview) preview.classList.remove('u-hidden');
}

/**
 * Видалити логотип з можливістю відмінити через toast
 */
export function handleRemoveLineLogo() {
    const hiddenInput = document.getElementById('line-logo-url');
    const preview = document.getElementById('line-logo-preview');

    const savedUrl = hiddenInput?.value || '';
    if (!savedUrl) return;

    if (hiddenInput) hiddenInput.value = '';
    if (preview) preview.classList.add('u-hidden');

    showToast('Логотип видалено', 'info', {
        duration: 5000,
        action: {
            label: 'Відмінити',
            onClick: () => {
                if (hiddenInput) hiddenInput.value = savedUrl;
                if (preview) preview.classList.remove('u-hidden');
            },
        },
    });
}

