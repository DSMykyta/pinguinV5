// js/pages/brands/brands-crud-logo.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS CRUD — ЛОГОТИП                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 Секція логотипу у модалі бренду.
 *    File upload, URL upload, drag-and-drop, preview.
 */

import { showConfirmModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { uploadBrandLogoFile, uploadBrandLogoUrl } from '../../utils/api-client.js';

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ініціалізувати обробники завантаження логотипу:
 * - Drop zone drag-and-drop
 * - Drop zone click → file input
 * - URL input + кнопка завантаження
 * - Кнопка видалення логотипу
 */
export function initLogoHandlers() {
    const dropzone = document.getElementById('brand-logo-dropzone');
    const fileInput = document.getElementById('brand-logo-file-input');
    const urlField = document.getElementById('brand-logo-url-field');
    const urlBtn = document.getElementById('btn-upload-from-url');
    const removeBtn = document.getElementById('btn-remove-brand-logo');
    const btnIcon = urlBtn?.querySelector('.material-symbols-outlined');

    if (!dropzone || !urlField) return;

    // Зміна іконки кнопки залежно від вмісту поля
    function updateButtonIcon() {
        if (!btnIcon) return;
        const hasUrl = urlField.value.trim().length > 0;
        btnIcon.textContent = hasUrl ? 'download' : 'upload';
        urlBtn.dataset.tooltip = hasUrl ? 'Завантажити з URL' : 'Вибрати файл';
    }

    urlField.addEventListener('input', updateButtonIcon);

    // Розумна кнопка: є URL → завантажити, пусто → file picker
    urlBtn?.addEventListener('click', () => {
        const url = urlField.value.trim();
        if (url) {
            uploadLogoWithConfirm(() => handleLogoUrlUpload(url));
        } else {
            uploadLogoWithConfirm(() => fileInput?.click());
        }
    });

    // Вибір файлу
    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleLogoFileUpload(file);
        }
        fileInput.value = '';
    });

    // Drag-and-drop на content-line
    const inputsLine = dropzone.querySelector('.content-line');
    if (inputsLine) {
        inputsLine.addEventListener('dragover', (e) => {
            e.preventDefault();
            inputsLine.classList.add('drag-over');
        });

        inputsLine.addEventListener('dragleave', () => {
            inputsLine.classList.remove('drag-over');
        });

        inputsLine.addEventListener('drop', (e) => {
            e.preventDefault();
            inputsLine.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) uploadLogoWithConfirm(() => handleLogoFileUpload(file));
        });
    }

    // Enter в URL полі
    urlField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            urlBtn?.click();
        }
    });

    // Видалення логотипу
    removeBtn?.addEventListener('click', handleRemoveLogo);
}

// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Отримати назву бренду з форми (для іменування файлу)
 */
function getCurrentBrandName() {
    return document.getElementById('brand-name-uk')?.value.trim() || 'brand';
}

/**
 * Завантажити логотип з файлу
 * @param {File} file
 */
async function handleLogoFileUpload(file) {
    const dropzone = document.getElementById('brand-logo-dropzone');
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
        const brandName = getCurrentBrandName();
        const result = await uploadBrandLogoFile(file, brandName);

        dropzone.classList.remove('loading');
        dropzone.classList.add('is-success');
        setTimeout(() => dropzone.classList.remove('is-success'), 2000);

        const fileName = `${normalizeName(getCurrentBrandName())}.webp`;
        setLogoPreview(result.thumbnailUrl, fileName, formatFileSize(file.size));
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
    const dropzone = document.getElementById('brand-logo-dropzone');
    if (!dropzone) return;

    dropzone.classList.add('loading');

    try {
        const brandName = getCurrentBrandName();
        const result = await uploadBrandLogoUrl(url, brandName);

        dropzone.classList.remove('loading');
        dropzone.classList.add('is-success');
        setTimeout(() => dropzone.classList.remove('is-success'), 2000);

        const fileName = `${normalizeName(brandName)}.webp`;
        setLogoPreview(result.thumbnailUrl, fileName);

        const urlField = document.getElementById('brand-logo-url-field');
        if (urlField) urlField.value = '';

        showToast('Логотип завантажено з URL', 'success');
    } catch (error) {
        console.error('❌ Помилка завантаження з URL:', error);
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
    return !!document.getElementById('brand-logo-url')?.value.trim();
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
export function setLogoPreview(thumbnailUrl, fileName, fileSize) {
    const hiddenInput = document.getElementById('brand-logo-url');
    const preview = document.getElementById('brand-logo-preview');
    const previewImg = document.getElementById('brand-logo-preview-img');
    const nameEl = document.getElementById('brand-logo-filename');
    const sizeEl = document.getElementById('brand-logo-filesize');
    const formatEl = document.getElementById('brand-logo-format');

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
export function handleRemoveLogo() {
    const hiddenInput = document.getElementById('brand-logo-url');
    const preview = document.getElementById('brand-logo-preview');

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

// ═══════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Нормалізувати назву для імені файлу
 */
export function normalizeName(name) {
    return name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\-]/g, '');
}

/**
 * Форматувати розмір файлу
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Витягти ім'я файлу з URL
 */
function extractFileName(url) {
    try {
        const pathname = new URL(url).pathname;
        return pathname.split('/').pop() || 'logo.webp';
    } catch {
        return 'logo.webp';
    }
}

/**
 * Витягти розширення з імені файлу
 */
function extractExtension(name) {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(dot + 1).toUpperCase() : '';
}
