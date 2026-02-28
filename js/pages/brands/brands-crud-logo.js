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

        setLogoPreview(result.thumbnailUrl);
        showToast('Логотип завантажено', 'success');
    } catch (error) {
        console.error('❌ Помилка завантаження логотипу:', error);
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

        setLogoPreview(result.thumbnailUrl);

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
            title: 'Замінити логотип?',
            message: 'Поточний логотип буде замінено новим.',
            confirmText: 'Замінити',
            cancelText: 'Скасувати',
        });
        if (!confirmed) return;
    }
    await uploadFn();
}

/**
 * Показати preview логотипу
 * @param {string} thumbnailUrl - Публічний URL зображення
 */
export function setLogoPreview(thumbnailUrl) {
    const preview = document.getElementById('brand-logo-preview');
    const previewImg = document.getElementById('brand-logo-preview-img');
    const hiddenInput = document.getElementById('brand-logo-url');

    if (hiddenInput) hiddenInput.value = thumbnailUrl;
    if (previewImg) previewImg.src = thumbnailUrl;
    if (preview) preview.classList.remove('u-hidden');
}

/**
 * Видалити логотип (очистити preview)
 */
export function handleRemoveLogo() {
    const hiddenInput = document.getElementById('brand-logo-url');
    if (hiddenInput) hiddenInput.value = '';

    const preview = document.getElementById('brand-logo-preview');
    if (preview) preview.classList.add('u-hidden');
}
