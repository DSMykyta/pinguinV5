// js/pages/brands/lines-crud.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRAND LINES - CRUD OPERATIONS                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 ПЛАГІН — можна видалити, система працюватиме без модалів редагування.
 *
 * Модальні вікна для додавання, редагування та видалення лінійок брендів.
 */

import { registerBrandsPlugin, runHook } from './brands-plugins.js';
import { brandsState } from './brands-state.js';
import { getBrands, getBrandById } from './brands-data.js';
import { getBrandLineById, addBrandLine, updateBrandLine, deleteBrandLine } from './lines-data.js';
import { showModal, closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { showConfirmModal } from '../../components/modal/modal-main.js';
import { initCustomSelects } from '../../components/forms/select.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

let currentLineId = null; // ID лінійки, що редагується (null = нова)

// ═══════════════════════════════════════════════════════════════════════════
// SHOW MODALS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Показати модальне вікно для додавання лінійки
 * @param {string} [preselectedBrandId] - Попередньо обраний бренд (опціонально)
 */
export async function showAddLineModal(preselectedBrandId = null) {

    currentLineId = null;

    await showModal('line-edit', null);

    // Заголовок
    const title = document.getElementById('line-modal-title');
    if (title) title.textContent = 'Нова лінійка';

    // Приховати кнопку видалення
    const deleteBtn = document.getElementById('delete-line');
    if (deleteBtn) deleteBtn.classList.add('u-hidden');

    // Очистити форму
    clearLineForm();

    // Заповнити select брендів
    populateBrandSelect(preselectedBrandId);

    // Ініціалізувати custom select
    const modalEl = document.querySelector('[data-modal-id="line-edit"]') || document.querySelector('.modal-overlay');
    if (modalEl) {
        initCustomSelects(modalEl);
    }

    // Обробник збереження
    const saveBtn = document.getElementById('save-line');
    if (saveBtn) {
        saveBtn.onclick = handleSaveLine;
    }
}

/**
 * Показати модальне вікно для редагування лінійки
 * @param {string} lineId - ID лінійки
 */
export async function showEditLineModal(lineId) {

    const line = getBrandLineById(lineId);
    if (!line) {
        showToast('Лінійку не знайдено', 'error');
        return;
    }

    currentLineId = lineId;

    await showModal('line-edit', null);

    // Заголовок
    const title = document.getElementById('line-modal-title');
    if (title) title.textContent = `Редагувати: ${line.name_uk}`;

    // Показати кнопку видалення
    const deleteBtn = document.getElementById('delete-line');
    if (deleteBtn) {
        deleteBtn.classList.remove('u-hidden');
        deleteBtn.onclick = () => {
            closeModal();
            showDeleteLineConfirm(lineId);
        };
    }

    // Заповнити select брендів
    populateBrandSelect(line.brand_id);

    // Ініціалізувати custom select
    const modalEl = document.querySelector('[data-modal-id="line-edit"]') || document.querySelector('.modal-overlay');
    if (modalEl) {
        initCustomSelects(modalEl);
    }

    // Заповнити форму даними
    fillLineForm(line);

    // Обробник збереження
    const saveBtn = document.getElementById('save-line');
    if (saveBtn) {
        saveBtn.onclick = handleSaveLine;
    }
}

/**
 * Показати підтвердження видалення лінійки
 * @param {string} lineId - ID лінійки
 */
export async function showDeleteLineConfirm(lineId) {

    const line = getBrandLineById(lineId);
    if (!line) {
        showToast('Лінійку не знайдено', 'error');
        return;
    }

    const confirmed = await showConfirmModal({
        title: 'Видалити лінійку?',
        message: `Ви впевнені, що хочете видалити лінійку "${line.name_uk}"?`,
        confirmText: 'Видалити',
        cancelText: 'Скасувати',
        confirmClass: 'danger'
    });

    if (confirmed) {
        await handleDeleteLine(lineId);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM DATA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Заповнити select брендами
 * @param {string} [selectedBrandId] - ID обраного бренду
 */
function populateBrandSelect(selectedBrandId = null) {
    const select = document.getElementById('line-brand-id');
    if (!select) return;

    const brands = getBrands();

    // Очистити options окрім першого
    select.innerHTML = '<option value="">-- Оберіть бренд --</option>';

    // Додати бренди (тільки активні)
    brands
        .filter(b => b.brand_status !== 'inactive')
        .sort((a, b) => (a.name_uk || '').localeCompare(b.name_uk || ''))
        .forEach(brand => {
            const option = document.createElement('option');
            option.value = brand.brand_id;
            option.textContent = brand.name_uk;
            if (selectedBrandId && brand.brand_id === selectedBrandId) {
                option.selected = true;
            }
            select.appendChild(option);
        });
}

/**
 * Отримати дані з форми
 * @returns {Object} Дані лінійки
 */
function getLineFormData() {
    return {
        brand_id: document.getElementById('line-brand-id')?.value || '',
        name_uk: document.getElementById('line-name-uk')?.value.trim() || '',
        line_logo_url: document.getElementById('line-logo-url')?.value.trim() || ''
    };
}

/**
 * Заповнити форму даними лінійки
 * @param {Object} line - Лінійка
 */
function fillLineForm(line) {
    // ID (прихований)
    const idField = document.getElementById('line-id');
    if (idField) idField.value = line.line_id || '';

    // Бренд - вже встановлено в populateBrandSelect

    // Назва
    const nameField = document.getElementById('line-name-uk');
    if (nameField) nameField.value = line.name_uk || '';

    // Logo URL
    const logoField = document.getElementById('line-logo-url');
    if (logoField) logoField.value = line.line_logo_url || '';
}

/**
 * Очистити форму
 */
function clearLineForm() {
    const idField = document.getElementById('line-id');
    if (idField) idField.value = '';

    const brandField = document.getElementById('line-brand-id');
    if (brandField) brandField.value = '';

    const nameField = document.getElementById('line-name-uk');
    if (nameField) nameField.value = '';

    const logoField = document.getElementById('line-logo-url');
    if (logoField) logoField.value = '';
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Обробник збереження лінійки
 */
async function handleSaveLine() {

    const lineData = getLineFormData();

    // Валідація
    if (!lineData.brand_id) {
        showToast('Оберіть бренд', 'error');
        return;
    }

    if (!lineData.name_uk) {
        showToast('Введіть назву лінійки', 'error');
        return;
    }

    try {
        if (currentLineId) {
            // Оновлення
            await updateBrandLine(currentLineId, lineData);
            showToast('Лінійку успішно оновлено', 'success');
            runHook('onLineUpdate', currentLineId, lineData);
        } else {
            // Створення
            const newLine = await addBrandLine(lineData);
            showToast('Лінійку успішно додано', 'success');
            runHook('onLineAdd', newLine);
        }

        closeModal();
        runHook('onRender');
    } catch (error) {
        console.error('❌ Помилка збереження лінійки:', error);
        showToast('Помилка збереження лінійки', 'error');
    }
}

/**
 * Обробник видалення лінійки
 * @param {string} lineId - ID лінійки
 */
async function handleDeleteLine(lineId) {

    try {
        await deleteBrandLine(lineId);
        showToast('Лінійку успішно видалено', 'success');
        runHook('onLineDelete', lineId);
        runHook('onRender');
    } catch (error) {
        console.error('❌ Помилка видалення лінійки:', error);
        showToast('Помилка видалення лінійки', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

export function init(state) { }

